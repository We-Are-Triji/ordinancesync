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

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 25 MB limit" },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = await getBucket()

    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { contentType: "application/pdf" },
    })

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer).pipe(uploadStream).on("error", reject).on("finish", resolve)
    })

    // Extract text so the chat agent can search/quote actual ordinance content.
    // Failure here shouldn't block the upload — store empty text and continue.
    let text = ""
    let extractedPages = 0
    try {
      const extracted = await extractPdfText(buffer)
      text = extracted.text
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
