"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/TextLayer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

// Load the worker locally (copied to /public) so the version always matches
// the bundled pdfjs-dist, avoiding CDN version-mismatch errors.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

interface PdfPreviewProps {
  file: string | File
  onLoadPageCount?: (count: number) => void
}

export default function PdfPreview({ file, onLoadPageCount }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [error, setError] = useState<string | null>(null)

  function handleLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    onLoadPageCount?.(numPages)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex max-h-[60vh] w-full justify-center overflow-auto rounded-md border border-slate-200 bg-slate-100 p-3">
        {error ? (
          <div className="flex h-40 items-center justify-center text-sm font-semibold text-red-600">
            {error}
          </div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={() => setError("Could not render this PDF.")}
            loading={
              <div className="flex h-40 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading preview...
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={460}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        )}
      </div>

      {numPages > 0 && !error && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold text-slate-600">
            Page {pageNumber} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
