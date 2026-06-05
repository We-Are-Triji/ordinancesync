import { getGoogleAccessToken } from "./google-auth"

/**
 * Google Cloud Text-to-Speech. Used to speak the assistant's chat answers.
 *
 * Note: there is no dedicated Cebuano (ceb-PH) TTS voice, but Filipino
 * (fil-PH) voices read Cebuano text naturally because they share Latin script
 * and overlapping phonetics. English answers use an English voice.
 */

export function isTtsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_PROJECT)
}

// Map a requested language to a TTS voice. Bisaya + Filipino both use a
// Filipino Wavenet voice; English uses an English voice.
function voiceFor(language: string): { languageCode: string; name: string } {
  if (language.startsWith("en")) {
    return { languageCode: "en-US", name: "en-US-Neural2-F" }
  }
  // ceb-PH and fil-PH both → Filipino Wavenet (natural for Bisaya text).
  return { languageCode: "fil-PH", name: "fil-PH-Wavenet-A" }
}

// Strip Markdown so the spoken output sounds natural (no asterisks, etc.).
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

export interface SynthesizeResult {
  audioBase64: string
  mimeType: string
}

export async function synthesizeSpeech(
  text: string,
  language: string
): Promise<SynthesizeResult> {
  if (!isTtsConfigured()) {
    throw new Error("Text-to-Speech not configured. Set GOOGLE_CLOUD_PROJECT.")
  }

  // Cap to keep audio short and within reason.
  const clean = stripMarkdown(text).slice(0, 1500)
  const voice = voiceFor(language)

  const token = await getGoogleAccessToken()
  const res = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text: clean },
        voice: { languageCode: voice.languageCode, name: voice.name },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
      }),
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`TTS failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  if (!data.audioContent) {
    throw new Error("TTS returned no audio.")
  }
  return { audioBase64: data.audioContent, mimeType: "audio/mpeg" }
}
