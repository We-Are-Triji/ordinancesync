import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/mongodb"
import {
  getOrdinance,
  getCachedDispatch,
  setCachedDispatch,
} from "@/lib/ordinances"
import { getAllOffices } from "@/lib/offices"
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
    const { ordinanceId, refresh } = await request.json()
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

    const offices = await getAllOffices()

    // Version key = fingerprint of everything the analysis depends on. If the
    // ordinance text or the offices directory changes, the key changes and we
    // re-analyze; otherwise we reuse the cached drafts (no repeat AI call).
    const officesFingerprint = offices
      .map(
        (o) =>
          `${o._id}:${o.name}:${o.email}:${(o as { description?: string }).description ?? ""}`
      )
      .join("|")
    const versionKey = createHash("sha1")
      .update(`${ordinance.text ?? ""}\u0000${ordinance.title}\u0000${officesFingerprint}`)
      .digest("hex")

    // Reuse cached analysis unless the caller forces a refresh.
    if (!refresh) {
      const cached = await getCachedDispatch(ordinanceId)
      if (cached && cached.versionKey === versionKey) {
        return NextResponse.json({
          ordinanceId: ordinance._id,
          ordinanceNumber: ordinance.ordinanceNumber,
          ordinanceTitle: ordinance.title,
          drafts: cached.drafts,
          cached: true,
        })
      }
    }

    // Prefer pre-extracted text (set at upload). Only load and send the heavy
    // PDF bytes when text isn't available — avoids reprocessing large files.
    const ordinanceText = ordinance.text ?? ""
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

    // Inject the offices directory into the prompt (instead of relying on the
    // agent's MCP tool call, which Gemini 2.5 intermittently breaks).
    const { drafts } = await analyzeOrdinance({
      ordinanceNumber: ordinance.ordinanceNumber,
      ordinanceTitle: ordinance.title,
      ordinanceText: ordinanceText || undefined,
      pdfBase64,
      offices: offices.map((o) => ({
        _id: o._id,
        name: o.name,
        email: o.email,
        category: o.category,
        acronym: (o as { acronym?: string }).acronym,
        description: (o as { description?: string }).description,
      })),
    })

    // Cache the result for instant re-dispatch.
    await setCachedDispatch(ordinanceId, drafts, versionKey)

    return NextResponse.json({
      ordinanceId: ordinance._id,
      ordinanceNumber: ordinance.ordinanceNumber,
      ordinanceTitle: ordinance.title,
      drafts,
      cached: false,
    })
  } catch (err) {
    console.error("Analyze failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    )
  }
}
