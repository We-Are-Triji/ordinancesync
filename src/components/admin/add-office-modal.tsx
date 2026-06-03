"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"
import type { Office, OfficeCategory } from "@/lib/types"

const CATEGORY_OPTIONS: { value: OfficeCategory; label: string }[] = [
  { value: "office", label: "Office" },
  { value: "barangay", label: "Barangay" },
]

interface AddOfficeModalProps {
  onClose: () => void
  onCreated: (office: Office) => void
}

export default function AddOfficeModal({
  onClose,
  onCreated,
}: AddOfficeModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState<OfficeCategory>("office")
  const [acronym, setAcronym] = useState("")
  const [description, setDescription] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [secondaryEmail, setSecondaryEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) {
      setError("Office name is required.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.")
      return
    }
    if (
      secondaryEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryEmail.trim())
    ) {
      setError("Enter a valid secondary email address.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          category,
          acronym,
          description,
          contactPerson,
          secondaryEmail,
          phone,
          address,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to add office.")
      }

      onCreated((await res.json()) as Office)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add office.")
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add new office"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">New Office</h2>
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
                Office Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CCENRO"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Acronym / Code
              </span>
              <input
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                placeholder="e.g. CCENRO"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Notification Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="office@cebucity.gov.ph"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Secondary Email
              </span>
              <input
                type="email"
                value={secondaryEmail}
                onChange={(e) => setSecondaryEmail(e.target.value)}
                placeholder="alternate@cebucity.gov.ph"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OfficeCategory)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Contact Person
              </span>
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Name of office contact"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Phone Number
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Local or mobile number"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Location / Address
              </span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Office address"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Description / Mandate
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Responsibilities, covered services, jurisdictions, or topics this office handles"
                className="resize-y rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
              />
            </label>
          </div>
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
            {saving ? "Saving..." : "Add Office"}
          </button>
        </div>
      </div>
    </div>
  )
}
