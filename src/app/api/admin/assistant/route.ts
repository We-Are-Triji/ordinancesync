import { NextRequest, NextResponse } from "next/server"
import { runAdminQuery, isAdminAgentConfigured } from "@/lib/admin-agent"

export const runtime = "nodejs"
// The agentic loop makes several Gemini calls + MCP tool calls; allow time.
export const maxDuration = 60

const MAX_QUESTION_LENGTH = 500

export async function POST(request: NextRequest) {
  if (!isAdminAgentConfigured()) {
    return NextResponse.json(
      {
        error:
          "Admin assistant is not configured. Set GOOGLE_CLOUD_PROJECT and MONGODB_URI.",
      },
      { status: 503 }
    )
  }

  try {
    const { question } = await request.json()

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json({ error: "Question is too long." }, { status: 413 })
    }

    const { answer, trace } = await runAdminQuery(question.trim())
    return NextResponse.json({ answer, trace })
  } catch (err) {
    console.error("Admin assistant failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Assistant failed." },
      { status: 500 }
    )
  }
}
