import { ObjectId, type WithId, type Document, type Filter } from "mongodb"
import { getDb } from "./mongodb"
import type { Office, OfficeCategory, PaginatedOffices } from "./types"

const COLLECTION = "offices"

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function serialize(doc: WithId<Document>): Office {
  return {
    _id: doc._id.toString(),
    name: doc.name ?? "",
    email: doc.email ?? "",
    category: (doc.category as OfficeCategory) ?? "office",
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

export interface ListOfficesOptions {
  page?: number
  pageSize?: number
  search?: string
  category?: OfficeCategory | "all"
}

export async function listOffices(
  options: ListOfficesOptions = {}
): Promise<PaginatedOffices> {
  const { page = 1, pageSize = 10, search = "", category = "all" } = options

  const db = await getDb()
  const collection = db.collection(COLLECTION)

  const safePage = Math.max(1, page)
  const safeSize = Math.min(100, Math.max(1, pageSize))

  const query: Filter<Document> = {}

  if (category && category !== "all") {
    query.category = category
  }

  const term = search.trim()
  if (term) {
    const regex = { $regex: escapeRegex(term), $options: "i" }
    query.$or = [{ name: regex }, { email: regex }]
  }

  const total = await collection.countDocuments(query)
  const docs = await collection
    .find(query)
    .sort({ name: 1 })
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

// Returns every office, unpaginated. Used by the AI dispatch flow to match
// affected offices against the full directory.
export async function getAllOffices(): Promise<Office[]> {
  const db = await getDb()
  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ name: 1 })
    .toArray()
  return docs.map(serialize)
}

export async function getOfficeCount(): Promise<number> {
  const db = await getDb()
  return db.collection(COLLECTION).countDocuments({})
}

export async function getOffice(id: string): Promise<Office | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getDb()
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
  return doc ? serialize(doc) : null
}

export interface CreateOfficeInput {
  name: string
  email: string
  category?: OfficeCategory
}

export async function createOffice(input: CreateOfficeInput): Promise<Office> {
  const db = await getDb()
  const now = new Date()
  const doc = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    category: input.category ?? "office",
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection(COLLECTION).insertOne(doc)
  return serialize({ _id: result.insertedId, ...doc })
}

export interface UpdateOfficeInput {
  name?: string
  email?: string
  category?: OfficeCategory
}

export async function updateOffice(
  id: string,
  input: UpdateOfficeInput
): Promise<Office | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getDb()

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (input.name !== undefined) update.name = input.name.trim()
  if (input.email !== undefined) update.email = input.email.trim().toLowerCase()
  if (input.category !== undefined) update.category = input.category

  const result = await db
    .collection(COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: "after" }
    )

  return result ? serialize(result) : null
}

export async function deleteOffice(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false
  const db = await getDb()
  const result = await db
    .collection(COLLECTION)
    .deleteOne({ _id: new ObjectId(id) })
  return result.deletedCount === 1
}
