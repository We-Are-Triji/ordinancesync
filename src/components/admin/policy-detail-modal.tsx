"use client"

import dynamic from "next/dynamic"
import dynamic from "next/dynamic"
import { useEffect, useState, useRef } from "react"
import { Loader2, Send, X } from "lucide-react"
import type { Dispatch, Ordinance } from "@/lib/types"
import DispatchModal from "./dispatch-modal"
import { useFocusTrap } from "@/lib/use-focus-trap"

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

interface PolicyDetailModalProps {
  ordinance: Ordinance
  onClose: () => void
}

function formatBytes(bytes: number) {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function PolicyDetailModal({
  ordinance,
  onClose,
}: PolicyDetailModalProps) {
  const fileUrl = `/api/admin/ordinances/file/${ordinance.fileId}`
  const [showDispatch, setShowDispatch] = useState(false)

  // Latest dispatch (auto-run after upload, plus any manual re-dispatches).
  // Loaded lazily so the modal opens immediately and the line fills in after.
  const [latestDispatch, setLatestDispatch] = useState<Dispatch | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  async function loadLatestDispatch() {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch(
        `/api/admin/dispatches?ordinanceId=${encodeURIComponent(ordinance._id)}&latest=1`
      )
      if (!res.ok) throw new Error("Failed to load dispatch history.")
      const data = (await res.json()) as { dispatch: Dispatch | null }
      setLatestDispatch(data.dispatch)
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Failed to load dispatch history."
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadLatestDispatch()
    // We deliberately depend on the ordinance id only — re-fetch when the
    // detail view is opened for a different ordinance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordinance._id])

  // After the dispatch modal closes we refresh history so the freshly-sent
  // run shows up here without a full page reload.
  function handleDispatchClose() {
    setShowDispatch(false)
    loadLatestDispatch()
  }

  const sentCount =
    latestDispatch?.items.filter((i) => i.status === "sent").length ?? 0
  const failedCount =
    latestDispatch?.items.filter((i) => i.status === "failed").length ?? 0
  const dispatchedAtIso =
    latestDispatch?.dispatchedAt ?? latestDispatch?.createdAt
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, { onClose })

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Policy details"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#1697cf]">
              {ordinance.ordinanceNumber}
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              {ordinance.title}
            </h2>
          </div>
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
          <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Detail label="Status" value={ordinance.status} />
            <Detail label="Pages" value={String(ordinance.pageCount)} />
            <Detail label="Size" value={formatBytes(ordinance.fileSize)} />
            <Detail label="Created" value={formatDate(ordinance.createdAt)} />
            <Detail label="Updated" value={formatDate(ordinance.updatedAt)} />
            <Detail
              label="File"
              value={ordinance.fileName}
              className="col-span-2"
            />
          </dl>

          {/* Dispatch summary + re-dispatch entry point. */}
          <div className="mb-5 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Notifications
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {historyLoading ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    Checking history...
                  </span>
                ) : historyError ? (
                  <span className="text-red-600">{historyError}</span>
                ) : latestDispatch && dispatchedAtIso ? (
                  <>
                    Last dispatched {formatDate(dispatchedAtIso)} —{" "}
                    <span className="text-emerald-700">{sentCount} sent</span>
                    {failedCount > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-red-600">
                          {failedCount} failed
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">
                    No dispatch on record yet for this ordinance.
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDispatch(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf]"
            >
              <Send className="size-4" aria-hidden="true" />
              {latestDispatch ? "Re-dispatch notifications" : "Dispatch notifications"}
            </button>
          </div>

          {ordinance.summary && (
            <div className="mb-5 rounded-md bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Summary
              </p>
              <p className="mt-1 text-sm text-slate-700">{ordinance.summary}</p>
            </div>
          )}

          <PdfPreview file={fileUrl} />
        </div>
      </div>

      {showDispatch && (
        <DispatchModal
          ordinance={ordinance}
          onClose={handleDispatchClose}
        />
      )}
    </div>
  )
}

function Detail({
  label,
  value,
  className = "",
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold capitalize text-slate-800">
        {value}
      </dd>
    </div>
  )
}
