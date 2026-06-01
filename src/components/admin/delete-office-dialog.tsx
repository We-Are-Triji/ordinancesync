"use client"

import { useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import type { Office } from "@/lib/types"

interface DeleteOfficeDialogProps {
  office: Office
  onClose: () => void
  onDeleted: (id: string) => void
}

export default function DeleteOfficeDialog({
  office,
  onClose,
  onDeleted,
}: DeleteOfficeDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/offices/${office._id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to delete office.")
      }
      onDeleted(office._id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete office.")
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Delete office"
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Remove this office?
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                <span className="font-bold text-slate-800">{office.name}</span>{" "}
                — {office.email}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                This office will no longer receive ordinance notifications. This
                action cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {deleting ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  )
}
