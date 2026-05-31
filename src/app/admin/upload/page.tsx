import { FileUp, ListChecks, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/admin/page-header"

const pipeline = [
  {
    title: "Parse legal text",
    description: "Extract core mandates, penalties, and the implementation date.",
    icon: Sparkles,
  },
  {
    title: "Autodiscover stakeholders",
    description: "Match mandates to the city offices and barangays that enforce them.",
    icon: ListChecks,
  },
]

export default function UploadPolicyPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Upload New Policy"
        description="Upload a raw PDF ordinance. The agent parses the legal text, extracts mandates and penalties, and drafts routed action checklists."
      />

      {/* Dropzone placeholder */}
      <section className="animate-rise-delay rounded-3xl border border-white/60 bg-white/70 p-6 shadow-soft backdrop-blur">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <FileUp className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold text-slate-900">
            Drop a PDF ordinance here
          </h2>
          <p className="max-w-md text-sm text-slate-500">
            Drag and drop a file, or browse to select. Scanned and text-based
            PDFs are both supported.
          </p>
          <Button className="mt-2 bg-brand text-brand-foreground hover:bg-brand-strong">
            <FileUp className="size-4" aria-hidden="true" />
            Browse files
          </Button>
        </div>
      </section>

      {/* What happens next */}
      <section className="animate-rise-delay-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pipeline.map((step) => {
          const Icon = step.icon
          return (
            <div
              key={step.title}
              className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur"
            >
              <span className="flex size-9 items-center justify-center rounded-2xl bg-slate-100 text-brand">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{step.description}</p>
            </div>
          )
        })}
      </section>
    </div>
  )
}
