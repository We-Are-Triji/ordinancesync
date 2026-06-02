import { getGoogleAccessToken } from "./google-auth"

// Direct Gemini (Vertex) calls for lightweight, non-agentic tasks like
// extracting structured metadata from ordinance text.

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "asia-southeast1"
const MODEL = "gemini-2.5-flash"

export function isGeminiConfigured(): boolean {
  return Boolean(PROJECT)
}

const getToken = getGoogleAccessToken

export interface OrdinanceMetadata {
  ordinanceNumber: string
  title: string
  summary: string
}

/**
 * Extracts the ordinance number, title, and a one-line summary from the raw
 * text of an ordinance PDF. Returns best-effort values (empty strings when not
 * confidently found) so the admin can review and correct — human in the loop.
 */
export async function extractOrdinanceMetadata(
  text: string
): Promise<OrdinanceMetadata> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini not configured. Set GOOGLE_CLOUD_PROJECT.")
  }

  // Only the first portion is needed; ordinance number/title live up top.
  const snippet = text.slice(0, 8000)

  const token = await getToken()
  const endpoint =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `publishers/google/models/${MODEL}:generateContent`

  const prompt =
    "You are extracting metadata from a Cebu City ordinance document. " +
    "From the text below, extract:\n" +
    "- ordinanceNumber: the official ordinance number exactly as written " +
    '(e.g. "Ordinance No. 2750" or "ORD-2026-14"). If none is found, use "".\n' +
    "- title: the official title of the ordinance. If none, use \"\".\n" +
    "- summary: one concise sentence describing what the ordinance does.\n\n" +
    "Respond with ONLY a JSON object: " +
    '{"ordinanceNumber": "...", "title": "...", "summary": "..."}\n\n' +
    "=== ORDINANCE TEXT ===\n" +
    snippet

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Metadata extraction failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? ""

  try {
    const parsed = JSON.parse(raw)
    return {
      ordinanceNumber: String(parsed.ordinanceNumber ?? "").trim(),
      title: String(parsed.title ?? "").trim(),
      summary: String(parsed.summary ?? "").trim(),
    }
  } catch {
    return { ordinanceNumber: "", title: "", summary: "" }
  }
}
