"use client"

import { useEffect, useState } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Mail,
  Settings,
  UsersRound,
} from "lucide-react"
import type { DefaultOrdinanceStatus } from "@/lib/settings"
import { useToast } from "@/components/ui/toast"

type DirectoryStats = {
  totalOrdinances: number
  totalOffices: number
}

type SettingsResponse = {
  settings: {
    defaultOrdinanceStatus: DefaultOrdinanceStatus
    defaultTablePageSize: number
    updatedAt: string
  }
  stats: DirectoryStats
}

const STATUS_OPTIONS: {
  value: DefaultOrdinanceStatus
  label: string
  description: string
}[] = [
  {
    value: "active",
    label: "Active",
    description: "New ordinances are ready for public directory workflows.",
  },
  {
    value: "pending",
    label: "Pending",
    description: "New ordinances start in review before becoming active.",
  },
]

export default function SettingsTab() {
  const router = useRouter()
  const { signOut } = useClerk()
  const { user, isLoaded: userLoaded } = useUser()
  const toast = useToast()

  const [defaultStatus, setDefaultStatus] =
    useState<DefaultOrdinanceStatus>("active")
  const [stats, setStats] = useState<DirectoryStats>({
    totalOrdinances: 0,
    totalOffices: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadSettings() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/admin/settings")
        if (!res.ok) throw new Error("Failed to load settings.")
        const data = (await res.json()) as SettingsResponse
        if (ignore) return
        setDefaultStatus(data.settings.defaultOrdinanceStatus)
        setStats(data.stats)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load.")
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadSettings()
    return () => {
      ignore = true
    }
  }, [])

  async function handleLogout() {
    await signOut()
    router.replace("/admin")
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultOrdinanceStatus: defaultStatus }),
      })
      if (!res.ok) throw new Error("Failed to save settings.")
      const data = (await res.json()) as SettingsResponse
      setDefaultStatus(data.settings.defaultOrdinanceStatus)
      setStats(data.stats)
      setSaved(true)
      toast.success({ title: "Settings saved" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save."
      setError(message)
      toast.error({ title: "Couldn't save settings", description: message })
    } finally {
      setSaving(false)
    }
  }

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress

  return (
    <div>
      <h2 className="text-xl font-black text-slate-900">Settings</h2>
      <p className="text-sm font-semibold text-slate-500">
        Configure your OrdinanceSync admin workspace.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
              <Mail className="size-4 text-[#1697cf]" aria-hidden="true" />
              Account
            </h3>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Signed in as
              </p>
              <p className="mt-1 break-all text-sm font-bold text-slate-700">
                {userLoaded
                  ? email ?? "Signed-in admin email is not available."
                  : "Loading account..."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log Out
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
              <Settings className="size-4 text-[#1697cf]" aria-hidden="true" />
              Workspace Preferences
            </h3>
          </div>

          <div className="space-y-5 px-5 py-5">
            <fieldset disabled={loading || saving} className="space-y-3">
              <legend className="text-sm font-bold text-slate-800">
                Default ordinance status
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {STATUS_OPTIONS.map((option) => {
                  const active = defaultStatus === option.value
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg border p-4 transition ${
                        active
                          ? "border-[#1697cf] bg-[#eaf8ff]"
                          : "border-slate-200 bg-white hover:border-[#1697cf]/50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="defaultOrdinanceStatus"
                          value={option.value}
                          checked={active}
                          onChange={() => {
                            setDefaultStatus(option.value)
                            setSaved(false)
                          }}
                          className="size-4 accent-[#1697cf]"
                        />
                        <span className="text-sm font-black text-slate-800">
                          {option.label}
                        </span>
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-slate-500">
                        {option.description}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5">
                {loading && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    Loading preferences...
                  </span>
                )}
                {error && (
                  <p className="text-xs font-bold text-red-600">{error}</p>
                )}
                {saved && !error && (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    Settings saved.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                Save
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
              <BarChart3 className="size-4 text-[#1697cf]" aria-hidden="true" />
              Directory Statistics
            </h3>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Total Ordinances
                </p>
                <FileText className="size-4 text-[#1697cf]" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">
                {loading ? "..." : stats.totalOrdinances.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Total Offices
                </p>
                <UsersRound className="size-4 text-[#1697cf]" aria-hidden="true" />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900">
                {loading ? "..." : stats.totalOffices.toLocaleString()}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
