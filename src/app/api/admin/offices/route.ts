import { NextRequest, NextResponse } from "next/server"
import { listOffices, createOffice } from "@/lib/offices"
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(searchParams.get("pageSize") ?? "10")
  const search = searchParams.get("search") ?? ""
  const categoryParam = searchParams.get("category") ?? "all"
  const category = (["office", "barangay", "all"].includes(categoryParam)
    ? categoryParam
    : "all") as OfficeCategory | "all"

  try {
    const result = await listOffices({ page, pageSize, search, category })
    return NextResponse.json(result)
  } catch (err) {
    console.error("List offices failed:", err)
    return NextResponse.json(
      { error: "Failed to load offices" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const category = body.category
    const categoryValue =
      category === "office" || category === "barangay" ? category : undefined
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim() : ""

    if (!name) {
      return NextResponse.json(
        { error: "Office name is required" },
        { status: 400 }
      )
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      )
    }
    if (category !== undefined && categoryValue === undefined) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    const optional = collectOptionalFields(body)
    if (optional.error) {
      return NextResponse.json({ error: optional.error }, { status: 400 })
    }

    const office = await createOffice({
      name,
      email,
      category: categoryValue ?? "office",
      ...optional.fields,
    })

    return NextResponse.json(office, { status: 201 })
  } catch (err) {
    console.error("Create office failed:", err)
    return NextResponse.json(
      { error: "Failed to create office" },
      { status: 500 }
    )
  }
}
