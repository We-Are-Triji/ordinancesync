import { NextRequest, NextResponse } from "next/server"
import { getOfficeCount } from "@/lib/offices"
import { getOrdinanceCount } from "@/lib/ordinances"
import {
  getAdminSettings,
  isDefaultOrdinanceStatus,
  isDefaultTablePageSize,
  saveAdminSettings,
} from "@/lib/settings"

export const runtime = "nodejs"

async function getDirectoryStats() {
  const [totalOrdinances, totalOffices] = await Promise.all([
    getOrdinanceCount(),
    getOfficeCount(),
  ])

  return { totalOrdinances, totalOffices }
}

export async function GET() {
  try {
    const [settings, stats] = await Promise.all([
      getAdminSettings(),
      getDirectoryStats(),
    ])

    return NextResponse.json({ settings, stats })
  } catch (err) {
    console.error("Load settings failed:", err)
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { defaultOrdinanceStatus, defaultTablePageSize } = body

    if (
      defaultOrdinanceStatus !== undefined &&
      !isDefaultOrdinanceStatus(defaultOrdinanceStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid default ordinance status" },
        { status: 400 }
      )
    }

    if (
      defaultTablePageSize !== undefined &&
      !isDefaultTablePageSize(defaultTablePageSize)
    ) {
      return NextResponse.json(
        { error: "Invalid default table page size" },
        { status: 400 }
      )
    }

    const [settings, stats] = await Promise.all([
      saveAdminSettings({ defaultOrdinanceStatus, defaultTablePageSize }),
      getDirectoryStats(),
    ])

    return NextResponse.json({ settings, stats })
  } catch (err) {
    console.error("Save settings failed:", err)
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}
