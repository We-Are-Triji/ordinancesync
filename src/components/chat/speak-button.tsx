"use client"

import { useRef, useState } from "react"
import { Loader2, Volume2, VolumeX } from "lucide-react"

/**
 * Plays an assistant answer aloud via /api/speak (Google TTS).
 *
 * Language: Bisaya answers have no dedicated TTS voice, so we route Bisaya and
 * Filipino to a Filipino voice and English to an English voice. We pick using
 * a light heuristic on the text plus an optional explicit hint.
 */

interface SpeakButtonProps {
  text: string
  // Optional explicit language (e.g. from the voice modal selection).
  languageHint?: string
}

// Common English function words — if several appear, treat the text as English.
const EN_MARKERS = [
  " the ",
  " and ",
  " is ",
  " are ",
  " of ",
  " to ",
  " for ",
  " ordinance",
  " no ordinance",
]

function guessLanguage(text: string, hint?: string): string {
  if (hint) return hint
  const lower = ` ${text.toLowerCase()} `
  const enHits = EN_MARKERS.filter((m) => lower.includes(m)).length
  // Bisaya/Filipino markers.
  const tlHits = [" ang ", " sa ", " mga ", " naa ", " walay ", " kini ", " ug "]
    .filter((m) => lower.includes(m)).length
  if (tlHits > enHits) return "fil-PH"
  return enHits >= 2 ? "en-US" : "fil-PH"
}

export default function SpeakButton({ text, languageHint }: SpeakButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle")
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handleClick() {
    // Toggle off if currently playing.
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setState("idle")
      return
    }
    if (state === "loading") return

    setState("loading")
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: guessLanguage(text, languageHint),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Voice unavailable.")

      const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`)
      audioRef.current = audio
      audio.onended = () => {
        setState("idle")
        audioRef.current = null
      }
      audio.onerror = () => {
        setState("idle")
        audioRef.current = null
      }
      await audio.play()
      setState("playing")
    } catch {
      setState("idle")
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold text-slate-400 transition hover:bg-[#1697cf]/10 hover:text-[#1697cf]"
      aria-label={state === "playing" ? "Stop audio" : "Listen to answer"}
      title={state === "playing" ? "Stop" : "Listen"}
    >
      {state === "loading" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : state === "playing" ? (
        <VolumeX className="size-3.5" aria-hidden="true" />
      ) : (
        <Volume2 className="size-3.5" aria-hidden="true" />
      )}
      {state === "playing" ? "Stop" : "Listen"}
    </button>
  )
}
