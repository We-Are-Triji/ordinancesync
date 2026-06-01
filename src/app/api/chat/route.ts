import { NextRequest, NextResponse } from "next/server"
import {
  createChatSession,
  queryChatAgent,
  isChatAgentConfigured,
  isFallbackAnswer,
  stripFallbackMarker,
} from "@/lib/chat-agent"
import {
  getOrdinanceContext,
  getValidOrdinanceNumbers,
  getDatasetVersion,
} from "@/lib/ordinances"
import { findCachedAnswer, storeAnswer } from "@/lib/semantic-cache"

export const runtime = "nodejs"

// NOTE: This endpoint is intentionally public so citizens can use the chat
// without signing in. Before production, add per-IP rate limiting.

const MAX_MESSAGE_LENGTH = 1000

function buildGroundingContext(
  ordinances: Awaited<ReturnType<typeof getOrdinanceContext>>
): string {
  if (ordinances.length === 0) {
    return (
      "=== AUTHORITATIVE ORDINANCE DATA ===\n" +
      "There are currently NO ordinances on file in the database. " +
      "Tell the user there are no ordinances available yet."
    )
  }

  // Include a bounded slice of full text so the agent can answer from context
  // directly — no live tool call needed (faster, and avoids the tool-call bug).
  const blocks = ordinances.map((o, i) => {
    const parts = [
      `[${i + 1}] Ordinance Number: ${o.ordinanceNumber}`,
      `Title: ${o.title}`,
      `Status: ${o.status}`,
    ]
    if (o.summary) parts.push(`Summary: ${o.summary}`)
    if (o.text) parts.push(`Full text (may be truncated):\n${o.text}`)
    return parts.join("\n")
  })

  return (
    "=== AUTHORITATIVE ORDINANCE DATA (the ONLY ordinances that exist) ===\n" +
    `There are exactly ${ordinances.length} ordinance(s) on file. You may ONLY ` +
    "reference these ordinance numbers. Any ordinance not listed here DOES NOT " +
    "EXIST. Answer using ONLY the information below — do not call any tools.\n\n" +
    blocks.join("\n\n")
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
    const { message, sessionId, userId, history } = await request.json()

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 413 })
    }

    const trimmed = message.trim()
    const uid = typeof userId === "string" && userId ? userId : "anon"

    // Sanitize incoming history (only role+content, capped).
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (t: { role?: string; content?: string }) =>
              t &&
              (t.role === "user" || t.role === "assistant") &&
              typeof t.content === "string"
          )
          .slice(-6)
          .map((t: { role: "user" | "assistant"; content: string }) => ({
            role: t.role,
            content: t.content.slice(0, 1500),
          }))
      : []

    const [ordinances, validNumbers, datasetVersion] = await Promise.all([
      getOrdinanceContext(),
      getValidOrdinanceNumbers(),
      getDatasetVersion(),
    ])

    // --- Semantic cache check ---
    // Only safe to serve a cached answer when there is NO active session
    // (i.e. a fresh/standalone question). Within a session, follow-ups depend
    // on conversation context, so we always compute fresh there.
    const cacheable = !sessionId
    let cachedEmbedding: number[] | null = null

    if (cacheable) {
      const hit = await findCachedAnswer(trimmed, datasetVersion)
      if (hit) {
        cachedEmbedding = hit.embedding
        if (hit.answer) {
          return NextResponse.json({
            answer: hit.answer,
            sessionId: null,
            cached: true,
          })
        }
      }
    }

    const groundingContext = buildGroundingContext(ordinances)
    const activeSession = sessionId || (await createChatSession(uid))

    const answer = await queryChatAgent({
      userId: uid,
      sessionId: activeSession,
      message: trimmed,
      groundingContext,
      validNumbers,
      history: safeHistory,
    })

    const isFallback = isFallbackAnswer(answer)
    const cleanAnswer = stripFallbackMarker(answer)

    // Cache standalone (non-follow-up) answers for reuse — but never cache
    // fallback/non-answers, so a transient miss doesn't get pinned.
    if (cacheable && !isFallback) {
      storeAnswer(trimmed, cachedEmbedding, cleanAnswer, datasetVersion)
    }

    return NextResponse.json({ answer: cleanAnswer, sessionId: activeSession })
  } catch (err) {
    console.error("Chat request failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat request failed" },
      { status: 500 }
    )
  }
}
