"""
Deploy the OrdinanceSync agent to Vertex AI Agent Engine.

Prerequisites (see agent/README.md for full setup):
  - A Google Cloud project with the Vertex AI API enabled
  - `gcloud auth application-default login` completed
  - A Cloud Storage bucket for staging
  - Environment variables set (see below)

Run:
  python deploy.py
"""

import os

import vertexai
from vertexai import agent_engines
from vertexai.preview import reasoning_engines

from agent import root_agent

PROJECT = os.environ["GOOGLE_CLOUD_PROJECT"]
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
STAGING_BUCKET = os.environ["STAGING_BUCKET"]  # e.g. gs://my-bucket

vertexai.init(project=PROJECT, location=LOCATION, staging_bucket=STAGING_BUCKET)

# Wrap the ADK agent for Agent Engine.
app = reasoning_engines.AdkApp(agent=root_agent, enable_tracing=True)

remote_app = agent_engines.create(
    app,
    requirements=[
        "google-cloud-aiplatform[adk,agent_engines]",
        "mcp",
    ],
    display_name="ordinancesync-agent",
)

print("Deployed Agent Engine resource name:")
print(remote_app.resource_name)
print(
    "\nSet AGENT_ENGINE_ID in your .env.local to the trailing numeric ID of "
    "the resource name above (the part after 'reasoningEngines/')."
)
