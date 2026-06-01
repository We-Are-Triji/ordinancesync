"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"
import type { Ordinance, OrdinanceStatus } from "@/lib/types"

const STATUS_OPTIONS: OrdinanceStatus[] = ["active", "pending", "archived"]

interface EditPolicyModalProps {
  ordinance: Ordinance
  onClose: () => void
  onSaved: (updated: Ordinance) => void
}

export default function EditPolicyModal({
  ordinance,
  onClose,
  onSaved,
}: EditPolicyModalProps) {
  const [ordinanceNumber, setOrdinanceNumber] = useState(
    ordinance.ordinanceNumber
  )
  const [title, setTitle] = useState(ordinance.title)
  const [status, setStatus] = useState<OrdinanceStatus>(ordinance.status)
  const [summary, setSummary] = useState(ordinance.summary ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!ordinanceNumber.trim() || !title.trim()) {
      setError("Ordinance number and title are required.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/ordinances/${ordinance._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordinanceNumber,
          title,
          status,
          summary,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to update policy.")
      }

      onSaved((await res.json()) as Ordinance)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy.")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit policy"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">Edit Policy</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Ordinance Number
              </span>
              <input
                value={ordinanceNumber}
                onChange={(e) => setOrdinanceNumber(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrdinanceStatus)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm capitalize outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Summary (optional)
              </span>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>
          </div>

          <p className="mt-4 text-xs font-semibold text-slate-400">
            The attached PDF ({ordinance.fileName}) cannot be changed here.
            Delete and re-upload to replace the document.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] disabled:opacity-60"
          >
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
