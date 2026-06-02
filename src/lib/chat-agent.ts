import { getGoogleAccessToken } from "./google-auth"

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

const getToken = getGoogleAccessToken

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

export interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

export interface ChatQueryInput {
  userId: string
  sessionId: string
  message: string
  groundingContext: string
  validNumbers: Set<string>
  history?: ChatTurn[]
}

/**
 * Sends a message to the chat agent within a session and returns the final
 * text answer (Markdown).
 *
 * Defense in depth against hallucination:
 * 1. We prepend authoritative grounding context (the real ordinances pulled
 *    from MongoDB by OUR backend) to the message, so the model has the facts
 *    in-context and is told to use ONLY these.
 * 2. After the model responds, we VALIDATE every ordinance number it cited
 *    against the real DB whitelist. Any answer citing a non-existent ordinance
 *    is rejected and replaced with a safe fallback.
 *
 * Conversation memory: recent prior turns are included so follow-up questions
 * ("what about the penalties?") resolve against earlier context. The ADK
 * session id is also reused for server-side state.
 */
export async function queryChatAgent(input: ChatQueryInput): Promise<string> {
  if (!isChatAgentConfigured()) {
    throw new Error(
      "Chat agent not configured. Set GOOGLE_CLOUD_PROJECT and CHAT_AGENT_ENGINE_ID."
    )
  }

  // Build a short recent-history block so follow-ups have context.
  let historyBlock = ""
  if (input.history && input.history.length > 0) {
    const recent = input.history.slice(-6) // last 3 exchanges
    historyBlock =
      "=== RECENT CONVERSATION (for context on follow-up questions) ===\n" +
      recent
        .map(
          (t) =>
            `${t.role === "user" ? "User" : "Assistant"}: ${t.content.slice(0, 800)}`
        )
        .join("\n") +
      "\n\n"
  }

  const wrappedMessage =
    `${input.groundingContext}\n\n` +
    historyBlock +
    `=== CURRENT USER QUESTION ===\n${input.message}\n\n` +
    `Answer the user's current question using ONLY the ordinances listed in ` +
    `the AUTHORITATIVE ORDINANCE DATA above. Do NOT call any tools or write ` +
    `code — everything you need is already provided above. Use the recent ` +
    `conversation only to understand follow-up references (like "it" or "that ` +
    `ordinance"). If the answer is not in the authoritative data, say no ` +
    `matching ordinance is on file. Never mention any ordinance not in that list.`

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
        message: wrappedMessage,
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

  const answer = extractFinalText(raw)

  // Final deterministic guard: reject any answer that cites an ordinance number
  // not present in the real database.
  return enforceWhitelist(answer, input.validNumbers)
}

// Sentinel returned when the answer must not be trusted or was empty. The
// route uses this to avoid caching non-answers.
export const FALLBACK_PREFIX = "__FALLBACK__"

export function isFallbackAnswer(answer: string): boolean {
  return answer.startsWith(FALLBACK_PREFIX)
}

export function stripFallbackMarker(answer: string): string {
  return answer.startsWith(FALLBACK_PREFIX)
    ? answer.slice(FALLBACK_PREFIX.length)
    : answer
}

/**
 * Scans the answer for ordinance-number references and verifies each one
 * exists in the DB whitelist. If the answer cites any number that isn't real,
 * the whole answer is replaced (we cannot trust a hallucinated response).
 *
 * Matches patterns like "Ordinance No. 2244", "Ordinance No. 2235",
 * "ORD-2026-14", "Ordinance Number 14", etc.
 */
export function enforceWhitelist(
  answer: string,
  validNumbers: Set<string>
): string {
  if (!answer.trim()) {
    return (
      FALLBACK_PREFIX +
      "I couldn't generate an answer just now. Please try asking again."
    )
  }

  const cited = extractCitedOrdinanceNumbers(answer)

  for (const c of cited) {
    if (!isCitedNumberValid(c, validNumbers)) {
      // The model invented an ordinance. Do not return its content.
      return (
        FALLBACK_PREFIX +
        "I can only share ordinances that are officially on file, and I " +
        "couldn't find a matching one for that question. Please try a " +
        "different topic or check back later as more ordinances are added."
      )
    }
  }

  return answer
}

/**
 * Extracts candidate ordinance identifiers cited in the answer text.
 */
function extractCitedOrdinanceNumbers(text: string): string[] {
  const results = new Set<string>()

  // "Ordinance No. 2244", "Ordinance Number 2235", "Ordinance 1234"
  const reNo = /ordinance\s*(?:no\.?|number|num\.?|#)?\s*([0-9][0-9-]*)/gi
  let m: RegExpExecArray | null
  while ((m = reNo.exec(text)) !== null) {
    results.add(m[1].trim())
  }

  // Coded forms like "ORD-2026-14"
  const reCode = /\bORD[-\s]?[0-9][0-9-]*\b/gi
  while ((m = reCode.exec(text)) !== null) {
    results.add(m[0].trim())
  }

  return [...results]
}

/**
 * Checks whether a cited number matches any valid DB ordinance number.
 * Comparison is lenient: it strips non-alphanumerics so "ORD-2026-14",
 * "ord 2026 14", and "2026-14" all compare equal to the stored value.
 */
function isCitedNumberValid(cited: string, validNumbers: Set<string>): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
  const c = normalize(cited)
  if (!c) return true // nothing meaningful to validate

  for (const valid of validNumbers) {
    const v = normalize(valid)
    // Match if the cited token is contained in or contains a real number.
    if (v === c || v.endsWith(c) || c.endsWith(v) || v.includes(c)) {
      return true
    }
  }
  return false
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
