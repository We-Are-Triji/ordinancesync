import { getGoogleAccessToken } from "./google-auth"

// Vertex text embeddings, used for semantic caching of chat answers.
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "asia-southeast1"
const MODEL = "text-embedding-005"

export function isEmbeddingConfigured(): boolean {
  return Boolean(PROJECT)
}

/**
 * Returns the embedding vector for a piece of text, or null if embeddings
 * aren't available (so callers can degrade gracefully).
 */
export async function embed(text: string): Promise<number[] | null> {
  if (!isEmbeddingConfigured()) return null

  try {
    const token = await getGoogleAccessToken()
    const endpoint =
      `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
      `projects/${PROJECT}/locations/${LOCATION}/` +
      `publishers/google/models/${MODEL}:predict`

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ task_type: "RETRIEVAL_QUERY", content: text }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const values = data?.predictions?.[0]?.embeddings?.values
    return Array.isArray(values) ? values : null
  } catch {
    return null
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
