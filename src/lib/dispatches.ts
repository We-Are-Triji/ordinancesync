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
