"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, FileStack, Landmark, LogOut, Settings } from "lucide-react"
import { useClerk } from "@clerk/nextjs"
import { ToastProvider } from "@/components/ui/toast"
import ActiveOrdinances from "./active-ordinances"
import OfficesTab from "./offices-tab"
import SettingsTab from "./settings-tab"

type TabKey = "ordinances" | "offices" | "settings"

const tabs: { key: TabKey; label: string; icon: typeof FileStack }[] = [
  { key: "ordinances", label: "Active Ordinances", icon: FileStack },
  { key: "offices", label: "Offices", icon: Building2 },
  { key: "settings", label: "Settings", icon: Settings },
]

export default function DashboardShell() {
  const [active, setActive] = useState<TabKey>("ordinances")
  const { signOut } = useClerk()
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.replace("/admin")
  }

  return (
    <ToastProvider>
      <main className="min-h-screen bg-[#eaf8ff] text-slate-950">
        <div className="h-1 bg-[#1697cf]" />

        <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 rounded-md sm:gap-3"
              aria-label="OrdinanceSync home"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1697cf] text-white sm:size-10">
                <Landmark className="size-5" aria-hidden="true" />
              </span>
              <span className="truncate text-[15px] font-black uppercase text-[#1697cf] sm:text-xl">
                OrdinanceSync
              </span>
              <span className="rounded-md bg-[#1697cf]/10 px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#1697cf]">
                Admin
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Logout
            </button>
          </div>

          <nav
            aria-label="Dashboard tabs"
            className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-8"
          >
            {tabs.map(({ key, label, icon: Icon }) => {
              const isActive = active === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? "border-[#1697cf] text-[#1697cf]"
                      : "border-transparent text-slate-500 hover:text-[#1697cf]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              )
            })}
          </nav>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
          {active === "ordinances" && <ActiveOrdinances />}
          {active === "offices" && <OfficesTab />}
          {active === "settings" && <SettingsTab />}
        </section>
      </main>
    </ToastProvider>
  )
}
