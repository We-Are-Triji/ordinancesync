"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import type { Office, OfficeCategory, PaginatedOffices } from "@/lib/types"
import AddOfficeModal from "./add-office-modal"
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
  const [data, setData] = useState<PaginatedOffices | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")

  const [showAdd, setShowAdd] = useState(false)
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
        if (!res.ok) throw new Error("Failed to load offices.")
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

  function handleCreated() {
    setShowAdd(false)
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

  function handleDeleted() {
    setDeleting(null)
    if (items.length === 1 && page > 1) {
      setPage((p) => p - 1)
    } else {
      refresh()
    }
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
            placeholder="Search by name or email"
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Notification Email</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Loading directory...
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm font-semibold text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm font-semibold text-slate-400">
                    {hasFilters
                      ? "No offices match your search or filter."
                      : "No offices yet. Click “Add Office” to start the directory."}
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o._id} className="transition hover:bg-[#eaf8ff]">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                        {o.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        {o.email}
                      </span>
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
                      <div className="flex items-center justify-end">
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
