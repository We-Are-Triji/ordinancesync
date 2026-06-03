"use client"

import dynamic from "next/dynamic"
import { useRef } from "react"
import { X } from "lucide-react"
import type { Ordinance } from "@/lib/types"
import { useFocusTrap } from "@/lib/use-focus-trap"

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
