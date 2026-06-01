"use client"

import { Settings } from "lucide-react"

export default function SettingsTab() {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-900">Settings</h2>
      <p className="text-sm font-semibold text-slate-500">
        Configure your OrdinanceSync admin workspace.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-center">
        <Settings className="size-10 text-[#1697cf]" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-600">
          Settings coming soon
        </p>
        <p className="max-w-sm text-xs font-semibold text-slate-400">
          Workspace preferences, default statuses, and access controls will
          live here.
        </p>
      </div>
    </div>
  )
}
