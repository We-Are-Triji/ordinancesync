"""
OrdinanceSync notification agent.

A Gemini-powered ADK agent that uses the MongoDB MCP server (read-only) to
inspect the Cebu City LGU offices directory and decide which offices are
affected by an uploaded ordinance, then drafts a localized Cebuano compliance
checklist for each affected office.

This is the "partner MCP integration" required by the hackathon: the agent's
database superpowers come entirely from the MongoDB MCP server.
"""

import os

from google.adk.agents import Agent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

# Connection string for the OrdinanceSync Atlas cluster. Set this in the
# deployment environment (NOT committed). Point it at the `ordinance_sync` db.
MONGODB_CONNECTION_STRING = os.environ["MDB_MCP_CONNECTION_STRING"]

INSTRUCTION = """
You are the OrdinanceSync compliance assistant for the Cebu City local
government. You receive a city ordinance (as a PDF) and must determine which
local offices are affected, then draft a notification for each.

Use the MongoDB tools to read the "offices" collection in the "ordinance_sync"
database. Each office document has: _id, name, email, category.

Steps:
1. Read the full ordinance text from the attached PDF.
2. Use the MongoDB `find` tool to list all offices in the directory.
3. Decide which offices are genuinely affected by this ordinance based on
   their name and mandate (e.g. CCENRO for environmental matters, CCTO for
   traffic/transport, PROBE, and relevant Barangay Captains).
4. For each affected office, draft a short, clear compliance checklist written
   in Cebuano (Bisaya), listing the concrete actions that office must take.

Respond with ONLY a JSON array. Each element must have exactly these keys:
- officeId: the office document _id as a string
- officeName: the office name
- email: the office email
- subject: a concise email subject line (may be in English)
- message: the Cebuano compliance checklist (plain text)

Do not include any prose outside the JSON array.
"""

root_agent = Agent(
    model="gemini-flash-latest",
    name="ordinancesync_agent",
    instruction=INSTRUCTION,
    tools=[
        McpToolset(
            connection_params=StdioConnectionParams(
                server_params=StdioServerParameters(
                    command="npx",
                    args=[
                        "-y",
                        "mongodb-mcp-server",
                        "--readOnly",
                    ],
                    env={
                        "MDB_MCP_CONNECTION_STRING": MONGODB_CONNECTION_STRING,
                    },
                ),
                timeout=60,
            ),
        )
    ],
)
