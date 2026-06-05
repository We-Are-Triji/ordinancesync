"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  FileSearch,
  LayoutDashboard,
  LockKeyhole,
  MessagesSquare,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { Mascot } from "@/components/chat/mascot"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/* Brand tokens — derived from the OrdinanceSync logo visual language         */
/* -------------------------------------------------------------------------- */

const navy = "#0B2E59"
const gold = "#D9A441"
const cream = "#FAF7F2"
const creamDark = "#F3EFE8"
const stone = "#E8E4DC"
const slateMuted = "#64748B"

const trustStats = [
  {
    value: "500+",
    label: "Ordinances indexed",
    detail: "Comprehensive Cebu City legislative archive",
  },
  {
    value: "24/7",
    label: "Public access",
    detail: "Search and explore policy on your schedule",
  },
  {
    value: "AI",
    label: "Guided assistance",
    detail: "Plain-language answers with source citations",
  },
  {
    value: "100%",
    label: "Source transparency",
    detail: "Every answer links back to official records",
  },
]

const features = [
  {
    title: "Policy Search",
    description:
      "Find ordinances by keyword, topic, or ordinance number across the full public archive.",
    icon: Search,
    className: "md:col-span-2 md:row-span-1",
    accent: "bg-[#0B2E59]/[0.06] text-[#0B2E59]",
  },
  {
    title: "AI Assistance",
    description:
      "Ask questions in everyday language and receive clear summaries grounded in official text.",
    icon: Bot,
    className: "md:col-span-1",
    accent: "bg-[#D9A441]/10 text-[#B8872E]",
  },
  {
    title: "Source Citations",
    description:
      "Every response references the original ordinance so you can verify with confidence.",
    icon: FileSearch,
    className: "md:col-span-1",
    accent: "bg-[#0B2E59]/[0.06] text-[#0B2E59]",
  },
  {
    title: "LGU Workflows",
    description:
      "Administrative tools for publishing, reviewing, and maintaining legislative records.",
    icon: LayoutDashboard,
    className: "md:col-span-1",
    accent: "bg-[#D9A441]/10 text-[#B8872E]",
  },
  {
    title: "Public Access",
    description:
      "Open, transparent civic records designed for residents, businesses, and researchers.",
    icon: LockKeyhole,
    className: "md:col-span-2",
    accent: "bg-[#0B2E59]/[0.06] text-[#0B2E59]",
  },
]

const steps = [
  {
    step: "01",
    title: "Ask or search",
    description:
      "Enter a question in plain language or search by keyword, topic, or ordinance number.",
    icon: Search,
  },
  {
    step: "02",
    title: "Review guided answers",
    description:
      "Receive structured summaries with direct links to the official ordinance sources.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Access official records",
    description:
      "Open the source document to read the full legislative text with complete transparency.",
    icon: ScrollText,
  },
]

const chatPreview = {
  question: "What are the permitted noise ordinance hours in Cebu City?",
  answer:
    "Under Cebu City Ordinance No. 2440, amplified sound in residential zones is generally restricted between 10:00 PM and 6:00 AM. Commercial establishments near schools and hospitals may have additional limits.",
  citation: "Ordinance No. 2440 · Article IV, Section 12",
}

const navItems = [
  { label: "Home", sectionId: "home", key: "home" },
  { label: "Features", sectionId: "features", key: "features" },
  { label: "How it works", sectionId: "how-it-works", key: "how-it-works" },
  { label: "Policy Chat", href: "/chat", key: "chat" },
] as const

type NavItem = (typeof navItems)[number]

/* -------------------------------------------------------------------------- */
/* Scroll-reveal animation                                                    */
/* -------------------------------------------------------------------------- */

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced-motion users see content immediately via CSS overrides below.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        className
      )}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Decorative elements inspired by heritage architecture & logo composition   */
/* -------------------------------------------------------------------------- */

