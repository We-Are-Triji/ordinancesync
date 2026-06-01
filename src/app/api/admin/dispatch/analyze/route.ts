import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/mongodb"
import { getOrdinance } from "@/lib/ordinances"
import { analyzeOrdinance, isAgentConfigured } from "@/lib/agent"

export const runtime = "nodejs"

async function loadPdfBase64(fileId: string): Promise<string | null> {
  if (!ObjectId.isValid(fileId)) return null
  const bucket = await getBucket()
  const _id = new ObjectId(fileId)

  const files = await bucket.find({ _id }).toArray()
  if (files.length === 0) return null

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    bucket
      .openDownloadStream(_id)
      .on("data", (c: Buffer) => chunks.push(c))
      .on("end", () => resolve())
      .on("error", reject)
  })

  return Buffer.concat(chunks).toString("base64")
}

export async function POST(request: NextRequest) {
  if (!isAgentConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI agent is not configured yet. Deploy the Vertex AI Agent Engine agent and set GOOGLE_CLOUD_PROJECT and AGENT_ENGINE_ID.",
      },
      { status: 503 }
    )
  }

  try {
    const { ordinanceId } = await request.json()
    if (!ordinanceId) {
      return NextResponse.json(
        { error: "ordinanceId is required" },
        { status: 400 }
      )
    }

    const ordinance = await getOrdinance(ordinanceId)
    if (!ordinance) {
      return NextResponse.json({ error: "Ordinance not found" }, { status: 404 })
    }

    const pdfBase64 = await loadPdfBase64(ordinance.fileId)
    if (!pdfBase64) {
      return NextResponse.json(
        { error: "Ordinance PDF file not found" },
        { status: 404 }
      )
    }

    const { drafts } = await analyzeOrdinance({
      ordinanceNumber: ordinance.ordinanceNumber,
      ordinanceTitle: ordinance.title,
      pdfBase64,
    })

    return NextResponse.json({
      ordinanceId: ordinance._id,
      ordinanceNumber: ordinance.ordinanceNumber,
      ordinanceTitle: ordinance.title,
      drafts,
    })
  } catch (err) {
    console.error("Analyze failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    )
  }
}
