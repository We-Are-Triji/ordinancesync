import { getGoogleAccessToken } from "./google-auth"
import { openMcpConnection, type McpTool } from "./mcp-client"

/**
 * Smart Admin Console agent.
 *
 * Runs a multi-step Gemini function-calling loop in the backend where the
 * tools are the REAL MongoDB MCP server's read-only tools. The model plans,
 * calls tools, reads results, and answers — and we return a trace of every
 * step so the UI can show the agent's reasoning.
 *
 * This is the partner-MCP showcase: genuine live MCP tool calls, controlled in
 * our backend (which avoids the Agent Engine code-emission tool-call bug).
 */

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION ?? "asia-southeast1"
const MODEL = "gemini-2.5-flash"
const MAX_STEPS = 6 // safety cap on tool-call rounds

export function isAdminAgentConfigured(): boolean {
  return Boolean(PROJECT && process.env.MONGODB_URI)
}

export type TraceStep =
  | { kind: "tool_call"; tool: string; args: Record<string, unknown> }
  | { kind: "tool_result"; tool: string; preview: string }
  | { kind: "answer"; text: string }
  | { kind: "error"; message: string }

export interface AdminAgentResult {
  answer: string
  trace: TraceStep[]
}

const SYSTEM_INSTRUCTION = `You are the OrdinanceSync Admin Assistant for the Cebu City LGU.
You help administrators inspect and reason about their data by querying MongoDB
through the provided tools.

The database is "ordinance_sync" with these collections:
- ordinances: ordinanceNumber, title, status, summary, text, pageCount, createdAt, dispatchAnalysis
- offices: name, email, category, acronym, description
- dispatches: ordinanceId, ordinanceNumber, items[] (each: officeName, email, status, error, sentAt), createdAt

Rules:
- Use the tools to READ data and answer the admin's question with real numbers and facts.
- The tools are READ-ONLY. You cannot modify data; never claim you did.
- Always base answers on tool results from THIS turn — never invent records.
- When listing/counting, query precisely (use filters, count, aggregate).
- Be concise. Use short Markdown: a bold summary line then bullets.
- If a question is not about the admin's ordinance/office/dispatch data, say so briefly.`

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}
interface GeminiContent {
  role: string
  parts: GeminiPart[]
}

// Gemini function declarations require a cleaned JSON schema (a subset of
// JSON-Schema). MCP tool schemas are close; we strip unsupported keys.
function toGeminiSchema(schema: unknown): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== "object") return undefined
  const s = schema as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const allowed = ["type", "description", "enum", "items", "properties", "required"]
  for (const key of allowed) {
    if (!(key in s)) continue
    if (key === "properties" && s.properties && typeof s.properties === "object") {
      const props: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(s.properties as Record<string, unknown>)) {
        const cleaned = toGeminiSchema(v)
        if (cleaned) props[k] = cleaned
      }
      out.properties = props
    } else if (key === "items") {
      const cleaned = toGeminiSchema(s.items)
      if (cleaned) out.items = cleaned
    } else {
      out[key] = s[key]
    }
  }
  if (!out.type) out.type = "object"
  return out
}

function buildFunctionDeclarations(tools: McpTool[]) {
  return tools.map((t) => {
    const params = toGeminiSchema(t.inputSchema) ?? { type: "object", properties: {} }
    // Gemini rejects empty object schemas without properties; ensure shape.
    if (params.type === "object" && !params.properties) {
      params.properties = {}
    }
    return {
      name: t.name,
      description: t.description.slice(0, 1000),
      parameters: params,
    }
  })
}

async function callGemini(
  contents: GeminiContent[],
  functionDeclarations: ReturnType<typeof buildFunctionDeclarations>
): Promise<GeminiContent> {
  const token = await getGoogleAccessToken()
  const endpoint =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/` +
    `projects/${PROJECT}/locations/${LOCATION}/` +
    `publishers/google/models/${MODEL}:generateContent`

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      tools: [{ functionDeclarations }],
      generationConfig: { temperature: 0 },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Gemini call failed (${res.status}): ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  const candidate = data?.candidates?.[0]
  const parts: GeminiPart[] = candidate?.content?.parts ?? []
  return { role: "model", parts }
}

/**
 * Runs the agentic loop for one admin query. Opens an MCP connection, lets
 * Gemini call tools until it produces a final text answer (or hits the step
 * cap), and returns the answer plus the full trace.
 */
export async function runAdminQuery(question: string): Promise<AdminAgentResult> {
  if (!isAdminAgentConfigured()) {
    throw new Error("Admin agent not configured (GOOGLE_CLOUD_PROJECT, MONGODB_URI).")
  }

  const trace: TraceStep[] = []
  const mcp = await openMcpConnection()

  try {
    const tools = await mcp.listTools()
    const functionDeclarations = buildFunctionDeclarations(tools)

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: question }] },
    ]

    for (let step = 0; step < MAX_STEPS; step++) {
      const modelTurn = await callGemini(contents, functionDeclarations)
      contents.push(modelTurn)

      const calls = modelTurn.parts.filter((p) => p.functionCall)
      const textParts = modelTurn.parts
        .filter((p) => typeof p.text === "string")
        .map((p) => p.text as string)

      // No tool calls => the model produced its final answer.
      if (calls.length === 0) {
        const answer = textParts.join("").trim()
        trace.push({ kind: "answer", text: answer })
        return { answer, trace }
      }

      // Execute each requested tool call and feed results back.
      const responseParts: GeminiPart[] = []
      for (const part of calls) {
        const fc = part.functionCall!
        trace.push({ kind: "tool_call", tool: fc.name, args: fc.args ?? {} })
        let resultText = ""
        try {
          resultText = await mcp.callTool(fc.name, fc.args ?? {})
        } catch (err) {
          resultText = `Tool error: ${err instanceof Error ? err.message : "unknown"}`
        }
        trace.push({
          kind: "tool_result",
          tool: fc.name,
          preview: resultText.slice(0, 400),
        })
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: resultText.slice(0, 12000) },
          },
        })
      }
      contents.push({ role: "user", parts: responseParts })
    }

    // Hit the step cap without a final answer.
    const fallback =
      "I gathered some data but couldn't finish reasoning within the step limit. Try a more specific question."
    trace.push({ kind: "answer", text: fallback })
    return { answer: fallback, trace }
  } finally {
    await mcp.close()
  }
}
