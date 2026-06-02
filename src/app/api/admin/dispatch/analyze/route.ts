import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/mongodb"
import { getOrdinance } from "@/lib/ordinances"
import { analyzeOrdinance, isAgentConfigured } from "@/lib/agent"

export const runtime = "nodejs"
// Dispatch analysis (Agent Engine + MCP) can take well over 10s. Allow 60s.
export const maxDuration = 60

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

    // Prefer pre-extracted text (set at upload). Only load and send the heavy
    // PDF bytes when text isn't available — avoids reprocessing large files.
    let ordinanceText = ordinance.text ?? ""
    let pdfBase64: string | undefined

    if (!ordinanceText.trim()) {
      const loaded = await loadPdfBase64(ordinance.fileId)
      if (!loaded) {
        return NextResponse.json(
          { error: "Ordinance content not available (no text or PDF)." },
          { status: 404 }
        )
      }
      pdfBase64 = loaded
    }

    const { drafts } = await analyzeOrdinance({
      ordinanceNumber: ordinance.ordinanceNumber,
      ordinanceTitle: ordinance.title,
      ordinanceText: ordinanceText || undefined,
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
