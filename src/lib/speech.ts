import { getGoogleAccessToken } from "./google-auth"

/**
 * Google Cloud Speech-to-Text v2 (Chirp) transcription.
 *
 * Uses the `chirp` model in asia-southeast1 with an EXPLICIT language code.
 * We deliberately do NOT use language auto-detection: for this Cebu-City app,
 * restricting to the chosen language (Bisaya by default) is far more accurate
 * for Cebuano spelling and prevents the model from hallucinating an unrelated
 * language (e.g. Spanish) when given near-silent/noisy audio.
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
// chirp + ceb-PH are available in asia-southeast1 (NOT in us).
const STT_REGION = process.env.STT_REGION ?? "asia-southeast1"
const MODEL = "chirp"

// Languages offered in the UI. Bisaya is the default.
export const SUPPORTED_STT_LANGUAGES = {
  "ceb-PH": "Bisaya",
  "en-US": "English",
  "fil-PH": "Filipino",
} as const

export type SttLanguage = keyof typeof SUPPORTED_STT_LANGUAGES

export const DEFAULT_STT_LANGUAGE: SttLanguage = "ceb-PH"

export function isSpeechConfigured(): boolean {
  return Boolean(PROJECT)
}

export function isValidSttLanguage(code: string): code is SttLanguage {
  return code in SUPPORTED_STT_LANGUAGES
}

export interface TranscriptionResult {
  transcript: string
  languageCode: string
}

export async function transcribeAudio(
  audioBase64: string,
  languageCode: SttLanguage = DEFAULT_STT_LANGUAGE
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
        languageCodes: [languageCode],
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

  return { transcript, languageCode }
}
