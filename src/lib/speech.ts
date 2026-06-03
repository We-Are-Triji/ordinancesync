import { getGoogleAccessToken } from "./google-auth"

/**
 * Google Cloud Speech-to-Text v2 (Chirp 3) transcription.
 *
 * Uses language-agnostic transcription (`languageCodes: ["auto"]`) so the
 * speaker can talk in English, Filipino, or Bisaya/Cebuano and the model
 * auto-detects. Auto detection requires the `us` (or global/eu) region, so
 * this endpoint runs in `us` — independent of where the rest of the app runs.
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
// Auto language detection is only available in us/eu/global regions.
const STT_REGION = process.env.STT_REGION ?? "us"
const MODEL = "chirp_3"

export function isSpeechConfigured(): boolean {
  return Boolean(PROJECT)
}

export interface TranscriptionResult {
  transcript: string
  languageCode: string
}

/**
 * Transcribes a base64-encoded audio clip. `AutoDetectDecodingConfig` lets the
 * API figure out the container/encoding (WEBM/OPUS, MP4/AAC, etc.) so we don't
 * have to normalize what MediaRecorder produced.
 */
export async function transcribeAudio(
  audioBase64: string
): Promise<TranscriptionResult> {
  if (!isSpeechConfigured()) {
    throw new Error("Speech-to-Text not configured. Set GOOGLE_CLOUD_PROJECT.")
  }

  const token = await getGoogleAccessToken()
  const endpoint =
    `https://${STT_REGION}-speech.googleapis.com/v2/` +
    `projects/${PROJECT}/locations/${STT_REGION}/recognizers/_:recognize`

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: {
        autoDecodingConfig: {},
        languageCodes: ["auto"],
        model: MODEL,
      },
      content: audioBase64,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `Transcription failed (${res.status}): ${detail.slice(0, 300)}`
    )
  }

  const data = await res.json()
  const results: Array<{
    alternatives?: Array<{ transcript?: string }>
    languageCode?: string
  }> = data?.results ?? []

  const transcript = results
    .map((r) => r.alternatives?.[0]?.transcript ?? "")
    .join(" ")
    .trim()

  const languageCode =
    results.find((r) => r.languageCode)?.languageCode ?? "auto"

  return { transcript, languageCode }
}
