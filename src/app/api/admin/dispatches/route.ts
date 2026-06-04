import { NextRequest, NextResponse } from "next/server"
import { getLatestDispatchForOrdinance } from "@/lib/dispatches"

export const runtime = "nodejs"

/**
 * Read-only dispatch history endpoint.
 *
 * Today the policy detail modal only needs the most recent dispatch for one
 * ordinance, so this route accepts:
 *   - ordinanceId  (required) — limit to one ordinance
 *   - latest=1     (optional) — return just the freshest dispatch as
 *                                { dispatch: Dispatch | null }
 *
 * If `latest` isn't set we currently return the same shape (a future "full
 * history" feature can extend this without breaking callers).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ordinanceId = searchParams.get("ordinanceId")?.trim()

  if (!ordinanceId) {
    return NextResponse.json(
      { error: "ordinanceId is required" },
      { status: 400 }
    )
  }

  try {
    const dispatch = await getLatestDispatchForOrdinance(ordinanceId)
    return NextResponse.json({ dispatch })
  } catch (err) {
    console.error("Read dispatch history failed:", err)
    return NextResponse.json(
      { error: "Failed to read dispatch history" },
      { status: 500 }
    )
  }
}
