import { getGoogleAccessToken } from "./google-auth"

// Direct Gemini (Vertex) calls for lightweight, non-agentic tasks like
// extracting structured metadata from ordinance documents.

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

const EXTRACTION_PROMPT =
  "You are extracting metadata from a Cebu City ordinance document. " +
  "Extract these fields:\n" +
  "- ordinanceNumber: the official ordinance number exactly as written " +
  '(e.g. "Ordinance No. 2026-055" or "ORD-2026-14"). If none is found, use "".\n' +
  '- title: the official title of the ordinance (the long ALL-CAPS heading ' +
  'beginning with "AN ORDINANCE..."). If none, use "".\n' +
  "- summary: one concise plain-language sentence describing what the " +
  "ordinance does.\n\n" +
  "Respond with ONLY a JSON object: " +
  '{"ordinanceNumber": "...", "title": "...", "summary": "..."}'

function endpoint(): string {
  return (
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `publishers/google/models/${MODEL}:generateContent`
  )
}

function parseMetadata(raw: string): OrdinanceMetadata {
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

async function callGemini(parts: unknown[]): Promise<OrdinanceMetadata> {
  const token = await getToken()
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `Metadata extraction failed (${res.status}): ${detail.slice(0, 200)}`
    )
  }

  const data = await res.json()
  const raw =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? ""
  return parseMetadata(raw)
}

/**
 * Extracts ordinance metadata from the extracted PDF text.
 */
export async function extractOrdinanceMetadata(
  text: string
): Promise<OrdinanceMetadata> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini not configured. Set GOOGLE_CLOUD_PROJECT.")
  }
  const snippet = text.slice(0, 8000)
  return callGemini([{ text: `${EXTRACTION_PROMPT}\n\n=== ORDINANCE TEXT ===\n${snippet}` }])
}

/**
 * Fallback: extract metadata directly from the PDF bytes using Gemini's native
 * multimodal PDF reading. Used when local text extraction yields nothing
 * (e.g. scanned or oddly-encoded PDFs).
 */
export async function extractOrdinanceMetadataFromPdf(
  pdfBase64: string
): Promise<OrdinanceMetadata> {
  if (!isGeminiConfigured()) {
    throw new Error("Gemini not configured. Set GOOGLE_CLOUD_PROJECT.")
  }
  return callGemini([
    { text: EXTRACTION_PROMPT },
    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
  ])
}
