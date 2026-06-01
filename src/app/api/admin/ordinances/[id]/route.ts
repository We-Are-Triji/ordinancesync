import { NextRequest, NextResponse } from "next/server"
import {
  getOrdinance,
  updateOrdinance,
  deleteOrdinance,
} from "@/lib/ordinances"
import type { OrdinanceStatus } from "@/lib/types"

export const runtime = "nodejs"

const VALID_STATUSES: OrdinanceStatus[] = ["active", "pending", "archived"]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ordinance = await getOrdinance(id)
  if (!ordinance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(ordinance)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { ordinanceNumber, title, status, summary } = body

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      )
    }

    if (
      ordinanceNumber !== undefined &&
      String(ordinanceNumber).trim() === ""
    ) {
      return NextResponse.json(
        { error: "Ordinance number cannot be empty" },
        { status: 400 }
      )
    }
    if (title !== undefined && String(title).trim() === "") {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      )
    }

    const updated = await updateOrdinance(id, {
      ordinanceNumber: ordinanceNumber?.trim(),
      title: title?.trim(),
      status,
      summary,
    })

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error("Update ordinance failed:", err)
    return NextResponse.json(
      { error: "Failed to update ordinance" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const ok = await deleteOrdinance(id)
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete ordinance failed:", err)
    return NextResponse.json(
      { error: "Failed to delete ordinance" },
      { status: 500 }
    )
  }
}