function SectionCurve({ flip = false }: { flip?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative h-12 w-full overflow-hidden sm:h-16", flip && "rotate-180")}
    >
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <path
          d="M0,32 Q360,64 720,32 T1440,32 L1440,64 L0,64 Z"
          fill={cream}
        />
      </svg>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Landing page                                                               */
/* -------------------------------------------------------------------------- */

export default function LandingPage() {
  const [activeNav, setActiveNav] = useState("home")

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname)
    }

    const sectionIds = ["home", "trust", "features", "how-it-works", "example", "cta"]
    const observedSections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visibleEntry?.target.id) {
          const id = visibleEntry.target.id
          if (id === "trust") {
            setActiveNav("home")
          } else if (id === "example" || id === "cta") {
            setActiveNav("how-it-works")
          } else {
            setActiveNav(id)
          }
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    )

    observedSections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const scrollToSection = (sectionId: string) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", window.location.pathname)
  }

  const renderNavLink = (item: NavItem) => {
    const isActive = activeNav === item.key
    const linkClassName = cn(
      "relative shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      isActive ? "text-[#0B2E59]" : "text-slate-600 hover:text-[#0B2E59]"
    )

    if ("href" in item) {
      return (
        <Link
          key={item.key}
          className={linkClassName}
          href={item.href}
          style={{ outlineColor: navy }}
          onClick={() => setActiveNav(item.key)}
        >
          {isActive && (
            <span
              className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full"
              style={{ backgroundColor: gold }}
            />
          )}
          {item.label}
        </Link>
      )
    }

    return (
      <button
        key={item.key}
        className={linkClassName}
        type="button"
        style={{ outlineColor: navy }}
        onClick={() => {
          setActiveNav(item.key)
          scrollToSection(item.sectionId)
        }}
      >
        {isActive && (
          <span
            className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full"
            style={{ backgroundColor: gold }}
          />
        )}
        {item.label}
      </button>
    )
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden text-slate-900"
      style={{ backgroundColor: cream }}
    >
      {/* Gold accent bar */}
      <div className="h-1" style={{ backgroundColor: gold }} />

      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm"
        style={{ borderColor: stone }}
      >
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:gap-3"
            style={{ outlineColor: navy }}
            aria-label="OrdinanceSync home"
          >
            <span className="flex size-9 shrink-0 items-center justify-center sm:size-10">
              <Logo size={40} priority className="size-full" />
            </span>
            <span
              className="type-subsection truncate text-[15px] sm:text-lg"
              style={{ color: navy }}
            >
              OrdinanceSync
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-8 md:flex"
          >
            {navItems.map(renderNavLink)}
          </nav>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map(renderNavLink)}
        </nav>
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(ellipse 72% 58% at 50% 18%, rgba(217,164,65,0.18) 0%, transparent 68%)`,
          }}
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-5 py-16 text-center sm:px-8 lg:py-24">
          <FadeIn className="flex w-full flex-col items-center">
            <div className="relative mx-auto flex w-full max-w-md justify-center">
              <div
                className="absolute left-1/2 top-8 z-10 -translate-x-1/2 rounded-3xl border bg-white px-4 py-2 text-left text-xs font-bold shadow-[0_8px_22px_rgba(11,46,89,0.08)] sm:left-[66%] sm:top-11 sm:w-64 sm:translate-x-0"
                style={{ borderColor: stone, color: navy }}
              >
                Kumusta! Ask me anything about Cebu City ordinances.
                <span
                  aria-hidden="true"
                  className="absolute -bottom-2 left-8 size-4 rotate-45 border-b border-r bg-white sm:left-6"
                  style={{ borderColor: stone }}
                />
              </div>

              <div
                className="mt-20 rounded-full border p-5 shadow-[0_20px_56px_rgba(11,46,89,0.12)] sm:mt-0 sm:p-7"
                style={{ borderColor: stone, backgroundColor: creamDark }}
              >
                <Mascot state="greeting" size={260} aria-hidden={false} />
              </div>
            </div>

            <h1
              className="type-hero mt-8 max-w-3xl"
              style={{ color: navy }}
            >
              Meet Asst. Kiko, your friendly guide to{" "}
              <span style={{ color: gold }}>Cebu City ordinances</span>
            </h1>

            <p
              className="type-body-lg mt-6 max-w-2xl"
              style={{ color: slateMuted }}
            >
              Ask in English or Bisaya and Kiko will help you find clear,
              source-backed answers from local ordinances in a plain,
              conversational way.
            </p>

            <div className="mt-9 flex flex-col items-center gap-4">
              <Link
                href="/chat"
                className="type-button inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0B2E59] px-8 text-white shadow-[0_4px_14px_rgba(11,46,89,0.18)] transition-all hover:bg-[#134A7A] hover:shadow-[0_8px_24px_rgba(11,46,89,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B2E59]"
              >
                Ask Kiko
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SectionCurve />

      {/* Trust */}
      <section
        id="trust"
        className="border-y bg-white px-5 py-16 sm:px-8 lg:py-20"
        style={{ borderColor: stone }}
      >
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="type-label" style={{ color: gold }}>
                Trusted civic infrastructure
              </p>
              <h2 className="type-section mt-3" style={{ color: navy }}>
                Built for transparency, designed for everyone
              </h2>
              <p className="type-body-lg mt-4" style={{ color: slateMuted }}>
                From ordinance coverage to AI-guided discovery, every capability
                is oriented toward open, accountable public access.
              </p>
            </div>
          </FadeIn>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trustStats.map((stat, index) => (
              <FadeIn key={stat.label} delay={index * 80}>
                <article
                  className="rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,89,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(11,46,89,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <p className="type-stat" style={{ color: navy }}>
                    {stat.value}
                  </p>
                  <h3 className="type-subsection mt-2 text-sm" style={{ color: navy }}>
                    {stat.label}
                  </h3>
                  <p className="type-body mt-2 text-sm" style={{ color: slateMuted }}>
                    {stat.detail}
                  </p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <div className="max-w-2xl">
              <p className="type-label" style={{ color: gold }}>
                Platform capabilities
              </p>
              <h2 className="type-section mt-3" style={{ color: navy }}>
                Everything you need to navigate local policy
              </h2>
              <p className="type-body-lg mt-4" style={{ color: slateMuted }}>
                A refined toolkit for citizens seeking clarity and LGU teams
                managing the legislative record.
              </p>
            </div>
          </FadeIn>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <FadeIn
                  key={feature.title}
                  delay={index * 70}
                  className={feature.className}
                >
                  <article
                    className="flex h-full flex-col rounded-2xl border border-[#E8E4DC] bg-white p-6 shadow-[0_2px_8px_rgba(11,46,89,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(11,46,89,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7"
                  >
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl",
                        feature.accent
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="type-subsection mt-5" style={{ color: navy }}>
                      {feature.title}
                    </h3>
                    <p className="type-body mt-2 flex-1" style={{ color: slateMuted }}>
                      {feature.description}
                    </p>
                  </article>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-y px-5 py-20 sm:px-8 lg:py-28"
        style={{ borderColor: stone, backgroundColor: creamDark }}
      >
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="type-label" style={{ color: gold }}>
                How it works
              </p>
              <h2 className="type-section mt-3" style={{ color: navy }}>
                From question to official source in three steps
              </h2>
              <p className="type-body-lg mt-4" style={{ color: slateMuted }}>
                A straightforward process designed for clarity — no technical
                expertise required.
              </p>
            </div>
          </FadeIn>

          <div className="relative mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10">
            <div
              aria-hidden="true"
              className="absolute left-[16.67%] right-[16.67%] top-10 hidden h-px lg:block"
              style={{ backgroundColor: stone }}
            />

            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <FadeIn key={step.step} delay={index * 100}>
                  <div className="relative text-center lg:text-left">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-white lg:mx-0"
                      style={{ borderColor: stone, boxShadow: "0 2px 8px rgba(11, 46, 89, 0.06)" }}
                    >
                      <Icon className="size-6" style={{ color: navy }} aria-hidden="true" />
                    </div>
                    <p className="type-label mt-5" style={{ color: gold }}>
                      Step {step.step}
                    </p>
                    <h3 className="type-subsection mt-2 text-xl" style={{ color: navy }}>
                      {step.title}
                    </h3>
                    <p className="type-body mt-3" style={{ color: slateMuted }}>
                      {step.description}
                    </p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* Example conversation */}
      <section id="example" className="px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <FadeIn>
              <p className="type-label" style={{ color: gold }}>
                Example conversation
              </p>
              <h2 className="type-section mt-3" style={{ color: navy }}>
                Policy questions, answered with sources
              </h2>
              <p className="type-body-lg mt-4" style={{ color: slateMuted }}>
                OrdinanceSync delivers structured, readable responses that always
                point back to the official legislative record — so you can trust
                what you read and verify what you need.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "Plain-language summaries of complex ordinances",
                  "Direct citations to source documents",
                  "Designed for residents, businesses, and researchers",
                ].map((point) => (
                  <li key={point} className="type-body flex items-start gap-3" style={{ color: slateMuted }}>
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: gold }}
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={120}>
              <div
                className="overflow-hidden rounded-2xl border bg-white"
                style={{
                  borderColor: stone,
                  boxShadow: "0 12px 40px rgba(11, 46, 89, 0.08)",
                }}
              >
                <div
                  className="flex items-center justify-between border-b px-5 py-4 sm:px-6"
                  style={{ borderColor: stone, backgroundColor: creamDark }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${navy}0F` }}
                    >
                      <MessagesSquare className="size-4" style={{ color: navy }} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="type-subsection text-sm" style={{ color: navy }}>
                        Policy Chat
                      </p>
                      <p className="type-body text-xs" style={{ color: slateMuted }}>
                        Cebu City ordinances
                      </p>
                    </div>
                  </div>
                  <ShieldCheck className="size-5" style={{ color: gold }} aria-hidden="true" />
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <div className="flex justify-end">
                    <div
                      className="type-body max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-white"
                      style={{ backgroundColor: navy }}
                    >
                      {chatPreview.question}
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div
                      className="max-w-[92%] rounded-2xl rounded-bl-md border px-4 py-3"
                      style={{ borderColor: stone, backgroundColor: cream }}
                    >
                      <p className="type-body" style={{ color: slateMuted }}>
                        {chatPreview.answer}
                      </p>
                      <div
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium leading-snug"
                        style={{ backgroundColor: `${gold}18`, color: navy }}
                      >
                        <ScrollText className="size-3.5" aria-hidden="true" />
                        {chatPreview.citation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="px-5 pb-20 sm:px-8 lg:pb-28">
        <FadeIn>
          <div
            className="mx-auto max-w-4xl overflow-hidden rounded-3xl border px-6 py-14 text-center sm:px-12 sm:py-16"
            style={{
              borderColor: stone,
              backgroundColor: navy,
              boxShadow: "0 16px 48px rgba(11, 46, 89, 0.16)",
            }}
          >
            <Building2
              className="mx-auto size-8"
              style={{ color: gold }}
              aria-hidden="true"
            />
            <h2 className="type-section mt-5 text-white lg:text-3xl">
              Ready to explore Cebu City ordinances?
            </h2>
            <p className="type-body-lg mx-auto mt-4 max-w-lg text-white/75">
              Start a conversation with Policy Chat and discover local
              legislation with the clarity and transparency you deserve.
            </p>
            <Link
              href="/chat"
              className="type-button mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 transition-all hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ backgroundColor: gold, color: navy }}
            >
              Open Policy Chat
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-5 py-10 sm:px-8"
        style={{ borderColor: stone, backgroundColor: creamDark }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo size={32} alt="" className="size-8" />
            <div>
              <p className="type-subsection text-sm" style={{ color: navy }}>
                OrdinanceSync
              </p>
              <p className="type-body text-xs" style={{ color: slateMuted }}>
                Cebu City digital governance platform
              </p>
            </div>
          </div>

          <div className="type-body flex flex-wrap items-center gap-6" style={{ color: slateMuted }}>
            <Link
              href="/chat"
              className="font-medium transition-colors hover:text-[#0B2E59]"
            >
              Policy Chat
            </Link>
            <button
              type="button"
              className="font-medium transition-colors hover:text-[#0B2E59]"
              onClick={() => scrollToSection("features")}
            >
              Features
            </button>
            <button
              type="button"
              className="font-medium transition-colors hover:text-[#0B2E59]"
              onClick={() => scrollToSection("how-it-works")}
            >
              How it works
            </button>
          </div>
        </div>
      </footer>
    </main>
  )
}
