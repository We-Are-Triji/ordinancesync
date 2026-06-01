"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
} from "lucide-react"
import type { Ordinance, PaginatedOrdinances } from "@/lib/types"
import NewPolicyModal from "./new-policy-modal"
import PolicyDetailModal from "./policy-detail-modal"

const PAGE_SIZE = 10

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
  const [data, setData] = useState<PaginatedOrdinances | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<Ordinance | null>(null)

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/ordinances?page=${targetPage}&pageSize=${PAGE_SIZE}`
      )
      if (!res.ok) throw new Error("Failed to load ordinances.")
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(page)
  }, [page, load])

  function handleCreated() {
    setShowNew(false)
    if (page === 1) {
      load(1)
    } else {
      setPage(1)
    }
  }

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Active Ordinances
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            {total} record{total === 1 ? "" : "s"} on file
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

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Ordinance No.</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Office</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Pages</th>
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
                    className="px-4 py-12 text-center font-sans text-sm font-semibold text-slate-400"
                  >
                    No ordinances yet. Click “New Policy” to add the first one.
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr
                    key={o._id}
                    onClick={() => setSelected(o)}
                    className="cursor-pointer transition hover:bg-[#eaf8ff]"
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
                    <td className="whitespace-nowrap px-4 py-3 font-sans text-slate-600">
                      {o.office}
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
    </div>
  )
}
