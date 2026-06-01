import { NextRequest, NextResponse } from "next/server"
import {
  createChatSession,
  queryChatAgent,
  isChatAgentConfigured,
} from "@/lib/chat-agent"
import { getOrdinanceContext, getValidOrdinanceNumbers } from "@/lib/ordinances"

export const runtime = "nodejs"

// NOTE: This endpoint is intentionally public so citizens can use the chat
// without signing in. It is therefore exposed to abuse (cost, spam). Before
// production, add rate limiting (e.g. per-IP) and an input length cap.

const MAX_MESSAGE_LENGTH = 1000

// Builds the authoritative grounding block from the real database. This is the
// ONLY ordinance information the assistant is allowed to use.
function buildGroundingContext(
  ordinances: Awaited<ReturnType<typeof getOrdinanceContext>>
): string {
  if (ordinances.length === 0) {
    return (
      "=== AUTHORITATIVE ORDINANCE DATA ===\n" +
      "There are currently NO ordinances on file in the database. " +
      "You must tell the user there are no ordinances available yet and you " +
      "cannot answer questions about specific ordinances."
    )
  }

  const blocks = ordinances.map((o, i) => {
    const parts = [
      `[${i + 1}] Ordinance Number: ${o.ordinanceNumber}`,
      `Title: ${o.title}`,
      `Office: ${o.office}`,
      `Status: ${o.status}`,
    ]
    if (o.summary) parts.push(`Summary: ${o.summary}`)
    if (o.text) parts.push(`Full text:\n${o.text}`)
    return parts.join("\n")
  })

  return (
    "=== AUTHORITATIVE ORDINANCE DATA (the ONLY ordinances that exist) ===\n" +
    `There are exactly ${ordinances.length} ordinance(s) on file. You may ONLY ` +
    "reference these. Any ordinance not listed here DOES NOT EXIST:\n\n" +
    blocks.join("\n\n---\n\n")
  )
}

export async function POST(request: NextRequest) {
  if (!isChatAgentConfigured()) {
    return NextResponse.json(
      {
        error:
          "The assistant is not available yet. Deploy the chat agent and set CHAT_AGENT_ENGINE_ID.",
      },
      { status: 503 }
    )
  }

  try {
    const { message, sessionId, userId } = await request.json()

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 413 })
    }

    const uid = typeof userId === "string" && userId ? userId : "anon"

    // Pull authoritative data + whitelist from MongoDB (ground truth).
    const [ordinances, validNumbers] = await Promise.all([
      getOrdinanceContext(),
      getValidOrdinanceNumbers(),
    ])

    const groundingContext = buildGroundingContext(ordinances)

    const activeSession = sessionId || (await createChatSession(uid))

    const answer = await queryChatAgent({
      userId: uid,
      sessionId: activeSession,
      message: message.trim(),
      groundingContext,
      validNumbers,
    })

    return NextResponse.json({ answer, sessionId: activeSession })
  } catch (err) {
    console.error("Chat request failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat request failed" },
      { status: 500 }
    )
  }
}
