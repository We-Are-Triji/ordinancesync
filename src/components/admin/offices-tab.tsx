"use client"

import { Building2 } from "lucide-react"

export default function OfficesTab() {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-900">Offices</h2>
      <p className="text-sm font-semibold text-slate-500">
        Manage the LGU offices responsible for ordinances.
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-20 text-center">
        <Building2 className="size-10 text-[#1697cf]" aria-hidden="true" />
        <p className="text-sm font-bold text-slate-600">
          Office management coming soon
        </p>
        <p className="max-w-sm text-xs font-semibold text-slate-400">
          This tab will list city offices and let you assign ordinances to the
          right department.
        </p>
      </div>
    </div>
  )
}
