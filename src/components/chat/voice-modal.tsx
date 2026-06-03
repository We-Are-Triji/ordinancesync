"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Check, Loader2, Mic, RotateCcw, X } from "lucide-react"
import { useFocusTrap } from "@/lib/use-focus-trap"

const LANGUAGES: { code: SttLang; label: string }[] = [
  { code: "ceb-PH", label: "Bisaya" },
  { code: "en-US", label: "English" },
  { code: "fil-PH", label: "Filipino" },
]
type SttLang = "ceb-PH" | "en-US" | "fil-PH"

type Phase =
  | "requesting" // asking for mic permission
  | "listening" // recording
  | "transcribing" // uploading + STT
  | "review" // show transcript, let user confirm/redo/edit
  | "error"

interface VoiceModalProps {
  onClose: () => void
  onTranscript: (text: string) => void
}

const MAX_RECORDING_MS = 15_000
const SILENCE_MS = 2_500
const MIN_RECORDING_MS = 600
const SILENCE_THRESHOLD = 0.045

export default function VoiceModal({ onClose, onTranscript }: VoiceModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, { onClose })

  const [phase, setPhase] = useState<Phase>("requesting")
  const [error, setError] = useState<string | null>(null)
  const [heardSpeech, setHeardSpeech] = useState(false)
  const [language, setLanguage] = useState<SttLang>("ceb-PH")
  const [transcript, setTranscript] = useState("")

  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)

  const startedAtRef = useRef<number>(0)
  const lastSoundAtRef = useRef<number>(0)
  const heardSpeechRef = useRef<boolean>(false)
  const stoppingRef = useRef<boolean>(false)
  const abortedRef = useRef<boolean>(false) // true = cancel, don't transcribe
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const languageRef = useRef<SttLang>("ceb-PH")

  // Keep a ref of the chosen language so async handlers read the latest value.
  useEffect(() => {
    languageRef.current = language
  }, [language])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Gracefully stop recording → triggers onstop → upload.
  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    cancelAnimationFrame(rafRef.current)
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    const rec = recorderRef.current
    try {
      if (rec && rec.state !== "inactive") rec.stop()
    } catch {
      /* ignore */
    }
  }, [])

  // Cancel entirely: abort, no transcription, close modal.
  const handleCancel = useCallback(() => {
    abortedRef.current = true
    stoppingRef.current = true
    try {
      const rec = recorderRef.current
      if (rec && rec.state !== "inactive") rec.stop()
    } catch {
      /* ignore */
    }
    cleanup()
    onClose()
  }, [cleanup, onClose])

  const draw = useCallback(() => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const buffer = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buffer)

    let sumSquares = 0
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128
      sumSquares += v * v
    }
    const rms = Math.sqrt(sumSquares / buffer.length)

    const now = Date.now()
    if (rms > SILENCE_THRESHOLD) {
      lastSoundAtRef.current = now
      if (!heardSpeechRef.current) {
        heardSpeechRef.current = true
        setHeardSpeech(true)
      }
    }

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    const bars = 48
    const gap = 3
    const barWidth = (width - gap * (bars - 1)) / bars
    const mid = height / 2
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * buffer.length)
      const v = Math.abs((buffer[idx] - 128) / 128)
      const amp = Math.max(0.04, v) * (0.6 + rms * 3)
      const barHeight = Math.min(height, amp * height)
      const x = i * (barWidth + gap)
      ctx.fillStyle = heardSpeechRef.current ? "#1697cf" : "#94a3b8"
      const y = mid - barHeight / 2
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
      ctx.fill()
    }

    if (
      heardSpeechRef.current &&
      now - lastSoundAtRef.current > SILENCE_MS &&
      now - startedAtRef.current > MIN_RECORDING_MS
    ) {
      stopRecording()
      return
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [stopRecording])

  const uploadForTranscription = useCallback(async (blob: Blob) => {
    setPhase("transcribing")
    try {
      const base64 = await blobToBase64(blob)
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, language: languageRef.current }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Transcription failed.")
      cleanup()
      setTranscript(data.transcript ?? "")
      setPhase("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed.")
      setPhase("error")
      cleanup()
    }
  }, [cleanup])

  // Begin a recording session. Reusable for "record again".
  const startSession = useCallback(async () => {
    setError(null)
    setTranscript("")
    setHeardSpeech(false)
    heardSpeechRef.current = false
    stoppingRef.current = false
    abortedRef.current = false
    setPhase("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Client-side noise filtering at the source (better than server-side).
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      const audioCtx = new AudioCtx()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        if (abortedRef.current) return // cancelled — discard
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        if (heardSpeechRef.current && blob.size > 0) {
          uploadForTranscription(blob)
        } else {
          // Pure silence/noise — never send to STT (prevents hallucinated text).
          setError(
            "We didn't catch any speech. Make sure your mic is on and try again."
          )
          setPhase("error")
          cleanup()
        }
      }

      startedAtRef.current = Date.now()
      lastSoundAtRef.current = Date.now()
      recorder.start()
      setPhase("listening")
      rafRef.current = requestAnimationFrame(draw)
      maxTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS)
    } catch (err) {
      const name = err instanceof Error ? err.name : ""
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was denied. Enable it in your browser settings to use voice."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "Couldn't access the microphone. Please try again."
      )
      setPhase("error")
    }
  }, [cleanup, draw, stopRecording, uploadForTranscription])

  useEffect(() => {
    startSession()
    return () => {
      abortedRef.current = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function confirmAndSend() {
    const text = transcript.trim()
    if (text) onTranscript(text)
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Voice input"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
            <Mic className="size-4 text-[#1697cf]" aria-hidden="true" />
            Voice input
          </span>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cancel"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Language selector — disabled while actively recording/transcribing */}
        <div className="flex items-center justify-center gap-1 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              disabled={phase === "listening" || phase === "transcribing"}
              onClick={() => setLanguage(l.code)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:opacity-40 ${
                language === l.code
                  ? "bg-[#1697cf] text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-5 px-6 py-7">
          {phase === "requesting" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-7 animate-spin text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-500">
                Allow microphone access to start...
              </p>
            </div>
          )}

          {phase === "listening" && (
            <>
              <canvas
                ref={canvasRef}
                width={360}
                height={110}
                className="h-[110px] w-full max-w-[360px]"
              />
              <p className="text-sm font-bold text-slate-700">
                {heardSpeech ? "Listening..." : "Start speaking"}
              </p>
              <p className="text-center text-xs font-semibold text-slate-500">
                Speaking in{" "}
                <span className="text-[#1697cf]">
                  {LANGUAGES.find((l) => l.code === language)?.label}
                </span>
                . It sends automatically when you pause.
              </p>
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-full bg-[#1697cf] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
              >
                Done
              </button>
            </>
          )}

          {phase === "transcribing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700">Transcribing...</p>
            </div>
          )}

          {phase === "review" && (
            <div className="flex w-full flex-col gap-4">
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  We heard
                </p>
                {/* Editable so the user can fix any misheard word before sending */}
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
                  aria-label="Transcribed text (editable)"
                />
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Review and edit if needed, then send.
                </p>
              </div>
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={startSession}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Record again
                </button>
                <button
                  type="button"
                  onClick={confirmAndSend}
                  disabled={!transcript.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] disabled:opacity-40"
                >
                  <Check className="size-4" aria-hidden="true" />
                  Send
                </button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={startSession}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
