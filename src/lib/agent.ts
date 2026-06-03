import { getGoogleAccessToken } from "./google-auth"
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

export interface AnalyzeOffice {
  _id: string
  name: string
  email: string
  category?: string
  acronym?: string
  description?: string
}

export interface AnalyzeInput {
  ordinanceNumber: string
  ordinanceTitle: string
  // Prefer pre-extracted text (cheap, already parsed at upload). Fall back to
  // the PDF only when text isn't available.
  ordinanceText?: string
  pdfBase64?: string
  // The full offices directory, fetched by the backend and injected into the
  // prompt. We inject rather than have the agent call MCP because Gemini 2.5
  // intermittently emits a code-style tool call (print(mongo.find(...))) that
  // Agent Engine rejects. Injecting the data makes dispatch reliable.
  offices: AnalyzeOffice[]
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

  const token = await getGoogleAccessToken()

  const base =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `reasoningEngines/${AGENT_ENGINE_ID}`

  const ordinanceBody =
    input.ordinanceText && input.ordinanceText.trim()
      ? `\n\n=== ORDINANCE TEXT ===\n${input.ordinanceText.slice(0, 12000)}`
      : ""

  // Inject the authoritative offices directory directly into the prompt.
  const officesBlock =
    "\n\n=== OFFICES DIRECTORY (the ONLY offices that exist) ===\n" +
    (input.offices.length === 0
      ? "There are no offices on file."
      : input.offices
          .map((o, i) => {
            const parts = [
              `[${i + 1}] officeId: ${o._id}`,
              `name: ${o.name}`,
              o.acronym ? `acronym: ${o.acronym}` : "",
              o.category ? `category: ${o.category}` : "",
              `email: ${o.email}`,
              o.description ? `mandate: ${o.description}` : "",
            ].filter(Boolean)
            return parts.join(" | ")
          })
          .join("\n"))

  const message =
    `You are analyzing a Cebu City ordinance to decide which local offices it ` +
    `affects, then drafting a Cebuano (Bisaya) compliance checklist for each.\n\n` +
    `Use ONLY the offices listed in the OFFICES DIRECTORY below — do NOT call ` +
    `any tools or write code; everything you need is provided. Decide which ` +
    `offices are affected based on their name, acronym, category, and mandate. ` +
    `For each affected office, write a short, clear Cebuano compliance ` +
    `checklist of concrete actions.\n\n` +
    `Respond with ONLY a JSON array where each item has exactly: officeId ` +
    `(copy the exact officeId from the directory), officeName, email, subject ` +
    `(may be English), message (the Cebuano checklist). If no office is ` +
    `affected, respond with an empty array [].\n\n` +
    `Ordinance: "${input.ordinanceNumber} - ${input.ordinanceTitle}"` +
    officesBlock +
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
