"use client"

import { useCallback, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react"
import type { Ordinance } from "@/lib/types"

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

type Stage = "select" | "uploading" | "preview" | "saving"

interface UploadResult {
  fileId: string
  fileName: string
  fileSize: number
  text?: string
  extractedPages?: number
}

interface NewPolicyModalProps {
  onClose: () => void
  onCreated: (ordinance: Ordinance) => void
}

export default function NewPolicyModal({
  onClose,
  onCreated,
}: NewPolicyModalProps) {
  const [stage, setStage] = useState<Stage>("select")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploaded, setUploaded] = useState<UploadResult | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  const [ordinanceNumber, setOrdinanceNumber] = useState("")
  const [title, setTitle] = useState("")
  const [office, setOffice] = useState("")
  const [summary, setSummary] = useState("")

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
        setStage("preview")
        if (!title) setTitle(selected.name.replace(/\.pdf$/i, ""))
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
  }, [title])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) startUpload(dropped)
  }

  async function handleConfirm() {
    if (!uploaded) return
    if (!ordinanceNumber.trim() || !title.trim() || !office.trim()) {
      setError("Ordinance number, title, and office are required.")
      return
    }

    setStage("saving")
    setError(null)

    try {
      const res = await fetch("/api/admin/ordinances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordinanceNumber,
          title,
          office,
          summary,
          pageCount,
          fileId: uploaded.fileId,
          fileName: uploaded.fileName,
          fileSize: uploaded.fileSize,
          text: uploaded.text ?? "",
          status: "active",
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to save policy.")
      }

      const created = (await res.json()) as Ordinance
      onCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy.")
      setStage("preview")
    }
  }

  const fileUrl = uploaded
    ? `/api/admin/ordinances/file/${uploaded.fileId}`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add new policy"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">New Policy</h2>
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
                PDF only, up to 25 MB
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
                Uploading {file?.name}
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

          {(stage === "preview" || stage === "saving") && fileUrl && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Upload complete. Review the preview and fill in the details.
              </div>

              <PdfPreview file={fileUrl} onLoadPageCount={setPageCount} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Ordinance Number
                  </span>
                  <input
                    value={ordinanceNumber}
                    onChange={(e) => setOrdinanceNumber(e.target.value)}
                    placeholder="e.g. ORD-2026-014"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Office
                  </span>
                  <input
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                    placeholder="e.g. City Council"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
                  />
                </label>
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Title
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ordinance title"
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
                    rows={2}
                    placeholder="Short description"
                    className="resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <FileText className="size-3.5" aria-hidden="true" />
                {uploaded?.fileName} · {pageCount} page(s)
              </div>
            </div>
          )}
        </div>

        {(stage === "preview" || stage === "saving") && (
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={stage === "saving"}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={stage === "saving"}
              className="inline-flex items-center gap-2 rounded-md bg-[#1697cf] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] disabled:opacity-60"
            >
              {stage === "saving" && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {stage === "saving" ? "Saving..." : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
