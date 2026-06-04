import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export const runtime = "nodejs"
// Resend can take a few seconds when proving the sender domain; allow time.
export const maxDuration = 30

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sends a one-off "config check" email so an admin can verify the Resend
 * integration end-to-end without having to fabricate a fake ordinance and
 * dispatch flow. Returns 503 if the Resend key isn't configured, 400 on a
 * malformed request, and 502 if Resend itself rejects the send.
 */
export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Set RESEND_API_KEY in the server environment.",
      },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const to = (body as { to?: string } | null)?.to?.trim()
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json(
      { error: "A valid recipient email is required" },
      { status: 400 }
    )
  }

  const result = await sendEmail({
    to,
    subject: "OrdinanceSync test email",
    text: [
      "This is a test email from OrdinanceSync.",
      "",
      "If you can read this, your Resend integration is wired up correctly",
      "and OrdinanceSync can dispatch ordinance notifications to office",
      "recipients.",
      "",
      "— OrdinanceSync Admin Console",
    ].join("\n"),
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed to send test email" },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, id: result.id, to })
}
