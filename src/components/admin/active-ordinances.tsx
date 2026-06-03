"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react"
import type { Ordinance, OrdinanceStatus, PaginatedOrdinances } from "@/lib/types"
import { getApiErrorMessage } from "@/lib/admin-api"
import { useToast } from "@/components/ui/toast"
import NewPolicyModal from "./new-policy-modal"
import PolicyDetailModal from "./policy-detail-modal"
import EditPolicyModal from "./edit-policy-modal"
import DeletePolicyDialog from "./delete-policy-dialog"
import DispatchModal from "./dispatch-modal"

const PAGE_SIZE = 10

type StatusFilter = OrdinanceStatus | "all"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "archived", label: "Archived" },
]

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-600",
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function ActiveOrdinances() {
  const toast = useToast()
  const [data, setData] = useState<PaginatedOrdinances | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")

  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<Ordinance | null>(null)
  const [editing, setEditing] = useState<Ordinance | null>(null)
  const [deleting, setDeleting] = useState<Ordinance | null>(null)
  const [dispatching, setDispatching] = useState<Ordinance | null>(null)

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(
    async (targetPage: number, term: string, statusFilter: StatusFilter) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
        })
        if (term.trim()) params.set("search", term.trim())
        if (statusFilter !== "all") params.set("status", statusFilter)

        const res = await fetch(`/api/admin/ordinances?${params.toString()}`)
        if (!res.ok)
          throw new Error(
            await getApiErrorMessage(res, "Failed to load ordinances.")
          )
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
    load(page, search, status)
  }, [page, search, status, load])

  function refresh() {
    load(page, search, status)
  }

  // Called by the New Policy modal once the ordinance is created. We refresh
  // the table data but DO NOT close the modal — it continues to the dispatch
  // stage. The modal closes itself via onClose when the user is done.
  function handleCreated() {
    setSearchInput("")
    setSearch("")
    setStatus("all")
    setPage(1)
    load(1, "", "all")
  }

  function handleSaved(updated: Ordinance) {
    setEditing(null)
    toast.success({
      title: "Policy updated",
      description: `Saved changes to ${updated.ordinanceNumber}.`,
    })
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((o) => (o._id === updated._id ? updated : o)),
          }
        : prev
    )
    // Keep the detail modal in sync if it's open for the same record.
    setSelected((prev) => (prev && prev._id === updated._id ? updated : prev))
  }

  function handleDeleted(removed: Ordinance) {
    setDeleting(null)
    toast.success({
      title: "Policy deleted",
      description: `${removed.ordinanceNumber} was removed.`,
    })
    // If we just removed the last row on a page beyond the first, step back.
    if (items.length === 1 && page > 1) {
      setPage((p) => p - 1)
    } else {
      refresh()
    }
  }

  function handleStatusChange(next: StatusFilter) {
    setStatus(next)
    setPage(1)
  }

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0
  const hasFilters = search.trim() !== "" || status !== "all"

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Active Ordinances
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            {total} record{total === 1 ? "" : "s"}
            {hasFilters ? " matched" : " on file"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 self-start rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] sm:self-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Policy
        </button>
      </div>

      {/* Search + filter controls */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by ordinance number or title"
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none transition focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
            aria-label="Search ordinances"
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
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleStatusChange(f.value)}
              className={`rounded px-3 py-1.5 text-xs font-bold transition ${
                status === f.value
                  ? "bg-[#1697cf] text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
              aria-pressed={status === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Ordinance No.</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Pages</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[13px] text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <span className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-slate-500">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Loading log...
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center font-sans text-sm font-semibold text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center font-sans text-sm font-semibold text-slate-500"
                  >
                    {hasFilters
                      ? "No ordinances match your search or filter."
                      : "No ordinances yet. Click “New Policy” to add the first one."}
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr
                    key={o._id}
                    onClick={() => setSelected(o)}
                    onKeyDown={(e) => {
                      // Make the row keyboard-operable. Enter activates;
                      // Space matches button semantics (preventDefault stops
                      // the page from scrolling).
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setSelected(o)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${o.ordinanceNumber}: ${o.title}`}
                    className="cursor-pointer transition hover:bg-[#eaf8ff] focus:outline-none focus-visible:bg-[#eaf8ff] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1697cf]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatTimestamp(o.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-[#1697cf]">
                      {o.ordinanceNumber}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 font-sans font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                        {o.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-sans text-xs font-bold capitalize ${
                          statusStyles[o.status] ?? statusStyles.archived
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{o.pageCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDispatching(o)
                          }}
                          className="rounded-md p-1.5 text-slate-500 transition hover:bg-[#1697cf]/10 hover:text-[#1697cf]"
                          aria-label={`Re-dispatch notifications for ${o.ordinanceNumber}`}
                          title="Re-dispatch notifications"
                        >
                          <Send className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditing(o)
                          }}
                          className="rounded-md p-1.5 text-slate-500 transition hover:bg-[#1697cf]/10 hover:text-[#1697cf]"
                          aria-label={`Edit ${o.ordinanceNumber}`}
                          title="Edit"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleting(o)
                          }}
                          className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${o.ordinanceNumber}`}
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

      {showNew && (
        <NewPolicyModal
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
      {selected && (
        <PolicyDetailModal
          ordinance={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {editing && (
        <EditPolicyModal
          ordinance={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {deleting && (
        <DeletePolicyDialog
          ordinance={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={handleDeleted}
        />
      )}
      {dispatching && (
        <DispatchModal
          ordinance={dispatching}
          onClose={() => setDispatching(null)}
        />
      )}
    </div>
  )
}
