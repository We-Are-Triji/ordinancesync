import { NextRequest, NextResponse } from "next/server"
import { getOffice, updateOffice, deleteOffice } from "@/lib/offices"
import type { OfficeCategory } from "@/lib/types"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const office = await getOffice(id)
  if (!office) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(office)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { name, email, category } = body

    if (name !== undefined && String(name).trim() === "") {
      return NextResponse.json(
        { error: "Office name cannot be empty" },
        { status: 400 }
      )
    }
    if (email !== undefined && !EMAIL_RE.test(String(email).trim())) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      )
    }
    if (category !== undefined && !["office", "barangay"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    const updated = await updateOffice(id, {
      name,
      email,
      category: category as OfficeCategory | undefined,
    })

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error("Update office failed:", err)
    return NextResponse.json(
      { error: "Failed to update office" },
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
    const ok = await deleteOffice(id)
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete office failed:", err)
    return NextResponse.json(
      { error: "Failed to delete office" },
      { status: 500 }
    )
  }
}
