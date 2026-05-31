"use client"

import { Bell, Menu, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

type AdminTopbarProps = {
  /** Opens the mobile navigation drawer. */
  onOpenSidebar: () => void
}

/**
 * Placeholder administrative metadata. In production this is hydrated from the
 * authenticated LGU session (sector, jurisdiction, signed-in officer).
 */
const adminMeta = {
  jurisdiction: "Cebu City Hall",
  sector: "Sangguniang Panlungsod Secretariat",
  officer: "M. Dela Cruz",
  role: "Records Officer III",
}

export function AdminTopbar({ onOpenSidebar }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        {/* Mobile menu trigger */}
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={onOpenSidebar}
        >
          <Menu className="size-4" aria-hidden="true" />
        </Button>

        {/* Jurisdiction / sector metadata */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden size-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand sm:flex">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brand/70">
              {adminMeta.jurisdiction}
            </p>
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
              Sector: {adminMeta.sector}
            </p>
          </div>
        </div>

        {/* Right cluster: status, notifications, identity */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand md:inline-flex">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
            System ready
          </span>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          >
            <Bell className="size-4" aria-hidden="true" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" />
          </Button>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 py-1 pl-1 pr-3">
            <span className="flex size-7 items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white">
              {adminMeta.officer
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-semibold text-slate-900">
                {adminMeta.officer}
              </span>
              <span className="block text-[0.7rem] text-slate-400">
                {adminMeta.role}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
