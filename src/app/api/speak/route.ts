import { NextRequest, NextResponse } from "next/server"
import { synthesizeSpeech, isTtsConfigured } from "@/lib/tts"

export const runtime = "nodejs"
export const maxDuration = 30

const MAX_TEXT_LENGTH = 2000

export async function POST(request: NextRequest) {
  if (!isTtsConfigured()) {
    return NextResponse.json(
      { error: "Voice output is not available right now." },
      { status: 503 }
    )
  }

  try {
    const { text, language } = await request.json()

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 })
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "Text is too long." }, { status: 413 })
    }

    const lang = typeof language === "string" ? language : "fil-PH"
    const { audioBase64, mimeType } = await synthesizeSpeech(text, lang)

    return NextResponse.json({ audio: audioBase64, mimeType })
  } catch (err) {
    console.error("Speak failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Speech failed." },
      { status: 500 }
    )
  }
}
