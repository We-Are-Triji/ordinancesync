import { embed, cosineSimilarity } from "./embeddings"

/**
 * In-memory semantic cache for chat answers. When a new question is
 * semantically close to a previously answered one (and the ordinance dataset
 * hasn't changed), we can reuse the cached answer instead of recomputing with
 * the agent.
 *
 * NOTE: This cache lives in the server process memory. It is per-instance and
 * resets on restart/redeploy, which is fine for cost reduction. For multi-
 * instance production you'd back this with a vector store.
 */

interface CacheEntry {
  question: string
  embedding: number[]
  answer: string
  datasetVersion: string
  createdAt: number
}

// Similarity at/above this is considered "the same question".
const SIMILARITY_THRESHOLD = 0.92
const MAX_ENTRIES = 200

const store: CacheEntry[] = []

/**
 * Looks for a semantically-matching cached answer for the dataset version.
 * Returns the cached answer + similarity, or null on miss.
 */
export async function findCachedAnswer(
  question: string,
  datasetVersion: string
): Promise<{ answer: string; similarity: number; embedding: number[] | null } | null> {
  const embedding = await embed(question)
  if (!embedding) return null // embeddings unavailable -> always a miss

  let best: { entry: CacheEntry; sim: number } | null = null
  for (const entry of store) {
    if (entry.datasetVersion !== datasetVersion) continue
    const sim = cosineSimilarity(embedding, entry.embedding)
    if (!best || sim > best.sim) best = { entry, sim }
  }

  if (best && best.sim >= SIMILARITY_THRESHOLD) {
    return { answer: best.entry.answer, similarity: best.sim, embedding }
  }
  return { answer: "", similarity: best?.sim ?? 0, embedding }
}

/**
 * Stores a freshly-computed answer. Accepts the precomputed embedding to avoid
 * embedding the same question twice.
 */
export function storeAnswer(
  question: string,
  embedding: number[] | null,
  answer: string,
  datasetVersion: string
): void {
  if (!embedding) return
  store.push({
    question,
    embedding,
    answer,
    datasetVersion,
    createdAt: Date.now(),
  })
  // Simple LRU-ish trim: drop oldest when over capacity.
  if (store.length > MAX_ENTRIES) {
    store.splice(0, store.length - MAX_ENTRIES)
  }
}
