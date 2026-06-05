import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

/**
 * Connects the Next.js backend to the MongoDB MCP server as an MCP client.
 *
 * This is the genuine partner-MCP integration: we spawn `mongodb-mcp-server`
 * (read-only) and expose its tools (find, aggregate, count, list-collections,
 * etc.) to Gemini via function-calling. We drive the call loop ourselves in
 * the backend, which avoids the Vertex Agent Engine tool-call bug while keeping
 * real MCP usage.
 */

const MONGO_URI = process.env.MONGODB_URI

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface McpConnection {
  listTools: () => Promise<McpTool[]>
  callTool: (name: string, args: Record<string, unknown>) => Promise<string>
  close: () => Promise<void>
}

/**
 * Opens a fresh MCP connection. The caller MUST call close() when done — each
 * connection spawns a child process. Read-only mode is enforced so the agent
 * can never modify the database.
 */
export async function openMcpConnection(): Promise<McpConnection> {
  if (!MONGO_URI) {
    throw new Error("Missing MONGODB_URI for MCP connection.")
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "mongodb-mcp-server", "--readOnly"],
    env: { ...process.env, MDB_MCP_CONNECTION_STRING: MONGO_URI },
  })

  const client = new Client({
    name: "ordinancesync-admin-console",
    version: "1.0.0",
  })

  await client.connect(transport)

  return {
    async listTools() {
      const res = await client.listTools()
      return res.tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
      }))
    },

    async callTool(name, args) {
      const res = await client.callTool({ name, arguments: args })
      const content = (res.content ?? []) as Array<{
        type: string
        text?: string
      }>
      return content
        .filter((c) => c.type === "text" && typeof c.text === "string")
        .map((c) => c.text)
        .join("\n")
    },

    async close() {
      await client.close()
    },
  }
}
