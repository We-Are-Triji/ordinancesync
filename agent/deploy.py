"""
Deploy the OrdinanceSync NOTIFICATION (dispatch) agent to Vertex AI Agent
Engine.

This UPSERTS: the first run creates the engine; every later run updates it in
place, keeping the SAME engine id. So AGENT_ENGINE_ID only needs to be set once.

Prerequisites (see agent/README.md):
  - Vertex AI API enabled, `gcloud auth application-default login` done
  - A Cloud Storage staging bucket
  - env vars: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, STAGING_BUCKET,
    MDB_MCP_CONNECTION_STRING  (loaded from ordinancesync_agent/.env below)

Run from inside agent/:
  python deploy.py
"""

import os
from pathlib import Path


def _load_env(path: Path) -> None:
    """Minimal .env loader so `python deploy.py` has the same vars that
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
_load_env(Path(__file__).parent / "ordinancesync_agent" / ".env")

from deploy_common import deploy
from ordinancesync_agent.agent import root_agent

if __name__ == "__main__":
    deploy(
        root_agent,
        display_name="ordinancesync-agent",
        env_id_var="AGENT_ENGINE_ID",
    )
