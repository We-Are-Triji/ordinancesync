import Link from "next/link"
import { Landmark, LayoutDashboard, ScrollText, ShieldCheck } from "lucide-react"
import { SignIn, Show, UserButton } from "@clerk/nextjs"

const adminTools = [
  {
    title: "Ordinance Management",
    text: "Publish, edit, and archive local legislation.",
    icon: ScrollText,
    href: "/admin/ordinances",
  },
  {
    title: "Review Workflows",
    text: "Track submissions and approval status.",
    icon: LayoutDashboard,
    href: "/admin/workflows",
  },
  {
    title: "Access & Roles",
    text: "Manage LGU team members and permissions.",
    icon: ShieldCheck,
    href: "/admin/access",
  },
]

export default function AdminPage() {
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

      <Show when="signed-out">
        <section className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="max-w-xl text-center lg:text-left">
            <h1 className="text-4xl font-black leading-[1.12] text-slate-950 sm:text-5xl">
              Admin <span className="text-[#1697cf]">control center</span> for
              Cebu City ordinances.
            </h1>
            <p className="mt-6 text-sm font-semibold leading-7 text-slate-500">
              Sign in with your authorized LGU account to manage ordinances,
              review workflows, and oversee public policy records.
            </p>
          </div>

          <div className="flex w-full justify-center lg:w-auto">
            <SignIn routing="hash" fallbackRedirectUrl="/admin" />
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Manage Cebu City ordinances and LGU workflows.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-sm font-semibold text-slate-600">
                Signed in
              </span>
              <UserButton />
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {adminTools.map(({ title, text, icon: Icon, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#1697cf] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf]"
              >
                <span className="flex size-14 items-center justify-center rounded-md bg-[#eaf8ff] text-[#1697cf]">
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-800">{title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {text}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Show>
    </main>
  )
}
