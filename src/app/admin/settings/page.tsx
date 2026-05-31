import { Building2, MapPin, Users } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"

const sections = [
  {
    title: "Sector profile",
    description:
      "Jurisdiction, sector name, and contact details shown across the console.",
    icon: Building2,
  },
  {
    title: "Service area",
    description: "Barangays and districts this office is responsible for.",
    icon: MapPin,
  },
  {
    title: "Team & access",
    description: "Officers who can ingest policies and manage dispatch.",
    icon: Users,
  },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your sector profile, service area, and team access for the OrdinanceSync admin console."
      />

      <div className="animate-rise-delay grid grid-cols-1 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="flex items-start gap-4 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-soft backdrop-blur"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {section.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
