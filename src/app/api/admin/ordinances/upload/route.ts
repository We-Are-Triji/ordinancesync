import { NextRequest, NextResponse } from "next/server"
import { Readable } from "node:stream"
import { getBucket } from "@/lib/mongodb"
import { extractPdfText } from "@/lib/pdf-text"
import { extractOrdinanceMetadata, isGeminiConfigured } from "@/lib/gemini"

export const runtime = "nodejs"

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
    // Best-effort: never block the upload if extraction fails.
    let ordinanceNumber = ""
    let title = ""
    let summary = ""
    if (text.trim() && isGeminiConfigured()) {
      try {
        const meta = await extractOrdinanceMetadata(text)
        ordinanceNumber = meta.ordinanceNumber
        title = meta.title
        summary = meta.summary
      } catch (err) {
        console.error("Metadata extraction failed (continuing):", err)
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
    })
  } catch (err) {
    console.error("Upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
