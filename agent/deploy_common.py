"""
Shared deploy logic for the OrdinanceSync agents.

Key behavior: UPSERT by display name. Agent Engine assigns a new resource ID
only on create(). To keep a STABLE id across deploys (so you set the env var
once and never touch it again), we:

  1. If <ENV_ID_VAR> is set, update THAT engine in place.
  2. Else, look up an existing engine by its display_name and update it.
  3. Else (first deploy), create it once.

Updating in place preserves the same reasoningEngines/<id>, so AGENT_ENGINE_ID
/ CHAT_AGENT_ENGINE_ID never need to change after the first deploy.
"""

import os

import vertexai
from vertexai import agent_engines
from vertexai.preview import reasoning_engines

REQUIREMENTS = [
    "google-cloud-aiplatform[adk,agent_engines]",
    "mcp",
]


def _find_by_display_name(display_name: str):
    """Return the existing engine with this display name, or None."""
    try:
        for engine in agent_engines.list():
            if getattr(engine, "display_name", None) == display_name:
                return engine
    except Exception as exc:  # listing is best-effort
        print(f"(could not list existing engines: {exc})")
    return None


def deploy(root_agent, display_name: str, env_id_var: str) -> None:
    project = os.environ["GOOGLE_CLOUD_PROJECT"]
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-southeast1")
    staging_bucket = os.environ["STAGING_BUCKET"]

    vertexai.init(project=project, location=location, staging_bucket=staging_bucket)

    app = reasoning_engines.AdkApp(agent=root_agent, enable_tracing=True)

    # 1) Explicit id from env wins.
    existing_id = os.environ.get(env_id_var, "").strip()
    target_resource = None

    if existing_id:
        # Accept either a bare id or a full resource name.
        if existing_id.startswith("projects/"):
            target_resource = existing_id
        else:
            target_resource = (
                f"projects/{project}/locations/{location}/"
                f"reasoningEngines/{existing_id}"
            )
        print(f"Updating engine from {env_id_var}: {target_resource}")
    else:
        # 2) Fall back to lookup by display name.
        found = _find_by_display_name(display_name)
        if found is not None:
            target_resource = found.resource_name
            print(f"Found existing '{display_name}': {target_resource}")

    if target_resource:
        remote_app = agent_engines.update(
            resource_name=target_resource,
            agent_engine=app,
            requirements=REQUIREMENTS,
            display_name=display_name,
        )
        action = "Updated"
    else:
        # 3) First-ever deploy.
        print(f"No existing '{display_name}' found — creating a new engine.")
        remote_app = agent_engines.create(
            app,
            requirements=REQUIREMENTS,
            display_name=display_name,
        )
        action = "Created"

    resource_name = remote_app.resource_name
    engine_id = resource_name.rsplit("/", 1)[-1]

    print(f"\n{action} Agent Engine:")
    print(f"  resource: {resource_name}")
    print(f"  id:       {engine_id}")
    print(
        f"\nSet {env_id_var}={engine_id} in your .env.local / Vercel env "
        f"(only needed once — future deploys reuse this id)."
    )
