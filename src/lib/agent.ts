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
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1"
const AGENT_ENGINE_ID = process.env.AGENT_ENGINE_ID

export function isAgentConfigured(): boolean {
  return Boolean(PROJECT && AGENT_ENGINE_ID)
}

export interface AnalyzeInput {
  ordinanceNumber: string
  ordinanceTitle: string
  pdfBase64: string
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
 * Calls the deployed Agent Engine reasoning engine via its REST `:query`
 * endpoint. Auth uses application default credentials (service account).
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
  const token = await tokenClient.getAccessToken()

  const endpoint =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `reasoningEngines/${AGENT_ENGINE_ID}:query`

  const instruction =
    `Analyze the attached Cebu City ordinance "${input.ordinanceNumber} - ` +
    `${input.ordinanceTitle}". Use the MongoDB tools to read the "offices" ` +
    `collection. Determine which offices are affected by this ordinance. ` +
    `For each affected office, draft a short, localized Cebuano compliance ` +
    `checklist. Respond ONLY with a JSON array where each item has: ` +
    `officeId, officeName, email, subject, message.`

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        instruction,
        pdf_base64: input.pdfBase64,
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Agent query failed (${res.status}): ${detail.slice(0, 300)}`)
  }

  const payload = await res.json()

  // Agent Engine wraps the agent's return value under `output`. The agent is
  // expected to return either a JSON array or an object with a `drafts` key.
  const output = payload.output ?? payload
  let parsed: unknown = output

  if (typeof output === "string") {
    try {
      parsed = JSON.parse(output)
    } catch {
      // Sometimes the model wraps JSON in markdown fences; strip and retry.
      const match = output.match(/\[[\s\S]*\]/)
      parsed = match ? JSON.parse(match[0]) : []
    }
  }

  const draftsArray =
    parsed && typeof parsed === "object" && "drafts" in parsed
      ? (parsed as { drafts: unknown }).drafts
      : parsed

  return { drafts: normalizeDrafts(draftsArray) }
}
