import Link from "next/link"
import { redirect } from "next/navigation"
import { Landmark } from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { SignIn } from "@clerk/nextjs"

export default async function AdminPage() {
  const { userId } = await auth()

  if (userId) {
    redirect("/admin/dashboard")
  }

  return (
    <main className="min-h-screen bg-[#eaf8ff] text-slate-950">
      <div className="h-1 bg-[#1697cf]" />

      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1697cf] sm:gap-3"
            aria-label="OrdinanceSync home"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1697cf] text-white sm:size-10">
              <Landmark className="size-5" aria-hidden="true" />
            </span>
            <span className="truncate text-[15px] font-black uppercase text-[#1697cf] sm:text-xl">
              OrdinanceSync
            </span>
          </Link>

          <span className="rounded-md bg-[#1697cf]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#1697cf]">
            Admin
          </span>
        </div>
      </header>

      <section className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        <div className="max-w-xl text-center lg:text-left">
          <h1 className="text-4xl font-black leading-[1.12] text-slate-950 sm:text-5xl">
            Admin <span className="text-[#1697cf]">control center</span> for
            Cebu City ordinances.
          </h1>
          <p className="mt-6 text-sm font-semibold leading-7 text-slate-500">
            Sign in with your authorized LGU account to manage ordinances,
            offices, and public policy records. Access is restricted to
            administrators.
          </p>
        </div>

        <div className="flex w-full justify-center lg:w-auto">
          <SignIn routing="hash" fallbackRedirectUrl="/admin/dashboard" />
        </div>
      </section>
    </main>
  )
}
