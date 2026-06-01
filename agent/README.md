# OrdinanceSync AI Agent (Vertex AI Agent Engine + MongoDB MCP)

This is the Gemini agent that powers the "Approve & Dispatch" feature. It runs
on **Google Cloud Vertex AI Agent Engine** and gets its database superpowers
from the **MongoDB MCP server** — the partner integration required by the
[Rapid Agent hackathon](https://rapid-agent.devpost.com/).

## What it does

1. Receives an ordinance PDF + instruction from the Next.js backend.
2. Uses the MongoDB MCP server (`find`, read-only) to read the `offices`
   directory from the `ordinance_sync` database.
3. Decides which offices the ordinance affects.
4. Drafts a localized Cebuano compliance checklist for each.
5. Returns a JSON array of drafts for the admin to review and dispatch.

## One-time Google Cloud setup

1. **Create / pick a project** at https://console.cloud.google.com and note the
   project ID.
2. **Enable billing** (new accounts get free credit) and **enable the Vertex AI
   API**:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```
3. **Authenticate** for local deploys:
   ```bash
   gcloud auth application-default login
   ```
4. **Create a staging bucket** (Agent Engine needs one):
   ```bash
   gcloud storage buckets create gs://YOUR-PROJECT-ordinancesync-staging --location=us-central1
   ```

## Install + deploy

```bash
cd agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
export STAGING_BUCKET="gs://YOUR-PROJECT-ordinancesync-staging"
# Atlas connection string pointing at the ordinance_sync database:
export MDB_MCP_CONNECTION_STRING="mongodb+srv://USER:PASS@cluster.mongodb.net/ordinance_sync"

python deploy.py
```

`deploy.py` prints a resource name like:

```
projects/123456/locations/us-central1/reasoningEngines/8899776655443322
```

## Wire it into the Next.js app

In the project root `.env.local`, set:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
AGENT_ENGINE_ID=8899776655443322          # the trailing number from the resource name
GOOGLE_APPLICATION_CREDENTIALS=/abs/path/to/service-account-key.json
```

For the Next.js server to call Agent Engine, create a service account with the
**Vertex AI User** role, download its JSON key, and point
`GOOGLE_APPLICATION_CREDENTIALS` at it.

## Test the agent locally before deploying

ADK ships a dev UI:

```bash
adk web
```

Then open the local URL, pick `ordinancesync_agent`, and try a prompt like
"List all offices and tell me which handle environmental issues." If it returns
data, the MCP connection works.

## Security notes

- The MCP server runs in **`--readOnly`** mode: the agent can only read your
  database, never modify it.
- Keep `MDB_MCP_CONNECTION_STRING` and the service account key out of git.
