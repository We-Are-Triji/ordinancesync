/**
 * Centralized client-side error messaging for admin API calls.
 *
 * Admin routes can now reject an authenticated-but-non-admin user with 403
 * (see src/proxy.ts + src/lib/admin-auth.ts). This helper turns any non-OK
 * Response into a clear, user-facing message — with explicit handling for the
 * authorization statuses — so every admin screen reports the same thing
 * instead of a vague "failed to load".
 *
 * Usage:
 *   const res = await fetch("/api/admin/...")
 *   if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to load."))
 */
export async function getApiErrorMessage(
  res: Response,
  fallback = "Something went wrong. Please try again."
): Promise<string> {
  if (res.status === 403) {
    return "You don't have permission to do this. Your account isn't authorized as an admin — contact an administrator if you think this is a mistake."
  }
  if (res.status === 401) {
    return "Your session has expired. Please sign in again."
  }

  // For other errors, prefer the server-provided message when present.
  try {
    const data = await res.json()
    if (data && typeof data.error === "string" && data.error.trim()) {
      return data.error
    }
  } catch {
    // Body wasn't JSON / was empty — fall through to the generic fallback.
  }

  return fallback
}
