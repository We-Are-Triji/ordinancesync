import { NextRequest, NextResponse } from "next/server"
import { listOffices, createOffice } from "@/lib/offices"
import type { OfficeCategory } from "@/lib/types"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    const body = await request.json()
    const { name, email, category } = body

    if (!name || String(name).trim() === "") {
      return NextResponse.json(
        { error: "Office name is required" },
        { status: 400 }
      )
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      )
    }
    if (category !== undefined && !["office", "barangay"].includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    const office = await createOffice({
      name,
      email,
      category: (category as OfficeCategory) ?? "office",
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
