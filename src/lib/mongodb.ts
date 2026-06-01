import { MongoClient, GridFSBucket, Db } from "mongodb"

const uri = process.env.MONGODB_URI

if (!uri) {
  throw new Error(
    "Missing MONGODB_URI environment variable. Add it to .env.local."
  )
}

const DB_NAME = process.env.MONGODB_DB ?? "ordinance_sync"

// Cache the client across hot reloads in development so we don't open a new
// connection on every change. In production a single module instance is reused.
type GlobalWithMongo = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

const globalWithMongo = global as GlobalWithMongo

const clientPromise: Promise<MongoClient> =
  globalWithMongo._mongoClientPromise ??
  (globalWithMongo._mongoClientPromise = new MongoClient(uri).connect())

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db(DB_NAME)
}

export async function getBucket(): Promise<GridFSBucket> {
  const db = await getDb()
  return new GridFSBucket(db, { bucketName: "ordinance_files" })
}

export { clientPromise }
