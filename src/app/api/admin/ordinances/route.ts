import { NextRequest, NextResponse } from "next/server"
import { listOrdinances, createOrdinance } from "@/lib/ordinances"
import type { OrdinanceStatus } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get("page") ?? "1")
  const pageSize = Number(searchParams.get("pageSize") ?? "10")
  const search = searchParams.get("search") ?? ""
  const statusParam = searchParams.get("status") ?? "all"
  const status = (["active", "pending", "archived", "all"].includes(statusParam)
    ? statusParam
    : "all") as OrdinanceStatus | "all"

  try {
    const result = await listOrdinances({ page, pageSize, search, status })
    return NextResponse.json(result)
  } catch (err) {
    console.error("List ordinances failed:", err)
    return NextResponse.json(
      { error: "Failed to load ordinances" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ordinanceNumber, title, office, status, pageCount, fileId, fileName, fileSize, summary } = body

    if (!ordinanceNumber || !title || !office || !fileId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const ordinance = await createOrdinance({
      ordinanceNumber,
      title,
      office,
      status: (status as OrdinanceStatus) ?? "active",
      pageCount: Number(pageCount) || 0,
      fileId,
      fileName: fileName ?? "document.pdf",
      fileSize: Number(fileSize) || 0,
      summary,
    })

    return NextResponse.json(ordinance, { status: 201 })
  } catch (err) {
    console.error("Create ordinance failed:", err)
    return NextResponse.json(
      { error: "Failed to create ordinance" },
      { status: 500 }
    )
  }
}
