"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import type { Office, OfficeCategory, PaginatedOffices } from "@/lib/types"
import { getApiErrorMessage } from "@/lib/admin-api"
import { useToast } from "@/components/ui/toast"
import AddOfficeModal from "./add-office-modal"
import EditOfficeModal from "./edit-office-modal"
import DeleteOfficeDialog from "./delete-office-dialog"

const PAGE_SIZE = 10

type CategoryFilter = OfficeCategory | "all"

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "office", label: "Offices" },
  { value: "barangay", label: "Barangays" },
]

const categoryStyles: Record<string, string> = {
  office: "bg-[#1697cf]/10 text-[#1697cf]",
  barangay: "bg-violet-50 text-violet-700",
}

export default function OfficesTab() {
  const toast = useToast()
  const [data, setData] = useState<PaginatedOffices | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Office | null>(null)
  const [deleting, setDeleting] = useState<Office | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(
    async (targetPage: number, term: string, cat: CategoryFilter) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
        })
        if (term.trim()) params.set("search", term.trim())
        if (cat !== "all") params.set("category", cat)

        const res = await fetch(`/api/admin/offices?${params.toString()}`)
        if (!res.ok)
          throw new Error(await getApiErrorMessage(res, "Failed to load offices."))
        setData(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    load(page, search, category)
  }, [page, search, category, load])

  function refresh() {
    load(page, search, category)
  }

  function handleCreated(office: Office) {
    setShowAdd(false)
    toast.success({
      title: "Office added",
      description: `${office.name} is now in the directory.`,
    })
    // Reset filters for visual consistency, then explicitly reload page 1.
    // We call load() directly because if these state values are already at
    // their defaults, setState won't change them and the reload effect won't
    // fire — leaving the new office invisible until a manual refresh.
    setSearchInput("")
    setSearch("")
    setCategory("all")
    setPage(1)
    load(1, "", "all")
  }

  function handleDeleted(office: Office) {
    setDeleting(null)
    toast.success({
      title: "Office removed",
      description: `${office.name} will no longer receive notifications.`,
    })
    if (items.length === 1 && page > 1) {
      setPage((p) => p - 1)
    } else {
      refresh()
    }
  }

  // Update the edited office in place so the change reflects immediately
  // without a full reload.
  function handleSaved(updated: Office) {
    setEditing(null)
    toast.success({
      title: "Office updated",
      description: `Saved changes to ${updated.name}.`,
    })
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((o) =>
              o._id === updated._id ? updated : o
            ),
          }
        : prev
    )
  }

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0
  const hasFilters = search.trim() !== "" || category !== "all"

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Offices</h2>
          <p className="text-sm font-semibold text-slate-500">
            Master directory · {total} entr{total === 1 ? "y" : "ies"}
            {hasFilters ? " matched" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 self-start rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] sm:self-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Office
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, acronym, mandate, contact, or email"
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none transition focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
            aria-label="Search offices"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 gap-1 rounded-md border border-slate-200 bg-white p-1">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setCategory(f.value)
                setPage(1)
              }}
              className={`rounded px-3 py-1.5 text-xs font-bold transition ${
                category === f.value
                  ? "bg-[#1697cf] text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
              aria-pressed={category === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Office</th>
                <th className="px-4 py-3">Mandate</th>
                <th className="px-4 py-3">Notification Email</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Loading directory...
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-semibold text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
                    {hasFilters
                      ? "No offices match your search or filter."
                      : "No offices yet. Click “Add Office” to start the directory."}
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o._id} className="transition hover:bg-[#eaf8ff]">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="inline-flex items-center gap-2 font-bold text-slate-800">
                          <Building2 className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="truncate">{o.name}</span>
                        </span>
                        {o.acronym && (
                          <span className="w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black uppercase text-slate-500">
                            {o.acronym}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-600">
                        {o.description || "No mandate recorded."}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="inline-flex items-center gap-2">
                          <Mail className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="truncate">{o.email}</span>
                        </span>
                        {o.secondaryEmail && (
                          <span className="truncate pl-5 text-xs font-medium text-slate-500">
                            {o.secondaryEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="truncate font-semibold text-slate-700">
                          {o.contactPerson || "—"}
                        </span>
                        {o.phone && (
                          <span className="truncate text-xs font-medium text-slate-500">
                            {o.phone}
                          </span>
                        )}
                        {o.address && (
                          <span className="truncate text-xs font-medium text-slate-500">
                            {o.address}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          categoryStyles[o.category] ?? categoryStyles.office
                        }`}
                      >
                        {o.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(o)}
                          className="rounded-md p-1.5 text-slate-500 transition hover:bg-[#1697cf]/10 hover:text-[#1697cf]"
                          aria-label={`Edit ${o.name}`}
                          title="Edit"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(o)}
                          className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${o.name}`}
                          title="Delete"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">
            Page {data?.page ?? page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddOfficeModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
      {editing && (
        <EditOfficeModal
          office={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeleteOfficeDialog
          office={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
