import { NextRequest, NextResponse } from "next/server"
import { getOffice, updateOffice, deleteOffice } from "@/lib/offices"
import type { OfficeCategory } from "@/lib/types"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const OPTIONAL_TEXT_FIELDS = [
  { key: "acronym", label: "Acronym", max: 80 },
  { key: "description", label: "Description", max: 2000 },
  { key: "contactPerson", label: "Contact person", max: 160 },
  { key: "secondaryEmail", label: "Secondary email", max: 254 },
  { key: "phone", label: "Phone number", max: 80 },
  { key: "address", label: "Address", max: 500 },
] as const

type OptionalTextField = (typeof OPTIONAL_TEXT_FIELDS)[number]["key"]

function collectOptionalFields(body: Record<string, unknown>) {
  const fields: Partial<Record<OptionalTextField, string>> = {}

  for (const { key, label, max } of OPTIONAL_TEXT_FIELDS) {
    const value = body[key]
    if (value === undefined || value === null) continue
    if (typeof value !== "string") {
      return { error: `${label} must be text.` }
    }

    const trimmed = value.trim()
    if (trimmed.length > max) {
      return { error: `${label} must be ${max} characters or fewer.` }
    }
    fields[key] = trimmed
  }

  if (fields.secondaryEmail && !EMAIL_RE.test(fields.secondaryEmail)) {
    return { error: "Secondary email must be a valid email address." }
  }

  return { fields }
}

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
    const body = (await request.json()) as Record<string, unknown>
    const { name, email, category } = body
    const categoryValue =
      category === "office" || category === "barangay" ? category : undefined

    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return NextResponse.json(
        { error: "Office name cannot be empty" },
        { status: 400 }
      )
    }
    if (
      email !== undefined &&
      (typeof email !== "string" || !EMAIL_RE.test(email.trim()))
    ) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      )
    }
    if (category !== undefined && categoryValue === undefined) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    const optional = collectOptionalFields(body)
    if (optional.error) {
      return NextResponse.json({ error: optional.error }, { status: 400 })
    }

    const updated = await updateOffice(id, {
      name: typeof name === "string" ? name.trim() : undefined,
      email: typeof email === "string" ? email.trim() : undefined,
      category: categoryValue,
      ...optional.fields,
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
