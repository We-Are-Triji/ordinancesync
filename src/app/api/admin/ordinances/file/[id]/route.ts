import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid file id" }, { status: 400 })
  }

  try {
    const bucket = await getBucket()
    const _id = new ObjectId(id)

    const files = await bucket.find({ _id }).toArray()
    if (files.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const downloadStream = bucket.openDownloadStream(_id)
    const stream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk))
        downloadStream.on("end", () => controller.close())
        downloadStream.on("error", (err) => controller.error(err))
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(files[0].length),
        "Content-Disposition": `inline; filename="${files[0].filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("File stream failed:", err)
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 })
  }
}
