import { createHash } from "node:crypto"
import { embed, cosineSimilarity } from "./embeddings"
import { getDb } from "./mongodb"

/**
 * Shared semantic cache for chat answers. When a new question is semantically
 * close to a previously answered one (and the ordinance dataset hasn't
 * changed), we can reuse the cached answer instead of recomputing with the
 * agent.
 *
 * MongoDB is used as the shared backing store so cache hits work across
 * serverless instances and survive cold starts. We still do cosine similarity
 * in-process over a bounded recent candidate set; if this grows beyond a few
 * hundred entries, move this to Atlas Vector Search or Redis vector indexes.
 */

interface CacheEntryDocument {
  question: string
  questionHash: string
  embedding: number[]
  answer: string
  datasetVersion: string
  createdAt: Date
  updatedAt: Date
}

// Similarity at/above this is considered "the same question".
const SIMILARITY_THRESHOLD = 0.92
const MAX_CANDIDATES = 200
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const COLLECTION = "semantic_answer_cache"

let indexPromise: Promise<void> | null = null

async function getCollection() {
  const db = await getDb()
  const collection = db.collection<CacheEntryDocument>(COLLECTION)

  indexPromise ??= Promise.all([
    collection.createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: CACHE_TTL_SECONDS, name: "semantic_cache_ttl" }
    ),
    collection.createIndex(
      { datasetVersion: 1, createdAt: -1 },
      { name: "semantic_cache_dataset_recent" }
    ),
    collection.createIndex(
      { datasetVersion: 1, questionHash: 1 },
      { name: "semantic_cache_question", unique: true }
    ),
  ]).then(() => undefined)

  await indexPromise
  return collection
}

function hashQuestion(question: string): string {
  return createHash("sha256").update(question.trim().toLowerCase()).digest("hex")
}

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

  let candidates: CacheEntryDocument[]
  try {
    const collection = await getCollection()
    candidates = await collection
      .find({ datasetVersion })
      .sort({ createdAt: -1 })
      .limit(MAX_CANDIDATES)
      .toArray()
  } catch (err) {
    console.error("Semantic cache lookup failed:", err)
    return { answer: "", similarity: 0, embedding }
  }

  let best: { entry: CacheEntryDocument; sim: number } | null = null
  for (const entry of candidates) {
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
export async function storeAnswer(
  question: string,
  embedding: number[] | null,
  answer: string,
  datasetVersion: string
): Promise<void> {
  if (!embedding) return
  try {
    const collection = await getCollection()
    const now = new Date()
    const questionHash = hashQuestion(question)

    await collection.updateOne(
      { questionHash, datasetVersion },
      {
        $set: {
          question,
          questionHash,
          embedding,
          answer,
          datasetVersion,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    )

    // Keep the collection bounded per dataset version in addition to the TTL.
    const oldEntries = await collection
      .find({ datasetVersion }, { projection: { _id: 1 } })
      .sort({ createdAt: -1 })
      .skip(MAX_CANDIDATES)
      .toArray()

    if (oldEntries.length > 0) {
      await collection.deleteMany({
        _id: { $in: oldEntries.map((entry) => entry._id) },
      })
    }
  } catch (err) {
    console.error("Semantic cache store failed:", err)
  }
}
