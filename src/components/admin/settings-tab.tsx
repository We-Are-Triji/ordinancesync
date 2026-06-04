"use client"

import { useEffect, useMemo, useState } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  LogOut,
  Mail,
  Send,
  Settings,
  UsersRound,
  Zap,
} from "lucide-react"
import type { DefaultOrdinanceStatus } from "@/lib/settings"
import { useToast } from "@/components/ui/toast"
import { isValidEmail } from "@/lib/utils"

/**
 * Admin Settings page.
 *
 * Persisted preferences (saved to MongoDB via /api/admin/settings):
 *   - defaultOrdinanceStatus  — applied to ordinances created from the
 *     New Policy modal.
 *   - autoDispatchOnUpload    — when off, the New Policy flow skips the
 *     automatic AI dispatch analysis and the admin dispatches manually.
 *   - defaultTablePageSize    — default page size for admin tables.
 *
 * One-shot actions:
 *   - "Send test email" verifies the Resend integration end-to-end. Hits
 *     /api/admin/settings/test-email and reports success/failure.
 *
 * Plus an Account card (Clerk-backed email + logout) and a Directory stats
 * card (live ordinance/office counts + last dispatch summary).
 *
 * The save model is "edit then commit": the form tracks a `draft` state that
 * the user mutates, the original `serverSettings` lets us tell when it's
 * dirty, and Save sends only the changed fields. Reload reflects whatever
 * came back from the server.
 */

type LastDispatchSummary = {
  ordinanceNumber: string
  ordinanceTitle: string
  sent: number
  failed: number
  dispatchedAt: string
}

type DirectoryStats = {
  totalOrdinances: number
  totalOffices: number
  lastDispatch: LastDispatchSummary | null
}

type AdminSettings = {
  defaultOrdinanceStatus: DefaultOrdinanceStatus
  defaultTablePageSize: number
  autoDispatchOnUpload: boolean
  updatedAt: string
}

