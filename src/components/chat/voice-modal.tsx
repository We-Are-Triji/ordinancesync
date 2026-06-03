"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Mic, X } from "lucide-react"

type Phase = "requesting" | "listening" | "transcribing" | "error"

interface VoiceModalProps {
  onClose: () => void
  // Receives the final transcript to send to the chat.
  onTranscript: (text: string) => void
}

// Tuning constants.
const MAX_RECORDING_MS = 15_000 // hard cap to protect the free tier
const SILENCE_MS = 2_500 // auto-stop after this much quiet (once speech began)
const MIN_RECORDING_MS = 600 // ignore accidental blips
const SILENCE_THRESHOLD = 0.045 // RMS below this counts as "silence"

export default function VoiceModal({ onClose, onTranscript }: VoiceModalProps) {
  const [phase, setPhase] = useState<Phase>("requesting")
  const [error, setError] = useState<string | null>(null)
  const [heardSpeech, setHeardSpeech] = useState(false)

  // Refs for the audio graph + recorder so they survive renders.
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)

  // Timers + state tracked in refs (so the animation loop reads fresh values).
  const startedAtRef = useRef<number>(0)
  const lastSoundAtRef = useRef<number>(0)
  const heardSpeechRef = useRef<boolean>(false)
  const stoppingRef = useRef<boolean>(false)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fully tears down mic + audio graph. Safe to call multiple times.
  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    recorderRef.current = null
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Stops recording; the recorder's onstop handler does the upload.
  const stopRecording = useCallback(() => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    cancelAnimationFrame(rafRef.current)
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop()
      }
    } catch {
      // ignore
    }
  }, [])

  // Cancel = stop everything and close, no transcription.
  const handleCancel = useCallback(() => {
    stoppingRef.current = true
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop()
      }
    } catch {
      // ignore
    }
    cleanup()
    onClose()
  }, [cleanup, onClose])

  // The animation + silence-detection loop.
  const draw = useCallback(() => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const buffer = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(buffer)

    // Compute RMS amplitude (0..~1) for silence detection + bar scaling.
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

    // Draw a symmetric bar waveform.
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    const bars = 48
    const gap = 3
    const barWidth = (width - gap * (bars - 1)) / bars
    const mid = height / 2
    for (let i = 0; i < bars; i++) {
      // Sample a slice of the buffer for this bar.
      const idx = Math.floor((i / bars) * buffer.length)
      const v = Math.abs((buffer[idx] - 128) / 128)
      const amp = Math.max(0.04, v) * (0.6 + rms * 3)
      const barHeight = Math.min(height, amp * height)
      const x = i * (barWidth + gap)
      ctx.fillStyle = "#1697cf"
      const r = barWidth / 2
      const y = mid - barHeight / 2
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, r)
      ctx.fill()
    }

    // Auto-stop on sustained silence (only after the user has spoken).
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

  const uploadForTranscription = useCallback(
    async (blob: Blob) => {
      setPhase("transcribing")
      try {
        const base64 = await blobToBase64(blob)
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Transcription failed.")
        cleanup()
        onTranscript(data.transcript)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transcription failed.")
        setPhase("error")
        cleanup()
      }
    },
    [cleanup, onTranscript]
  )

  // Set everything up on mount.
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
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
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          })
          // Only transcribe if we actually captured speech.
          if (heardSpeechRef.current && blob.size > 0) {
            uploadForTranscription(blob)
          } else {
            setError("We didn't catch anything. Please try again.")
            setPhase("error")
            cleanup()
          }
        }

        startedAtRef.current = Date.now()
        lastSoundAtRef.current = Date.now()
        recorder.start()
        setPhase("listening")
        rafRef.current = requestAnimationFrame(draw)

        // Hard cap.
        maxTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS)
      } catch (err) {
        const name = err instanceof Error ? err.name : ""
        setError(
          name === "NotAllowedError"
            ? "Microphone access was denied. Enable it in your browser to use voice."
            : "Couldn't access the microphone."
        )
        setPhase("error")
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
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

        <div className="flex flex-col items-center gap-5 px-6 py-8">
          {phase === "requesting" && (
            <p className="text-sm font-semibold text-slate-500">
              Allow microphone access to start...
            </p>
          )}

          {phase === "listening" && (
            <>
              <canvas
                ref={canvasRef}
                width={360}
                height={120}
                className="h-[120px] w-full max-w-[360px]"
              />
              <p className="text-sm font-bold text-slate-700">
                {heardSpeech ? "Listening..." : "Start speaking"}
              </p>
              <p className="text-xs font-semibold text-slate-400">
                Speak in English, Filipino, or Bisaya. It sends automatically
                when you stop.
              </p>
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-full bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
              >
                Done
              </button>
            </>
          )}

          {phase === "transcribing" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="size-8 animate-spin text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700">Transcribing...</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
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
      // Strip the "data:...;base64," prefix.
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
