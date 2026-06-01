import { GoogleAuth } from "google-auth-library"
import type { DispatchDraft } from "./types"

/**
 * Bridges the Next.js backend to the Gemini agent deployed on Vertex AI Agent
 * Engine. The agent uses the MongoDB MCP server (read-only) to inspect the
 * `offices` directory and decide which offices an ordinance affects, then
 * drafts a localized Cebuano checklist for each.
 *
 * The agent returns a JSON array of drafts. This module sends the ordinance
 * PDF (base64) plus an instruction, then parses the structured response.
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "asia-southeast1"
const AGENT_ENGINE_ID = process.env.AGENT_ENGINE_ID

export function isAgentConfigured(): boolean {
  return Boolean(PROJECT && AGENT_ENGINE_ID)
}

export interface AnalyzeInput {
  ordinanceNumber: string
  ordinanceTitle: string
  // Prefer pre-extracted text (cheap, already parsed at upload). Fall back to
  // the PDF only when text isn't available.
  ordinanceText?: string
  pdfBase64?: string
}

export interface AgentDraftResult {
  drafts: DispatchDraft[]
}

interface AgentRawDraft {
  officeId?: string
  office_id?: string
  officeName?: string
  office_name?: string
  email?: string
  subject?: string
  message?: string
}

function normalizeDrafts(raw: unknown): DispatchDraft[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((d: AgentRawDraft) => ({
      officeId: d.officeId ?? d.office_id ?? "",
      officeName: d.officeName ?? d.office_name ?? "",
      email: d.email ?? "",
      subject: d.subject ?? "",
      message: d.message ?? "",
    }))
    .filter((d) => d.email && d.message)
}

/**
 * Runs the dispatch analysis on the deployed Agent Engine. Uses the same
 * proven flow as the chat agent: create a session, then async_stream_query.
 * The agent reads the offices directory via the MongoDB MCP server and returns
 * a JSON array of per-office notification drafts.
 */
export async function analyzeOrdinance(
  input: AnalyzeInput
): Promise<AgentDraftResult> {
  if (!isAgentConfigured()) {
    throw new Error(
      "Agent not configured. Set GOOGLE_CLOUD_PROJECT and AGENT_ENGINE_ID."
    )
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  })
  const tokenClient = await auth.getClient()
  const tokenObj = await tokenClient.getAccessToken()
  const token = tokenObj.token
  if (!token) throw new Error("Failed to obtain Google access token.")

  const base =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `reasoningEngines/${AGENT_ENGINE_ID}`

  const ordinanceBody =
    input.ordinanceText && input.ordinanceText.trim()
      ? `\n\n=== ORDINANCE TEXT ===\n${input.ordinanceText.slice(0, 12000)}`
      : ""

  const message =
    `Analyze the following Cebu City ordinance "${input.ordinanceNumber} - ` +
    `${input.ordinanceTitle}". Use the MongoDB find tool to read the "offices" ` +
    `collection in the ordinance_sync database. Determine which offices are ` +
    `affected by this ordinance. For each affected office, draft a short, ` +
    `localized Cebuano compliance checklist. Respond ONLY with a JSON array ` +
    `where each item has: officeId, officeName, email, subject, message.` +
    ordinanceBody

  // 1) Create a session.
  const sessRes = await fetch(`${base}:query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      class_method: "create_session",
      input: { user_id: "dispatch" },
    }),
  })
  if (!sessRes.ok) {
    const detail = await sessRes.text().catch(() => "")
    throw new Error(`Create session failed (${sessRes.status}): ${detail.slice(0, 200)}`)
  }
  const sessData = await sessRes.json()
  const sessionId = sessData?.output?.id ?? sessData?.output?.session_id
  if (!sessionId) throw new Error("Dispatch agent did not return a session id.")

  // 2) Stream the query.
  const res = await fetch(`${base}:streamQuery?alt=sse`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      class_method: "async_stream_query",
      input: { user_id: "dispatch", session_id: sessionId, message },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Agent query failed (${res.status}): ${detail.slice(0, 300)}`)
  }

  const raw = await res.text()

  // Surface backend errors (bad model, tool errors) clearly.
  if (raw.includes('"error_code"') || (raw.includes('"code"') && !raw.includes('"content"'))) {
    const m = raw.match(/"(?:error_message|message)":\s*"([^"]+)"/)
    throw new Error(`Dispatch agent error: ${(m?.[1] ?? raw).slice(0, 200)}`)
  }

  // Accumulate text from SSE/NDJSON events.
  const texts: string[] = []
  for (const line of raw.split("\n").map((l) => l.replace(/^data:\s*/, "").trim()).filter(Boolean)) {
    try {
      const event = JSON.parse(line)
      const parts =
        event?.content?.parts ?? event?.output?.content?.parts ?? []
      for (const p of parts) if (typeof p?.text === "string") texts.push(p.text)
    } catch {
      // skip non-JSON lines
    }
  }

  const combined = texts.join("").trim()
  let parsed: unknown = []
  try {
    parsed = JSON.parse(combined)
  } catch {
    const match = combined.match(/\[[\s\S]*\]/)
    parsed = match ? JSON.parse(match[0]) : []
  }

  const draftsArray =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) && "drafts" in parsed
      ? (parsed as { drafts: unknown }).drafts
      : parsed

  return { drafts: normalizeDrafts(draftsArray) }
}
