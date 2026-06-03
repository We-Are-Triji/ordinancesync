"use client"

import { useCallback, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Send,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react"
import type { DispatchDraft, Ordinance } from "@/lib/types"

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

type Stage =
  | "select"
  | "uploading"
  | "review" // review AI-extracted metadata
  | "creating" // saving ordinance + running dispatch analysis
  | "dispatch" // review affected offices + drafts
  | "dispatching" // sending emails
  | "done"

interface UploadResult {
  fileId: string
  fileName: string
  fileSize: number
  text?: string
  extractedPages?: number
  ordinanceNumber?: string
  title?: string
  summary?: string
  metadataStatus?: "ok" | "partial" | "failed" | "skipped"
}

interface SendResultItem {
  officeName: string
  email: string
  status: "sent" | "failed"
  error?: string
}

interface NewPolicyModalProps {
  onClose: () => void
  // Called once the ordinance has been created (so the table can refresh),
  // regardless of dispatch outcome.
  onCreated: (ordinance: Ordinance) => void
}

export default function NewPolicyModal({
  onClose,
  onCreated,
}: NewPolicyModalProps) {
  const [stage, setStage] = useState<Stage>("select")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploaded, setUploaded] = useState<UploadResult | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const [ordinanceNumber, setOrdinanceNumber] = useState("")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  // Fields are locked (read-only) by default after AI fills them; the user
  // clicks the pencil to edit. Fields the AI couldn't fill start unlocked.
  const [unlocked, setUnlocked] = useState({
    ordinanceNumber: false,
    title: false,
    summary: false,
  })

  const [created, setCreated] = useState<Ordinance | null>(null)
  const [drafts, setDrafts] = useState<DispatchDraft[]>([])
  const [results, setResults] = useState<SendResultItem[]>([])

  const inputRef = useRef<HTMLInputElement>(null)

  const startUpload = useCallback((selected: File) => {
    setError(null)
    if (selected.type !== "application/pdf") {
      setError("Only PDF files are accepted.")
      return
    }

    setFile(selected)
    setStage("uploading")
    setProgress(0)

    const formData = new FormData()
    formData.append("file", selected)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/admin/ordinances/upload")

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText) as UploadResult
        setUploaded(result)
        setProgress(100)

        const num = result.ordinanceNumber ?? ""
        const ttl = result.title ?? ""
        const sum = result.summary ?? ""
        setOrdinanceNumber(num)
        setTitle(ttl)
        setSummary(sum)

        // Lock fields the AI confidently filled; unlock (for manual entry)
        // anything it left blank so the user notices it needs input.
        setUnlocked({
          ordinanceNumber: !num,
          title: !ttl,
          summary: !sum,
        })

        if (result.metadataStatus === "failed" || (!num && !ttl && !sum)) {
          setNotice(
            "We couldn't auto-read the ordinance details from this PDF. Please fill them in manually."
          )
        } else if (result.metadataStatus === "partial" || !num || !ttl) {
          setNotice(
            "We auto-filled what we could. Please review and complete the highlighted fields."
          )
        } else {
          setNotice(null)
        }

        setStage("review")
      } else {
        let message = "Upload failed."
        try {
          message = JSON.parse(xhr.responseText).error ?? message
        } catch {}
        setError(message)
        setStage("select")
      }
    }

    xhr.onerror = () => {
      setError("Network error during upload.")
      setStage("select")
    }

    xhr.send(formData)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) startUpload(dropped)
  }

  // Confirm metadata -> create ordinance -> immediately run dispatch analysis.
  async function handleConfirm() {
    if (!uploaded) return
    if (!ordinanceNumber.trim() || !title.trim()) {
      setError("Ordinance number and title are required.")
      return
    }

    setStage("creating")
    setError(null)
    setNotice(null)

    let createdOrdinance: Ordinance
    try {
      const res = await fetch("/api/admin/ordinances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordinanceNumber,
          title,
          summary,
          pageCount,
          fileId: uploaded.fileId,
          fileName: uploaded.fileName,
          fileSize: uploaded.fileSize,
          text: uploaded.text ?? "",
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to save ordinance.")
      }
      createdOrdinance = (await res.json()) as Ordinance
      setCreated(createdOrdinance)
      // Let the table refresh right away — the ordinance now exists.
      onCreated(createdOrdinance)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save ordinance.")
      setStage("review")
      return
    }

    // Run AI dispatch analysis automatically.
    try {
      const res = await fetch("/api/admin/dispatch/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordinanceId: createdOrdinance._id }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Ordinance is saved; dispatch just isn't available. Let the user finish.
        setNotice(
          data.error ??
            "The ordinance was saved, but AI dispatch is unavailable right now."
        )
        setDrafts([])
        setStage("dispatch")
        return
      }
      setDrafts(data.drafts ?? [])
      if (!data.drafts || data.drafts.length === 0) {
        setNotice("The AI did not identify any affected offices for this ordinance.")
      }
      setStage("dispatch")
    } catch {
      setNotice("The ordinance was saved, but dispatch analysis failed.")
      setDrafts([])
      setStage("dispatch")
    }
  }

  function updateDraft(index: number, patch: Partial<DispatchDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleDispatch() {
    if (!created || drafts.length === 0) return
    setStage("dispatching")
    setError(null)
    try {
      const res = await fetch("/api/admin/dispatch/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordinanceId: created._id,
          ordinanceNumber: created.ordinanceNumber,
          ordinanceTitle: created.title,
          drafts,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Dispatch failed.")
      setResults(data.items ?? [])
      setStage("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed.")
      setStage("dispatch")
    }
  }

  const fileUrl = uploaded
    ? `/api/admin/ordinances/file/${uploaded.fileId}`
    : null
  const sentCount = results.filter((r) => r.status === "sent").length

  const titleMap: Record<Stage, string> = {
    select: "New Ordinance",
    uploading: "Uploading",
    review: "Review Ordinance Details",
    creating: "Saving & Analyzing",
    dispatch: "Review & Dispatch Notifications",
    dispatching: "Dispatching",
    done: "Dispatch Complete",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New ordinance"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-900">
            {(stage === "dispatch" || stage === "done" || stage === "dispatching") && (
              <Sparkles className="size-5 text-[#1697cf]" aria-hidden="true" />
            )}
            {titleMap[stage]}
          </h2>
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
          {notice && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{notice}</span>
            </div>
          )}

          {stage === "select" && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-16 text-center transition ${
                dragActive
                  ? "border-[#1697cf] bg-[#eaf8ff]"
                  : "border-slate-300 bg-slate-50 hover:border-[#1697cf]"
              }`}
            >
              <UploadCloud className="size-10 text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700">
                Drag & drop a PDF here, or click to browse
              </p>
              <p className="text-xs font-semibold text-slate-400">
                PDF only, up to 25 MB. We&apos;ll read the ordinance number and
                title automatically.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (selected) startUpload(selected)
                }}
              />
            </div>
          )}

          {stage === "uploading" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="size-10 animate-spin text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700">
                Uploading & reading {file?.name}
              </p>
              <div className="h-2.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[#1697cf] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500">{progress}%</p>
            </div>
          )}

          {stage === "review" && fileUrl && (
            <div className="flex flex-col gap-5">
              {!notice && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  We read these details from the PDF. Tap the pencil to edit any
                  field, then confirm.
                </div>
              )}

              <PdfPreview file={fileUrl} onLoadPageCount={setPageCount} />

              <div className="grid gap-4 sm:grid-cols-2">
                <LockableField
                  label="Ordinance Number"
                  value={ordinanceNumber}
                  onChange={setOrdinanceNumber}
                  unlocked={unlocked.ordinanceNumber}
                  onToggleLock={() =>
                    setUnlocked((u) => ({ ...u, ordinanceNumber: !u.ordinanceNumber }))
                  }
                  placeholder="e.g. ORD-2026-014"
                />

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Pages
                  </span>
                  <input
                    value={pageCount || uploaded?.extractedPages || 0}
                    disabled
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                </label>

                <div className="sm:col-span-2">
                  <LockableField
                    label="Title"
                    value={title}
                    onChange={setTitle}
                    unlocked={unlocked.title}
                    onToggleLock={() =>
                      setUnlocked((u) => ({ ...u, title: !u.title }))
                    }
                    placeholder="Ordinance title"
                  />
                </div>

                <div className="sm:col-span-2">
                  <LockableField
                    label="Summary"
                    value={summary}
                    onChange={setSummary}
                    unlocked={unlocked.summary}
                    onToggleLock={() =>
                      setUnlocked((u) => ({ ...u, summary: !u.summary }))
                    }
                    placeholder="Short description"
                    multiline
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FileText className="size-3.5" aria-hidden="true" />
                {uploaded?.fileName}
              </div>
            </div>
          )}

          {stage === "creating" && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="size-10 animate-spin text-[#1697cf]" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Saving ordinance and analyzing affected offices...
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Gemini is matching offices from the directory and drafting
                  Cebuano checklists.
                </p>
              </div>
            </div>
          )}

          {stage === "dispatch" && (
            <div className="space-y-4">
              {drafts.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-slate-600">
                    {drafts.length} office{drafts.length === 1 ? "" : "s"} affected.
                    Review and edit each notification before dispatching.
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
                </>
              ) : (
                <div className="py-8 text-center text-sm font-semibold text-slate-400">
                  No notifications to dispatch. The ordinance has been saved.
                </div>
              )}
            </div>
          )}

          {stage === "dispatching" && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="size-10 animate-spin text-[#1697cf]" aria-hidden="true" />
              <p className="text-sm font-bold text-slate-700">
                Dispatching notifications...
              </p>
            </div>
          )}

          {stage === "done" && (
            <div className="space-y-4">
              <div
                className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm font-bold ${
                  sentCount > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {sentCount > 0 ? (
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-5" aria-hidden="true" />
                )}
                Dispatched {sentCount} of {results.length} notifications.
              </div>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {results.map((r, i) => (
                  <li
                    key={`${r.email}-${i}`}
                    className="flex flex-col gap-1 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
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
                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                          Failed
                        </span>
                      )}
                    </div>
                    {r.status === "failed" && r.error && (
                      <p className="text-xs font-medium leading-snug text-red-600">
                        {r.error}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer actions per stage */}
        {stage === "review" && (
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
            >
              Confirm &amp; Analyze
            </button>
          </div>
        )}

        {stage === "dispatch" && (
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              {drafts.length > 0 ? "Skip" : "Close"}
            </button>
            {drafts.length > 0 && (
              <button
                type="button"
                onClick={handleDispatch}
                className="inline-flex items-center gap-2 rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
              >
                <Send className="size-4" aria-hidden="true" />
                Approve &amp; Dispatch
              </button>
            )}
          </div>
        )}

        {stage === "done" && (
          <div className="flex justify-end border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface LockableFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  unlocked: boolean
  onToggleLock: () => void
  placeholder?: string
  multiline?: boolean
}

/**
 * A field that is read-only by default (showing AI-extracted content) with a
 * pencil button to unlock it for editing. If the value is empty, it renders a
 * subtle "needs input" treatment.
 */
function LockableField({
  label,
  value,
  onChange,
  unlocked,
  onToggleLock,
  placeholder,
  multiline = false,
}: LockableFieldProps) {
  const empty = !value.trim()
  const base =
    "w-full rounded-md border px-3 py-2 text-sm outline-none transition"
  const editable =
    "border-slate-200 focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
  const locked = "border-slate-200 bg-slate-50 text-slate-700 cursor-default"
  const needsInput = "border-amber-300 bg-amber-50/40"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <button
          type="button"
          onClick={onToggleLock}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-[#1697cf]"
          aria-label={unlocked ? `Lock ${label}` : `Edit ${label}`}
          title={unlocked ? "Lock" : "Edit"}
        >
          {unlocked ? (
            <Lock className="size-3.5" aria-hidden="true" />
          ) : (
            <Pencil className="size-3.5" aria-hidden="true" />
          )}
          {unlocked ? "Lock" : "Edit"}
        </button>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!unlocked}
          rows={2}
          placeholder={placeholder}
          className={`${base} resize-none ${
            unlocked ? editable : empty ? needsInput : locked
          }`}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!unlocked}
          placeholder={placeholder}
          className={`${base} ${
            unlocked ? editable : empty ? needsInput : locked
          }`}
        />
      )}
    </div>
  )
}
