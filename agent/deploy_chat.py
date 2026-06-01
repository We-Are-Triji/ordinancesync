"""
Deploy the OrdinanceSync public chat agent to Vertex AI Agent Engine.

Run from inside agent/ after setting the same env vars as deploy.py:
  GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, STAGING_BUCKET,
  MDB_MCP_CONNECTION_STRING

  python deploy_chat.py
"""

import os
from pathlib import Path


def _load_env(path: Path) -> None:
    """Minimal .env loader so `python deploy_chat.py` has the same vars that
    `adk web` would auto-load. Does not override already-set env vars."""
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if key and key not in os.environ:
            os.environ[key] = value


# Load the agent package's .env before importing the agent (it reads the
# connection string at import time).
_load_env(Path(__file__).parent / "chat_agent" / ".env")

import vertexai
from vertexai import agent_engines
from vertexai.preview import reasoning_engines

from chat_agent.agent import root_agent

PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-southeast1")
STAGING_BUCKET = os.environ["STAGING_BUCKET"]

vertexai.init(project=PROJECT, location=LOCATION, staging_bucket=STAGING_BUCKET)

app = reasoning_engines.AdkApp(agent=root_agent, enable_tracing=True)

remote_app = agent_engines.create(
    app,
    requirements=[
        "google-cloud-aiplatform[adk,agent_engines]",
        "mcp",
    ],
    display_name="ordinancesync-chat-agent",
)

print("Deployed CHAT Agent Engine resource name:")
print(remote_app.resource_name)
print(
    "\nSet CHAT_AGENT_ENGINE_ID in your .env.local to the trailing numeric ID "
    "(the part after 'reasoningEngines/')."
)
