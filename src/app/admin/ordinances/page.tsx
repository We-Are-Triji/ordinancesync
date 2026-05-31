import { Activity, FileText, Plus, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/admin/page-header"

const stats = [
  { label: "Active ordinances", value: "—", icon: FileText },
  { label: "Pending dispatch", value: "—", icon: Send },
  { label: "Offices notified", value: "—", icon: Activity },
]

export default function ActiveOrdinancesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Active Ordinances"
        description="Monitor active ordinances and the status of action items dispatched to city departments and barangays."
        actions={
          <Button className="bg-brand text-brand-foreground hover:bg-brand-strong">
            <Plus className="size-4" aria-hidden="true" />
            New policy
          </Button>
        }
      />

      {/* Stat row */}
      <div className="animate-rise-delay grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{stat.label}</span>
                <span className="flex size-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                {stat.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Empty-state panel */}
      <section className="animate-rise-delay-2 rounded-3xl border border-white/60 bg-white/70 p-8 shadow-soft backdrop-blur">
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FileText className="size-6" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold text-slate-900">
            No ordinances yet
          </h2>
          <p className="max-w-md text-sm text-slate-500">
            Ingested ordinances and their dispatch tracking will appear here.
            Upload a policy PDF to get started.
          </p>
          <Button variant="outline" className="mt-2">
            <Plus className="size-4" aria-hidden="true" />
            Upload new policy
          </Button>
        </div>
      </section>
    </div>
  )
}
