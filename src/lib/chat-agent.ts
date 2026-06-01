import { GoogleAuth } from "google-auth-library"

/**
 * Bridges the Next.js backend to the public chat agent on Vertex AI Agent
 * Engine. The agent uses the MongoDB MCP server (read-only) to search the
 * `ordinances` collection and answers strictly from stored ordinance text.
 *
 * Sessions give the agent short-term memory so follow-up questions
 * ("what about the penalties?") keep context.
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "asia-southeast1"
const CHAT_AGENT_ENGINE_ID = process.env.CHAT_AGENT_ENGINE_ID

export function isChatAgentConfigured(): boolean {
  return Boolean(PROJECT && CHAT_AGENT_ENGINE_ID)
}

function engineBase(): string {
  return (
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `reasoningEngines/${CHAT_AGENT_ENGINE_ID}`
  )
}

async function getToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  })
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error("Failed to obtain Google access token.")
  return token
}

/**
 * Creates an Agent Engine session for a user, returning the session id.
 * ADK sessions are scoped by an arbitrary userId we supply.
 */
export async function createChatSession(userId: string): Promise<string> {
  const token = await getToken()
  const res = await fetch(`${engineBase()}:query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      class_method: "create_session",
      input: { user_id: userId },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Create session failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const sessionId =
    data?.output?.id ?? data?.output?.session_id ?? data?.id ?? ""
  if (!sessionId) throw new Error("Agent did not return a session id.")
  return sessionId
}

export interface ChatQueryInput {
  userId: string
  sessionId: string
  message: string
}

/**
 * Sends a message to the chat agent within a session and returns the final
 * text answer (Markdown). Uses the non-streaming `:query` with `stream_query`
 * semantics collapsed server-side for simplicity.
 */
export async function queryChatAgent(input: ChatQueryInput): Promise<string> {
  if (!isChatAgentConfigured()) {
    throw new Error(
      "Chat agent not configured. Set GOOGLE_CLOUD_PROJECT and CHAT_AGENT_ENGINE_ID."
    )
  }

  const token = await getToken()
  const res = await fetch(`${engineBase()}:streamQuery?alt=sse`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      class_method: "async_stream_query",
      input: {
        user_id: input.userId,
        session_id: input.sessionId,
        message: input.message,
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Chat query failed (${res.status}): ${detail.slice(0, 200)}`)
  }

  // streamQuery returns SSE/NDJSON events. We accumulate text parts from the
  // model content. Each event may carry `content.parts[].text`.
  const raw = await res.text()

  // Surface backend errors (e.g. bad model) instead of returning empty text.
  const errMatch = raw.match(/"code":\s*\d+,\s*"message":\s*"([^"]+)"/)
  if (errMatch && raw.includes('"code"') && !raw.includes('"content"')) {
    throw new Error(`Agent error: ${errMatch[1].slice(0, 200)}`)
  }

  return extractFinalText(raw)
}

function extractFinalText(raw: string): string {
  const texts: string[] = []

  // Events arrive as SSE ("data: {...}") and/or NDJSON. Also handle a single
  // concatenated JSON stream by splitting on newlines.
  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^data:\s*/, "").trim())
    .filter(Boolean)

  for (const line of lines) {
    try {
      const event = JSON.parse(line)
      const parts =
        event?.content?.parts ??
        event?.output?.content?.parts ??
        event?.actions?.content?.parts ??
        []
      for (const p of parts) {
        if (typeof p?.text === "string") texts.push(p.text)
      }
    } catch {
      // Not a standalone JSON line; skip.
    }
  }

  return texts.join("").trim()
}
