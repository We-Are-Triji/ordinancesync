import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
import { createDispatch } from "@/lib/dispatches"
import type { DispatchDraft, DispatchItem } from "@/lib/types"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email is not configured. Set RESEND_API_KEY." },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { ordinanceId, ordinanceNumber, ordinanceTitle, drafts } = body

    if (!Array.isArray(drafts) || drafts.length === 0) {
      return NextResponse.json(
        { error: "No drafts to dispatch" },
        { status: 400 }
      )
    }

    // Send sequentially so one failure doesn't abort the rest; record outcome
    // per recipient for the dispatch log.
    const items: DispatchItem[] = []
    for (const d of drafts as DispatchDraft[]) {
      if (!d.email || !EMAIL_RE.test(d.email) || !d.message?.trim()) {
        items.push({
          ...d,
          status: "failed",
          error: "Invalid email or empty message",
        })
        continue
      }

      const result = await sendEmail({
        to: d.email,
        subject: d.subject || `Ordinance Notice: ${ordinanceNumber}`,
        text: d.message,
      })

      items.push({
        officeId: d.officeId,
        officeName: d.officeName,
        email: d.email,
        subject: d.subject,
        message: d.message,
        status: result.ok ? "sent" : "failed",
        error: result.ok ? undefined : result.error,
        sentAt: result.ok ? new Date().toISOString() : undefined,
      })
    }

    const dispatch = await createDispatch({
      ordinanceId: ordinanceId ?? "",
      ordinanceNumber: ordinanceNumber ?? "",
      ordinanceTitle: ordinanceTitle ?? "",
      items,
    })

    const sent = items.filter((i) => i.status === "sent").length
    const failed = items.length - sent

    return NextResponse.json({ dispatchId: dispatch._id, sent, failed, items })
  } catch (err) {
    console.error("Dispatch send failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dispatch failed" },
      { status: 500 }
    )
  }
}
