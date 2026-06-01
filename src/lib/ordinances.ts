import { ObjectId, type WithId, type Document } from "mongodb"
import { getDb } from "./mongodb"
import type { Ordinance, OrdinanceStatus, PaginatedOrdinances } from "./types"

const COLLECTION = "ordinances"

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

export async function listOrdinances(
  page = 1,
  pageSize = 10
): Promise<PaginatedOrdinances> {
  const db = await getDb()
  const collection = db.collection(COLLECTION)

  const safePage = Math.max(1, page)
  const safeSize = Math.min(100, Math.max(1, pageSize))

  const total = await collection.countDocuments({})
  const docs = await collection
    .find({})
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
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection(COLLECTION).insertOne(doc)
  return serialize({ _id: result.insertedId, ...doc })
}
