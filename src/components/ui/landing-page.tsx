"use client"

import Image from "next/image"
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  LockKeyhole,
  MessagesSquare,
  ScrollText,
  Search,
  ShieldCheck,
} from "lucide-react"

import { TransitionLink } from "@/components/ui/transition-link"

const services = [
  {
    title: "Policy Search",
    text: "Find local ordinances fast",
    icon: Search,
    color: "bg-violet-100 text-violet-600",
  },
  {
    title: "AI Assistance",
    text: "Ask plain-language questions",
    icon: Bot,
    color: "bg-lime-100 text-lime-700",
  },
  {
    title: "LGU Workflows",
    text: "Manage reviews and publishing",
    icon: LayoutDashboard,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Public Access",
    text: "Transparent civic records",
    icon: LockKeyhole,
    color: "bg-orange-100 text-orange-600",
  },
]

const governancePoints = [
  "Searchable public ordinance archive",
  "Plain-language policy summaries",
  "Administrative tools for LGU teams",
]

const cebuCitySealUrl =
  "https://upload.wikimedia.org/wikipedia/commons/5/5c/Cebu_City_seal.svg"

export default function LandingPage() {
  // Smooth-scroll helper for in-page CTAs (e.g. the hero "View more" button).
  const scrollToSection = (sectionId: string) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", window.location.pathname)
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section id="home" className="relative overflow-hidden bg-[#eaf8ff]">
        <div className="absolute -left-16 bottom-[-54px] size-44 rounded-full bg-teal-400" />
        <div className="absolute -right-24 top-36 hidden h-64 w-40 rounded-l-full bg-[#1697cf] lg:block" />
        <div className="absolute right-[10%] top-28 hidden size-8 rotate-12 rounded-md bg-rose-500 shadow-[10px_-8px_0_#ff7b8b] lg:block" />
        <div className="absolute left-[58%] top-36 hidden size-7 rounded-full bg-violet-600 shadow-[-4px_-7px_0_#83d44f] lg:block" />

        <div className="mx-auto grid min-h-[520px] max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <h1 className="max-w-xl text-4xl font-black leading-[1.12] text-slate-950 sm:text-5xl">
              Experienced{" "}
              <span className="text-[#1697cf]">digital ordinance</span>{" "}
              platform for Cebu City governance.
            </h1>
            <p className="mt-7 max-w-lg text-sm font-semibold leading-7 text-slate-500">
              OrdinanceSync helps citizens and LGU teams search, understand,
              preserve, and manage local legislation through one accessible
              public policy platform.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <TransitionLink
                href="/chat"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#1697cf] px-8 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#087fb1] hover:shadow-lg hover:shadow-[#1697cf]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf]"
              >
                Search policies
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </TransitionLink>
              <button
                type="button"
                onClick={() => scrollToSection("about")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-[#1697cf] bg-white/50 px-8 text-sm font-bold text-[#1697cf] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf]"
              >
                View more
              </button>
            </div>
          </div>

          <div className="relative z-10 flex min-h-[240px] items-center justify-center lg:min-h-[410px]">
            <div className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 shadow-[0_28px_70px_rgba(0,128,180,0.16)] sm:size-72 lg:size-96" />
            <div className="absolute left-[14%] top-[18%] hidden size-5 rounded-full bg-lime-400 shadow-[12px_10px_0_#6d28d9] sm:block" />
            <div className="absolute right-[16%] top-[16%] hidden size-8 rotate-12 rounded-md bg-rose-500 shadow-[10px_-8px_0_#ff7b8b] sm:block" />
            <div className="absolute bottom-[18%] right-[18%] hidden h-16 w-3 rounded-full bg-[#1697cf] sm:block" />
            <div className="relative flex w-full max-w-[310px] flex-col items-center rounded-md border border-white/80 bg-white/70 px-6 py-7 text-center shadow-2xl shadow-cyan-900/10 backdrop-blur sm:max-w-[390px] sm:px-8 sm:py-9 lg:max-w-[460px]">
              <Image
                src={cebuCitySealUrl}
                alt="Official seal of Cebu City"
                className="h-auto w-44 max-w-full sm:w-56 lg:w-72"
                width="565"
                height="583"
                priority
              />
              <p className="mt-5 text-sm font-black uppercase tracking-wide text-[#1697cf] sm:text-base">
                Cebu City Government
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 sm:text-sm">
                Official city seal for transparent digital governance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="border-b border-slate-200 bg-white px-5 py-7 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
          {services.map(({ title, text, icon: Icon, color }) => (
            <article key={title} className="flex items-center gap-4">
              <div className={`flex size-16 shrink-0 items-center justify-center rounded-md ${color}`}>
                <Icon className="size-7" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800">{title}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-400">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="relative isolate overflow-hidden bg-white px-5 py-20 sm:px-8 lg:py-24">
        <div className="pointer-events-none absolute -right-28 bottom-0 -z-10 size-80 rounded-full bg-violet-50" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
              Local policy access should feel simple, fast, and trustworthy.
            </h2>
            <p className="mt-5 text-sm font-semibold leading-7 text-slate-400">
              Built for citizens, clerks, and city officials, OrdinanceSync
              turns scattered records into a searchable, easier-to-manage civic
              knowledge base.
            </p>
          </div>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
            <div className="relative min-h-[430px]">
              <div className="absolute left-3 top-8 h-72 border-l-2 border-dashed border-slate-200" />
              <div className="relative z-10 space-y-8">
                {governancePoints.map((point, index) => (
                  <div key={point} className="flex max-w-md items-start gap-5">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-400 text-white shadow-lg shadow-teal-400/25">
                      <CheckCircle2 className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        {point}
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
                        {index === 0
                          ? "Give residents a direct path to official local policy records."
                          : index === 1
                            ? "Make complex legislation easier to explore without losing source context."
                            : "Support publishing, review, and preservation from the LGU side."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="rotate-[-10deg] rounded-[2rem] border border-slate-200 bg-slate-950 p-4 shadow-2xl shadow-slate-900/15">
                <div className="overflow-hidden rounded-[1.4rem] bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        Ordinance Finder
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Cebu City public records
                      </p>
                    </div>
                    <ShieldCheck className="size-7 text-[#1697cf]" aria-hidden="true" />
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-center gap-3 rounded-md bg-[#eaf8ff] p-4">
                      <ScrollText className="size-6 text-[#1697cf]" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-700">
                        Ordinance summaries
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-md bg-violet-50 p-4">
                      <MessagesSquare className="size-6 text-violet-600" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-700">
                        Citizen policy chat
                      </span>
                    </div>
                    <div className="flex items-center gap-3 rounded-md bg-lime-50 p-4">
                      <Building2 className="size-6 text-lime-700" aria-hidden="true" />
                      <span className="text-sm font-bold text-slate-700">
                        LGU management portal
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 mt-14 flex justify-center">
            <TransitionLink
              href="/chat"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#1697cf] px-8 text-sm font-bold text-white transition-all duration-200 hover:bg-[#087fb1] hover:shadow-lg hover:shadow-[#1697cf]/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf]"
            >
              Start searching
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </TransitionLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>OrdinanceSync Cebu City digital governance platform.</p>
          <div className="flex gap-5">
            <TransitionLink className="transition-colors hover:text-[#1697cf]" href="/chat">
              Policy Chat
            </TransitionLink>
            <TransitionLink className="transition-colors hover:text-[#1697cf]" href="/admin">
              LGU Portal
            </TransitionLink>
          </div>
        </div>
      </footer>
    </main>
  )
}
