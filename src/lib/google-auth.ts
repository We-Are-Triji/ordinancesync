import { GoogleAuth } from "google-auth-library"

/**
 * Centralized Google Cloud auth for Vertex AI calls.
 *
 * Local dev: relies on GOOGLE_APPLICATION_CREDENTIALS pointing at a key file
 * (or `gcloud auth application-default login`).
 *
 * Serverless (Vercel): there is no key file on disk, so we read the service
 * account JSON from the GOOGLE_CREDENTIALS_JSON env var instead. Set that var
 * in the Vercel project settings to the full contents of the key JSON.
 */

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

let cachedAuth: GoogleAuth | null = null

function buildAuth(): GoogleAuth {
  const inlineJson = process.env.GOOGLE_CREDENTIALS_JSON

  if (inlineJson && inlineJson.trim()) {
    let credentials: Record<string, unknown>
    try {
      // Support either raw JSON or base64-encoded JSON.
      const raw = inlineJson.trim().startsWith("{")
        ? inlineJson
        : Buffer.from(inlineJson, "base64").toString("utf8")
      credentials = JSON.parse(raw)
    } catch {
      throw new Error(
        "GOOGLE_CREDENTIALS_JSON is set but is not valid JSON (or base64 JSON)."
      )
    }
    return new GoogleAuth({ credentials, scopes: SCOPES })
  }

  // Fallback: application default credentials (GOOGLE_APPLICATION_CREDENTIALS
  // file path, or gcloud ADC) — used in local development.
  return new GoogleAuth({ scopes: SCOPES })
}

export function getGoogleAuth(): GoogleAuth {
  if (!cachedAuth) cachedAuth = buildAuth()
  return cachedAuth
}

/**
 * Returns a fresh OAuth access token for Vertex AI REST calls.
 */
export async function getGoogleAccessToken(): Promise<string> {
  const client = await getGoogleAuth().getClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error("Failed to obtain Google access token.")
  return token
}
