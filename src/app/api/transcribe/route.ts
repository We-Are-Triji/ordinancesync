import { NextRequest, NextResponse } from "next/server"
import { transcribeAudio, isSpeechConfigured } from "@/lib/speech"

export const runtime = "nodejs"
export const maxDuration = 30

// Guardrail: cap the audio payload to protect the free tier and block abuse.
// ~15s of compressed mic audio is well under 1.5 MB; 4 MB is a safe ceiling.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024

export async function POST(request: NextRequest) {
  if (!isSpeechConfigured()) {
    return NextResponse.json(
      { error: "Voice input is not available right now." },
      { status: 503 }
    )
  }

  try {
    const { audio } = await request.json()

    if (!audio || typeof audio !== "string") {
      return NextResponse.json(
        { error: "No audio provided." },
        { status: 400 }
      )
    }

    // base64 expands ~4/3; estimate decoded size from string length.
    const approxBytes = Math.floor((audio.length * 3) / 4)
    if (approxBytes > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "Recording is too long. Please keep it brief." },
        { status: 413 }
      )
    }

    const { transcript, languageCode } = await transcribeAudio(audio)

    if (!transcript) {
      return NextResponse.json(
        { error: "We couldn't hear anything. Please try again." },
        { status: 422 }
      )
    }

    return NextResponse.json({ transcript, languageCode })
  } catch (err) {
    console.error("Transcribe failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed." },
      { status: 500 }
    )
  }
}
