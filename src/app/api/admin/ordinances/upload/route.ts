import { NextRequest, NextResponse } from "next/server"
import { Readable } from "node:stream"
import { getBucket } from "@/lib/mongodb"

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
      contentType: "application/pdf",
    })

    await new Promise<void>((resolve, reject) => {
      Readable.from(buffer).pipe(uploadStream).on("error", reject).on("finish", resolve)
    })

    return NextResponse.json({
      fileId: uploadStream.id.toString(),
      fileName: file.name,
      fileSize: file.size,
    })
  } catch (err) {
    console.error("Upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
