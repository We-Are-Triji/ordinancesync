import { NextRequest, NextResponse } from "next/server"
import { Readable } from "node:stream"
import { getBucket } from "@/lib/mongodb"
import { extractPdfText } from "@/lib/pdf-text"
import {
  extractOrdinanceMetadata,
  extractOrdinanceMetadataFromPdf,
  isGeminiConfigured,
} from "@/lib/gemini"

export const runtime = "nodejs"
// PDF text extraction + AI metadata extraction on large files can exceed 10s.
export const maxDuration = 60

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB
const PDF_MAGIC = Buffer.from("%PDF-")
const MAX_PAGES = 300
const MAX_EXTRACTED_TEXT_CHARS = 250_000

function hasPdfExtension(fileName: string): boolean {
  return /\.pdf$/i.test(fileName.trim())
}

function hasPdfMagicNumber(buffer: Buffer): boolean {
  return (
    buffer.length >= PDF_MAGIC.length &&
    buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 415 }
      )
    }

    if (!hasPdfExtension(file.name)) {
      return NextResponse.json(
        { error: "Only files with a .pdf extension are accepted" },
        { status: 415 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 25 MB limit" },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasPdfMagicNumber(buffer)) {
      return NextResponse.json(
        { error: "The uploaded file is not a valid PDF document" },
        { status: 415 }
      )
    }

    // Extract text so the chat agent can search/quote actual ordinance content.
    // Failure here shouldn't block the upload — store empty text and continue.
    let text = ""
    let extractedPages = 0
    try {
      const extracted = await extractPdfText(buffer)
      if (extracted.pageCount > MAX_PAGES) {
        return NextResponse.json(
          { error: `PDF exceeds the ${MAX_PAGES}-page limit` },
          { status: 413 }
        )
      }
      text = extracted.text.slice(0, MAX_EXTRACTED_TEXT_CHARS)
      extractedPages = extracted.pageCount
    } catch (err) {
      console.error("PDF text extraction failed (continuing):", err)
    }

    // AI-extract the ordinance number, title, and summary for human review.
    // Prefer the extracted text; if that's empty (e.g. scanned PDF), fall back
    // to Gemini reading the PDF bytes directly. Best-effort — never block the
    // upload, but report whether auto-fill succeeded.
    let ordinanceNumber = ""
    let title = ""
    let summary = ""
    let metadataStatus: "ok" | "partial" | "failed" | "skipped" = "skipped"

    if (isGeminiConfigured()) {
      try {
        const meta = text.trim()
          ? await extractOrdinanceMetadata(text)
          : await extractOrdinanceMetadataFromPdf(buffer.toString("base64"))
        ordinanceNumber = meta.ordinanceNumber
        title = meta.title
        summary = meta.summary
        const gotAll = ordinanceNumber && title && summary
        metadataStatus = gotAll ? "ok" : (ordinanceNumber || title || summary) ? "partial" : "failed"
      } catch (err) {
        console.error("Metadata extraction failed (continuing):", err)
        metadataStatus = "failed"
      }
    }

    const bucket = await getBucket()
    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { contentType: "application/pdf" },
    })

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer).pipe(uploadStream).on("error", reject).on("finish", resolve)
    })

    return NextResponse.json({
      fileId: uploadStream.id.toString(),
      fileName: file.name,
      fileSize: file.size,
      text,
      extractedPages,
      ordinanceNumber,
      title,
      summary,
      metadataStatus,
    })
  } catch (err) {
    console.error("Upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
