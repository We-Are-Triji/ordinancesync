import { NextRequest, NextResponse } from "next/server"
import { getOfficeCount } from "@/lib/offices"
import { getOrdinanceCount } from "@/lib/ordinances"
import { getLatestDispatch } from "@/lib/dispatches"
import {
  getAdminSettings,
  isDefaultOrdinanceStatus,
  isDefaultTablePageSize,
  saveAdminSettings,
} from "@/lib/settings"

export const runtime = "nodejs"

/**
 * Returns workspace settings + a small "directory stats" payload that the
 * settings page renders alongside them. Both are cheap so we resolve them
 * together to keep the page a single round-trip.
 */
async function getDirectoryStats() {
  const [totalOrdinances, totalOffices, latestDispatch] = await Promise.all([
    getOrdinanceCount(),
    getOfficeCount(),
    getLatestDispatch(),
  ])

  // Trim the dispatch payload to only what the settings card needs, both for
  // bandwidth and to keep the API surface narrow if the schema grows.
  const summary = latestDispatch
    ? {
        ordinanceNumber: latestDispatch.ordinanceNumber,
        ordinanceTitle: latestDispatch.ordinanceTitle,
        sent: latestDispatch.items.filter((i) => i.status === "sent").length,
        failed: latestDispatch.items.filter((i) => i.status === "failed").length,
        dispatchedAt: latestDispatch.dispatchedAt ?? latestDispatch.createdAt,
      }
    : null

  return {
    totalOrdinances,
    totalOffices,
    lastDispatch: summary,
  }
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
    const {
      defaultOrdinanceStatus,
      defaultTablePageSize,
      autoDispatchOnUpload,
    } = body

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

    if (
      autoDispatchOnUpload !== undefined &&
      typeof autoDispatchOnUpload !== "boolean"
    ) {
      return NextResponse.json(
        { error: "autoDispatchOnUpload must be a boolean" },
        { status: 400 }
      )
    }

    const [settings, stats] = await Promise.all([
      saveAdminSettings({
        defaultOrdinanceStatus,
        defaultTablePageSize,
        autoDispatchOnUpload,
      }),
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
