import { ObjectId, type WithId, type Document } from "mongodb"
import { getDb } from "./mongodb"
import type { Dispatch, DispatchItem } from "./types"

const COLLECTION = "dispatches"

function serialize(doc: WithId<Document>): Dispatch {
  return {
    _id: doc._id.toString(),
    ordinanceId: doc.ordinanceId?.toString() ?? "",
    ordinanceNumber: doc.ordinanceNumber ?? "",
    ordinanceTitle: doc.ordinanceTitle ?? "",
    items: (doc.items ?? []) as DispatchItem[],
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : (doc.createdAt ?? new Date().toISOString()),
    dispatchedAt:
      doc.dispatchedAt instanceof Date
        ? doc.dispatchedAt.toISOString()
        : doc.dispatchedAt,
  }
}

export interface CreateDispatchInput {
  ordinanceId: string
  ordinanceNumber: string
  ordinanceTitle: string
  items: DispatchItem[]
}

export async function createDispatch(
  input: CreateDispatchInput
): Promise<Dispatch> {
  const db = await getDb()
  const now = new Date()
  const doc = {
    ordinanceId: input.ordinanceId,
    ordinanceNumber: input.ordinanceNumber,
    ordinanceTitle: input.ordinanceTitle,
    items: input.items,
    createdAt: now,
    dispatchedAt: now,
  }
  const result = await db.collection(COLLECTION).insertOne(doc)
  return serialize({ _id: result.insertedId, ...doc })
}

export async function getDispatch(id: string): Promise<Dispatch | null> {
  if (!ObjectId.isValid(id)) return null
  const db = await getDb()
  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) })
  return doc ? serialize(doc) : null
}

/**
 * Most recent dispatch for an ordinance, or null if it was never dispatched.
 *
 * Used by the policy detail modal to surface "last dispatched at / N sent"
 * without forcing a full history fetch. Sorted by createdAt desc so the
 * automatic dispatch right after creation, plus any manual re-dispatches,
 * resolve to the freshest entry.
 */
export async function getLatestDispatchForOrdinance(
  ordinanceId: string
): Promise<Dispatch | null> {
  if (!ordinanceId) return null
  const db = await getDb()
  const doc = await db
    .collection(COLLECTION)
    .find({ ordinanceId })
    .sort({ createdAt: -1 })
    .limit(1)
    .next()
  return doc ? serialize(doc) : null
}

/**
 * Most recent dispatch across all ordinances, or null if none have been
 * dispatched yet. Used by the admin settings page to summarize directory
 * activity ("Last dispatched ORD-12 · 4 sent · 1 failed").
 */
export async function getLatestDispatch(): Promise<Dispatch | null> {
  const db = await getDb()
  const doc = await db
    .collection(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .limit(1)
    .next()
  return doc ? serialize(doc) : null
}
