import { ObjectId, type WithId, type Document, type Filter } from "mongodb"
import { getDb, getBucket } from "./mongodb"
import type { Ordinance, OrdinanceStatus, PaginatedOrdinances } from "./types"

const COLLECTION = "ordinances"

// Escape user input before using it in a RegExp so search terms are treated
// literally and can't inject regex operators.
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function serialize(doc: WithId<Document>): Ordinance {
  return {
    _id: doc._id.toString(),
    ordinanceNumber: doc.ordinanceNumber ?? "",
    title: doc.title ?? "",
    office: doc.office ?? "",
    status: (doc.status as OrdinanceStatus) ?? "active",
    pageCount: doc.pageCount ?? 0,
    fileId: doc.fileId?.toString() ?? "",
    fileName: doc.fileName ?? "",
    fileSize: doc.fileSize ?? 0,
    summary: doc.summary ?? "",
    text: doc.text ?? "",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : (doc.createdAt ?? new Date().toISOString()),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : (doc.updatedAt ?? new Date().toISOString()),
  }
}

export interface ListOrdinancesOptions {
  page?: number
  pageSize?: number
  search?: string
  status?: OrdinanceStatus | "all"
}

export async function listOrdinances(
  options: ListOrdinancesOptions = {}
): Promise<PaginatedOrdinances> {
  const { page = 1, pageSize = 10, search = "", status = "all" } = options

  const db = await getDb()
  const collection = db.collection(COLLECTION)

  const safePage = Math.max(1, page)
  const safeSize = Math.min(100, Math.max(1, pageSize))

  const query: Filter<Document> = {}

  if (status && status !== "all") {
    query.status = status
  }

  const term = search.trim()
  if (term) {
    const regex = { $regex: escapeRegex(term), $options: "i" }
    query.$or = [
      { ordinanceNumber: regex },
      { title: regex },
      { office: regex },
    ]
  }

  const total = await collection.countDocuments(query)
  const docs = await collection
    .find(query)
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * safeSize)
    .limit(safeSize)
    .toArray()

  return {
    items: docs.map(serialize),
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  }
}

export async function getOrdinance(id: string): Promise<Ordinance | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getDb()
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
  return doc ? serialize(doc) : null
}

export interface CreateOrdinanceInput {
  ordinanceNumber: string
  title: string
  office: string
  status?: OrdinanceStatus
  pageCount: number
  fileId: string
  fileName: string
  fileSize: number
  summary?: string
  text?: string
}

export async function createOrdinance(
  input: CreateOrdinanceInput
): Promise<Ordinance> {
  const db = await getDb()
  const now = new Date()
  const doc = {
    ordinanceNumber: input.ordinanceNumber,
    title: input.title,
    office: input.office,
    status: input.status ?? "active",
    pageCount: input.pageCount,
    fileId: new ObjectId(input.fileId),
    fileName: input.fileName,
    fileSize: input.fileSize,
    summary: input.summary ?? "",
    text: input.text ?? "",
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection(COLLECTION).insertOne(doc)
  return serialize({ _id: result.insertedId, ...doc })
}

export interface UpdateOrdinanceInput {
  ordinanceNumber?: string
  title?: string
  office?: string
  status?: OrdinanceStatus
  summary?: string
}

export async function updateOrdinance(
  id: string,
  input: UpdateOrdinanceInput
): Promise<Ordinance | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getDb()

  const update: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of ["ordinanceNumber", "title", "office", "status", "summary"] as const) {
    if (input[key] !== undefined) update[key] = input[key]
  }

  const result = await db
    .collection(COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    )

  return result ? serialize(result) : null
}

export async function deleteOrdinance(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const db = await getDb()

  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
  if (!doc) return false

  // Remove the backing PDF from GridFS first, then the metadata record.
  if (doc.fileId) {
    try {
      const bucket = await getBucket()
      await bucket.delete(new ObjectId(doc.fileId))
    } catch (err) {
      // File may already be gone; log and continue removing the record.
      console.error("Failed to delete GridFS file:", err)
    }
  }

  const result = await db
    .collection(COLLECTION)
    .deleteOne({ _id: new ObjectId(id) })

  return result.deletedCount === 1
}

export interface OrdinanceContext {
  ordinanceNumber: string
  title: string
  office: string
  status: OrdinanceStatus
  summary: string
  text: string
}

/**
 * Returns ordinance grounding context for the chat agent, including a bounded
 * slice of full text so the agent can answer content questions WITHOUT making
 * a live tool call (which avoids the ADK code-execution/MCP tool-call bug and
 * is far faster). Large ordinances are truncated to keep the prompt bounded.
 */
export async function getOrdinanceContext(
  perDocTextLimit = 4000
): Promise<OrdinanceContext[]> {
  const db = await getDb()
  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  return docs.map((d) => ({
    ordinanceNumber: d.ordinanceNumber ?? "",
    title: d.title ?? "",
    office: d.office ?? "",
    status: (d.status as OrdinanceStatus) ?? "active",
    summary: d.summary ?? "",
    text: (d.text ?? "").slice(0, perDocTextLimit),
  }))
}

/**
 * Returns the set of valid ordinance numbers currently in the database,
 * normalized for comparison. Used to validate that an answer only cites real
 * ordinances.
 */
export async function getValidOrdinanceNumbers(): Promise<Set<string>> {
  const db = await getDb()
  const docs = await db
    .collection(COLLECTION)
    .find({}, { projection: { ordinanceNumber: 1 } })
    .toArray()
  return new Set(
    docs
      .map((d) => String(d.ordinanceNumber ?? "").trim().toLowerCase())
      .filter(Boolean)
  )
}

/**
 * A cheap fingerprint of the current ordinance dataset. Changes whenever an
 * ordinance is added, edited, or removed. Used to invalidate the semantic
 * answer cache so stale answers are never served after data changes.
 */
export async function getDatasetVersion(): Promise<string> {
  const db = await getDb()
  const collection = db.collection(COLLECTION)
  const count = await collection.countDocuments({})
  const latest = await collection
    .find({}, { projection: { updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(1)
    .toArray()
  const stamp =
    latest[0]?.updatedAt instanceof Date
      ? latest[0].updatedAt.getTime()
      : String(latest[0]?.updatedAt ?? "0")
  return `${count}:${stamp}`
}
