import { NextRequest, NextResponse } from "next/server"
import {
  createChatSession,
  queryChatAgent,
  isChatAgentConfigured,
} from "@/lib/chat-agent"

export const runtime = "nodejs"

// NOTE: This endpoint is intentionally public so citizens can use the chat
// without signing in. It is therefore exposed to abuse (cost, spam). Before
// production, add rate limiting (e.g. per-IP) and an input length cap. The
// agent's strict guardrail limits it to ordinance topics, which mitigates
// misuse but does not cap request volume.

const MAX_MESSAGE_LENGTH = 1000

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
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 413 }
      )
    }

    // Stable per-visitor id; the client persists it across the session.
    const uid = typeof userId === "string" && userId ? userId : "anon"

    // Reuse the provided session or create a new one for memory continuity.
    const activeSession = sessionId || (await createChatSession(uid))

    const answer = await queryChatAgent({
      userId: uid,
      sessionId: activeSession,
      message: message.trim(),
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
