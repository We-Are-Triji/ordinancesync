"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import type { DispatchDraft, Ordinance } from "@/lib/types"

type Stage = "analyzing" | "review" | "sending" | "done"

interface SendResultItem {
  officeName: string
  email: string
  status: "sent" | "failed"
  error?: string
}

interface DispatchModalProps {
  ordinance: Ordinance
  onClose: () => void
}

export default function DispatchModal({
  ordinance,
  onClose,
}: DispatchModalProps) {
  const [stage, setStage] = useState<Stage>("analyzing")
  const [drafts, setDrafts] = useState<DispatchDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<SendResultItem[]>([])

  const analyze = useCallback(async () => {
    setStage("analyzing")
    setError(null)
    try {
      const res = await fetch("/api/admin/dispatch/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordinanceId: ordinance._id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.")

      if (!data.drafts || data.drafts.length === 0) {
        setError("The AI did not identify any affected offices.")
        setStage("review")
        return
      }
      setDrafts(data.drafts)
      setStage("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.")
      setStage("review")
    }
  }, [ordinance._id])

  useEffect(() => {
    analyze()
  }, [analyze])

  function updateDraft(index: number, patch: Partial<DispatchDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    )
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleDispatch() {
    setStage("sending")
    setError(null)
    try {
      const res = await fetch("/api/admin/dispatch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordinanceId: ordinance._id,
          ordinanceNumber: ordinance.ordinanceNumber,
          ordinanceTitle: ordinance.title,
          drafts,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Dispatch failed.")
      setResults(data.items ?? [])
      setStage("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed.")
      setStage("review")
    }
  }

  const sentCount = results.filter((r) => r.status === "sent").length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Dispatch ordinance notifications"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-900">
              <Sparkles className="size-5 text-[#1697cf]" aria-hidden="true" />
              AI Notification Dispatch
            </h2>
            <p className="mt-0.5 text-sm font-semibold text-slate-500">
              {ordinance.ordinanceNumber} — {ordinance.title}
            </p>
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
          {stage === "analyzing" && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="size-10 animate-spin text-[#1697cf]" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Gemini is analyzing the ordinance...
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Matching affected offices from the directory and drafting
                  Cebuano checklists.
                </p>
              </div>
            </div>
          )}

          {error && stage !== "analyzing" && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {stage === "review" && drafts.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-600">
                {drafts.length} office{drafts.length === 1 ? "" : "s"} affected.
                Review and edit each message before dispatching.
              </p>
              {drafts.map((d, i) => (
                <div
                  key={`${d.officeId}-${i}`}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">
                        {d.officeName || "Unnamed office"}
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Mail className="size-3.5" aria-hidden="true" />
                        {d.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(i)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={d.subject}
                    onChange={(e) => updateDraft(i, { subject: e.target.value })}
                    placeholder="Email subject"
                    className="mb-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
                  />
                  <textarea
                    value={d.message}
                    onChange={(e) => updateDraft(i, { message: e.target.value })}
                    rows={5}
                    placeholder="Message"
                    className="w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
                  />
                </div>
              ))}
            </div>
          )}

          {stage === "review" && drafts.length === 0 && !error && (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">
              No affected offices to notify.
            </div>
          )}

          {stage === "sending" && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="size-10 animate-spin text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700">
                Dispatching notifications...
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                Dispatched {sentCount} of {results.length} notifications.
              </div>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {results.map((r, i) => (
                  <li
                    key={`${r.email}-${i}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-bold text-slate-800">
                        {r.officeName}
                      </span>
                      <span className="ml-2 text-slate-500">{r.email}</span>
                    </span>
                    {r.status === "sent" ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        Sent
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600"
                        title={r.error}
                      >
                        Failed
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {stage === "review" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={drafts.length === 0}
                className="inline-flex items-center gap-2 rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] disabled:opacity-50"
              >
                <Send className="size-4" aria-hidden="true" />
                Approve &amp; Dispatch
              </button>
            </>
          )}
          {stage === "done" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
