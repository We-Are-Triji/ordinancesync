"""
Deploy the OrdinanceSync PUBLIC CHAT agent to Vertex AI Agent Engine.

This UPSERTS: the first run creates the engine; every later run updates it in
place, keeping the SAME engine id. So CHAT_AGENT_ENGINE_ID only needs to be set
once.

Run from inside agent/:
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

from deploy_common import deploy
from chat_agent.agent import root_agent

if __name__ == "__main__":
    deploy(
        root_agent,
        display_name="ordinancesync-chat-agent",
        env_id_var="CHAT_AGENT_ENGINE_ID",
    )
