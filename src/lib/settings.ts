import { getDb } from "./mongodb"
import type { OrdinanceStatus } from "./types"

const COLLECTION = "settings"
const SETTINGS_ID = "admin-settings"

export type DefaultOrdinanceStatus = Extract<
  OrdinanceStatus,
  "active" | "pending"
>

export interface AdminSettings {
  /** Status applied to ordinances created from the New Policy modal. */
  defaultOrdinanceStatus: DefaultOrdinanceStatus
  /** Page size used by the admin tables (Active Ordinances, Offices). */
  defaultTablePageSize: number
  /**
   * When true, finishing the New Policy upload immediately runs the AI
   * dispatch analyzer and rolls into the review-and-approve stage. When
   * false, the upload completes and the admin can dispatch manually later
   * from the row action or detail view. Defaults to true to preserve the
   * current behaviour for existing installs.
   */
  autoDispatchOnUpload: boolean
  updatedAt: string
}

interface AdminSettingsDocument {
  _id: string
  defaultOrdinanceStatus?: DefaultOrdinanceStatus
  defaultTablePageSize?: number
  autoDispatchOnUpload?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface UpdateAdminSettingsInput {
  defaultOrdinanceStatus?: DefaultOrdinanceStatus
  defaultTablePageSize?: number
  autoDispatchOnUpload?: boolean
}

const DEFAULT_SETTINGS: AdminSettings = {
  defaultOrdinanceStatus: "active",
  defaultTablePageSize: 10,
  autoDispatchOnUpload: true,
  updatedAt: new Date(0).toISOString(),
}

const VALID_STATUSES: DefaultOrdinanceStatus[] = ["active", "pending"]
const VALID_PAGE_SIZES = [10, 25, 50, 100]

function serialize(doc?: AdminSettingsDocument | null): AdminSettings {
  const status = doc?.defaultOrdinanceStatus
  const pageSize = doc?.defaultTablePageSize
  const autoDispatch = doc?.autoDispatchOnUpload

  return {
    defaultOrdinanceStatus: isDefaultOrdinanceStatus(status)
      ? status
      : DEFAULT_SETTINGS.defaultOrdinanceStatus,
    defaultTablePageSize: isDefaultTablePageSize(pageSize)
      ? pageSize
      : DEFAULT_SETTINGS.defaultTablePageSize,
    autoDispatchOnUpload:
      typeof autoDispatch === "boolean"
        ? autoDispatch
        : DEFAULT_SETTINGS.autoDispatchOnUpload,
    updatedAt:
      doc?.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : (doc?.updatedAt ?? DEFAULT_SETTINGS.updatedAt),
  }
}

export function isDefaultOrdinanceStatus(
  value: unknown
): value is DefaultOrdinanceStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as DefaultOrdinanceStatus)
  )
}

export function isDefaultTablePageSize(value: unknown): value is number {
  return typeof value === "number" && VALID_PAGE_SIZES.includes(value)
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const db = await getDb()
  const doc = await db
    .collection<AdminSettingsDocument>(COLLECTION)
    .findOne({ _id: SETTINGS_ID })
  return serialize(doc)
}

export async function saveAdminSettings(
  input: UpdateAdminSettingsInput
): Promise<AdminSettings> {
  const db = await getDb()
  const now = new Date()
  const update: Record<string, unknown> = { updatedAt: now }

  if (input.defaultOrdinanceStatus !== undefined) {
    update.defaultOrdinanceStatus = input.defaultOrdinanceStatus
  }
  if (input.defaultTablePageSize !== undefined) {
    update.defaultTablePageSize = input.defaultTablePageSize
  }
  if (input.autoDispatchOnUpload !== undefined) {
    update.autoDispatchOnUpload = input.autoDispatchOnUpload
  }

  const result = await db
    .collection<AdminSettingsDocument>(COLLECTION)
    .findOneAndUpdate(
      { _id: SETTINGS_ID },
      {
        $set: update,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    )

  return serialize(result)
}
