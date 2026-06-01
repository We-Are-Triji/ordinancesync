// One-time backfill: extract text from each ordinance's GridFS PDF and store
// it in the document's `text` field, so the chat agent can search content of
// ordinances that were uploaded before text extraction existed.
//
// Run from the project root:  node scripts/backfill-text.mjs

import { MongoClient, GridFSBucket, ObjectId } from "mongodb"
import { readFileSync } from "node:fs"

const env = readFileSync(".env.local", "utf8")
const uri = env.match(/^MONGODB_URI=(.+)$/m)[1].trim()
const DB = "ordinance_sync"

async function extractPdfText(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })
  const doc = await task.promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((it) => it.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
  }
  await doc.cleanup()
  return { text: pages.join("\n\n"), pageCount: doc.numPages }
}

async function loadFile(bucket, fileId) {
  const chunks = []
  await new Promise((resolve, reject) => {
    bucket
      .openDownloadStream(new ObjectId(fileId))
      .on("data", (c) => chunks.push(c))
      .on("end", resolve)
      .on("error", reject)
  })
  return Buffer.concat(chunks)
}

const client = new MongoClient(uri)
try {
  await client.connect()
  const db = client.db(DB)
  const col = db.collection("ordinances")
  const bucket = new GridFSBucket(db, { bucketName: "ordinance_files" })

  // Only ordinances missing text (or with empty text).
  const docs = await col
    .find({ $or: [{ text: { $exists: false } }, { text: "" }] })
    .toArray()

  console.log(`Found ${docs.length} ordinance(s) needing text backfill.`)

  for (const doc of docs) {
    if (!doc.fileId) {
      console.log(`- ${doc.ordinanceNumber}: no fileId, skipping`)
      continue
    }
    try {
      const buffer = await loadFile(bucket, doc.fileId)
      const { text, pageCount } = await extractPdfText(buffer)
      await col.updateOne(
        { _id: doc._id },
        { $set: { text, pageCount: pageCount || doc.pageCount, updatedAt: new Date() } }
      )
      console.log(
        `- ${doc.ordinanceNumber}: extracted ${text.length} chars from ${pageCount} page(s)`
      )
    } catch (err) {
      console.error(`- ${doc.ordinanceNumber}: FAILED -`, err.message)
    }
  }

  console.log("Backfill complete.")
} catch (err) {
  console.error("Backfill error:", err.message)
  process.exitCode = 1
} finally {
  await client.close()
}