type SettingsResponse = {
  settings: AdminSettings
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

const FALLBACK_SETTINGS: AdminSettings = {
  defaultOrdinanceStatus: "active",
  defaultTablePageSize: 10,
  autoDispatchOnUpload: true,
  updatedAt: new Date(0).toISOString(),
}

const FALLBACK_STATS: DirectoryStats = {
  totalOrdinances: 0,
  totalOffices: 0,
  lastDispatch: null,
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function SettingsTab() {
  const router = useRouter()
  const { signOut } = useClerk()
  const { user, isLoaded: userLoaded } = useUser()
  const toast = useToast()

  // Pristine + draft copies. `serverSettings` is "what the DB holds"; `draft`
  // is "what the user has edited but not saved yet". Comparing them tells us
  // when to enable the Save button.
  const [serverSettings, setServerSettings] =
    useState<AdminSettings>(FALLBACK_SETTINGS)
  const [draft, setDraft] = useState<AdminSettings>(FALLBACK_SETTINGS)
  const [stats, setStats] = useState<DirectoryStats>(FALLBACK_STATS)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Test email state — separate from the form save flow so it doesn't fight
  // the Save button.
  const [testEmail, setTestEmail] = useState("")
  const [testEmailSending, setTestEmailSending] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadSettings() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch("/api/admin/settings")
        if (!res.ok) throw new Error("Failed to load settings.")
        const data = (await res.json()) as SettingsResponse
        if (ignore) return
        setServerSettings(data.settings)
        setDraft(data.settings)
        setStats(data.stats)
      } catch (err) {
        if (!ignore) {
          setLoadError(err instanceof Error ? err.message : "Failed to load.")
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

  // Pre-fill the test-email recipient with the signed-in admin's email once
  // Clerk has loaded; safe convenience that never overrides whatever the user
  // typed manually.
  const userEmail = useMemo(
    () =>
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses[0]?.emailAddress ??
      "",
    [user]
  )

  useEffect(() => {
    if (!testEmail && userEmail) setTestEmail(userEmail)
  }, [userEmail, testEmail])

  const dirty =
    draft.defaultOrdinanceStatus !== serverSettings.defaultOrdinanceStatus ||
    draft.defaultTablePageSize !== serverSettings.defaultTablePageSize ||
    draft.autoDispatchOnUpload !== serverSettings.autoDispatchOnUpload

  async function handleLogout() {
    await signOut()
    router.replace("/admin")
  }

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultOrdinanceStatus: draft.defaultOrdinanceStatus,
          defaultTablePageSize: draft.defaultTablePageSize,
          autoDispatchOnUpload: draft.autoDispatchOnUpload,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to save settings.")
      }
      const data = (await res.json()) as SettingsResponse
      setServerSettings(data.settings)
      setDraft(data.settings)
      setStats(data.stats)
      toast.success({ title: "Settings saved" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save."
      toast.error({ title: "Couldn't save settings", description: message })
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setDraft(serverSettings)
  }

  async function handleSendTestEmail() {
    const recipient = testEmail.trim()
    if (!isValidEmail(recipient)) {
      toast.error({
        title: "Invalid email",
        description: "Enter a valid email address before sending a test.",
      })
      return
    }
    setTestEmailSending(true)
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to send test email.")
      }
      toast.success({
        title: "Test email sent",
        description: `Delivered to ${recipient}. Check the inbox to confirm.`,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send test email."
      toast.error({ title: "Email send failed", description: message })
    } finally {
      setTestEmailSending(false)
    }
  }

  const lastDispatch = stats.lastDispatch
  const lastDispatchedAt = formatDate(lastDispatch?.dispatchedAt)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900">Settings</h2>
        <p className="text-sm font-semibold text-slate-500">
          Configure your OrdinanceSync admin workspace.
        </p>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------------- Account ---------------------- */}
        <SectionCard
          icon={<Mail className="size-4" aria-hidden="true" />}
          title="Account"
        >
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Signed in as
              </p>
              <p className="mt-1 break-all text-sm font-bold text-slate-700">
                {userLoaded
                  ? userEmail || "Signed-in admin email is not available."
                  : "Loading account..."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf]"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log Out
            </button>
          </div>
        </SectionCard>

        {/* ---------------------- Directory stats ---------------------- */}
        <SectionCard
          icon={<BarChart3 className="size-4" aria-hidden="true" />}
          title="Directory"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              label="Total Ordinances"
              value={loading ? "…" : stats.totalOrdinances.toLocaleString()}
              icon={<FileText className="size-4 text-[#1697cf]" aria-hidden="true" />}
            />
            <StatTile
              label="Total Offices"
              value={loading ? "…" : stats.totalOffices.toLocaleString()}
              icon={<UsersRound className="size-4 text-[#1697cf]" aria-hidden="true" />}
            />
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Last dispatch
            </p>
            {loading ? (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Loading…
              </p>
            ) : lastDispatch && lastDispatchedAt ? (
              <p className="mt-1 text-sm font-semibold text-slate-700">
                <span className="font-black text-[#1697cf]">
                  {lastDispatch.ordinanceNumber || "Ordinance"}
                </span>{" "}
                · {lastDispatchedAt} —{" "}
                <span className="text-emerald-700">
                  {lastDispatch.sent} sent
                </span>
                {lastDispatch.failed > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-red-600">
                      {lastDispatch.failed} failed
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-500">
                No dispatches yet.
              </p>
            )}
          </div>
        </SectionCard>

        {/* ---------------------- Dispatch defaults ---------------------- */}
        <SectionCard
          icon={<Zap className="size-4" aria-hidden="true" />}
          title="Dispatch"
          className="lg:col-span-2"
        >
          <fieldset disabled={loading || saving} className="space-y-5">
            <div>
              <legend className="text-sm font-bold text-slate-800">
                Default ordinance status
              </legend>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Applied automatically when an ordinance is created from the
                New Policy modal.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {STATUS_OPTIONS.map((option) => {
                  const active = draft.defaultOrdinanceStatus === option.value
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
                          onChange={() =>
                            setDraft((d) => ({
                              ...d,
                              defaultOrdinanceStatus: option.value,
                            }))
                          }
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
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">
                  Auto-run AI dispatch on upload
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  When on, finishing the New Policy flow immediately analyzes
                  affected offices and opens the review-and-approve dispatch
                  step. When off, the ordinance is saved and you can dispatch
                  later from the row action or detail view.
                </p>
              </div>
              <ToggleSwitch
                checked={draft.autoDispatchOnUpload}
                onChange={(checked) =>
                  setDraft((d) => ({ ...d, autoDispatchOnUpload: checked }))
                }
                ariaLabel="Auto-run AI dispatch on upload"
              />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                Send test email
              </p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Verifies the Resend integration end-to-end. Use the signed-in
                admin&apos;s inbox or another address you control.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1697cf] focus:ring-2 focus:ring-[#1697cf]/20 sm:max-w-sm"
                  aria-label="Test email recipient"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testEmailSending}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testEmailSending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="size-4" aria-hidden="true" />
                  )}
                  {testEmailSending ? "Sending…" : "Send test"}
                </button>
              </div>
            </div>
          </fieldset>
        </SectionCard>

        {/* ---------------------- Display preferences ---------------------- */}
        <SectionCard
          icon={<Settings className="size-4" aria-hidden="true" />}
          title="Display"
          className="lg:col-span-2"
        >
          <fieldset disabled={loading || saving}>
            <legend className="text-sm font-bold text-slate-800">
              Default table page size
            </legend>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              How many rows the Active Ordinances and Offices tables show per
              page by default.
            </p>
            <div
              role="radiogroup"
              aria-label="Default table page size"
              className="mt-3 flex flex-wrap gap-2"
            >
              {PAGE_SIZE_OPTIONS.map((size) => {
                const active = draft.defaultTablePageSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      setDraft((d) => ({ ...d, defaultTablePageSize: size }))
                    }
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] ${
                      active
                        ? "bg-[#1697cf] text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-[#1697cf]/40 hover:text-[#1697cf]"
                    }`}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </SectionCard>
      </div>

      {/* ---------------------- Sticky save bar ---------------------- */}
      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs font-semibold text-slate-500">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Loading preferences…
            </span>
          ) : dirty ? (
            <span className="inline-flex items-center gap-2 text-amber-700">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              You have unsaved changes.
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              All changes saved.
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!dirty || saving}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1697cf] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#087fb1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Building blocks                                                          */
/* ------------------------------------------------------------------------ */

function SectionCard({
  icon,
  title,
  className = "",
  children,
}: {
  icon: React.ReactNode
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-sm font-black text-slate-900">
        <span className="text-[#1697cf]">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
    </div>
  )
}

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] focus-visible:ring-offset-2 ${
        checked ? "bg-[#1697cf]" : "bg-slate-300"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}
