"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Landmark } from "lucide-react"

import { TransitionLink } from "@/components/ui/transition-link"

/**
 * Shared, lightweight sticky navigation used across the marketing page and the
 * separate user portals so routing between them stays consistent.
 *
 * Behavior summary:
 *   - On the landing page ("/") the section links smooth-scroll and a
 *     scroll-spy highlights the active section.
 *   - On portal pages they become plain links back to the corresponding
 *     landing section, and the active state follows the route.
 *   - Portal navigations are routed through <TransitionLink> so the page
 *     plays a quick exit animation before the router.push, pairing with the
 *     entrance animation in app/template.tsx for a fluid feel.
 *   - The header gains a subtle shadow + tighter height once the user scrolls
 *     past the hero, signalling that it's pinned.
 */

type SectionNavItem = { label: string; key: string; sectionId: string }
type LinkNavItem = { label: string; key: string; href: string }
type NavItem = SectionNavItem | LinkNavItem

const navItems: NavItem[] = [
  { label: "Home", key: "home", sectionId: "home" },
  { label: "About us", key: "about", sectionId: "about" },
  { label: "Services", key: "services", sectionId: "services" },
  { label: "Policy Chat", key: "chat", href: "/chat" },
]

/** Resolve a section item to a cross-page href (used outside the landing page). */
function sectionHref(item: SectionNavItem) {
  return item.sectionId === "home" ? "/" : `/#${item.sectionId}`
}

export function SiteHeader() {
  const pathname = usePathname()
  const isLanding = pathname === "/"

  // Off the landing page the active item is derived directly from the route,
  // so it never needs a state mirror or setState-in-effect.
  const routeActiveKey = useMemo(() => {
    if (isLanding) return null
    const match = navItems.find((item) => {
      const href = "href" in item ? item.href : sectionHref(item)
      return href === pathname
    })
    return match?.key ?? ""
  }, [isLanding, pathname])

  // On the landing page, the scroll-spy decides which nav item is active.
  // Defaults to "home" until the spy reports otherwise.
  const [spyKey, setSpyKey] = useState<string>("home")
  const [scrolled, setScrolled] = useState(false)

  const activeNav = isLanding ? spyKey : routeActiveKey ?? ""

  // Track scroll to give the sticky header a soft elevation once it leaves
  // the top of the page. Threshold of 8px keeps it from flickering at rest.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!isLanding) return

    // Clear any stray hash left over from a cross-page jump.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname)
    }

    const observedSections = navItems
      .filter((item): item is SectionNavItem => "sectionId" in item)
      .map((item) => document.getElementById(item.sectionId))
      .filter((section): section is HTMLElement => Boolean(section))

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (visibleEntry?.target.id) {
          setSpyKey(visibleEntry.target.id)
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6],
      }
    )

    observedSections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isLanding])

  const scrollToSection = (sectionId: string) => {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
    window.history.replaceState(null, "", window.location.pathname)
  }

  const renderNavLink = (item: NavItem) => {
    const isActive = activeNav === item.key

    // The animated active indicator uses transitions so moving between items
    // feels continuous rather than a hard cut.
    const linkClassName = `relative shrink-0 rounded-md px-2 py-2 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf] ${
      isActive ? "text-[#1697cf]" : "text-slate-600 hover:text-[#1697cf]"
    }`

    const activeDot = (
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-cyan-400 transition-all duration-300 md:-left-1 md:-top-1 md:translate-x-0 ${
          isActive ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      />
    )

    // Direct link items (e.g. Policy Chat) always navigate by route, with the
    // page-exit animation enabled. Active state on the next render is derived
    // from the new pathname, so no local state to update here.
    if ("href" in item) {
      return (
        <TransitionLink
          key={item.key}
          className={linkClassName}
          href={item.href}
        >
          {activeDot}
          {item.label}
        </TransitionLink>
      )
    }

    // Section items smooth-scroll on the landing page, but link across pages
    // (to "/#section") when the header is rendered inside a portal.
    if (!isLanding) {
      return (
        <Link
          key={item.key}
          className={linkClassName}
          href={sectionHref(item)}
        >
          {activeDot}
          {item.label}
        </Link>
      )
    }

    return (
      <button
        key={item.key}
        className={linkClassName}
        type="button"
        onClick={() => {
          // Optimistic update; the spy will keep it in sync after the scroll.
          setSpyKey(item.sectionId)
          scrollToSection(item.sectionId)
        }}
      >
        {activeDot}
        {item.label}
      </button>
    )
  }

  return (
    <>
      <div className="h-1 bg-[#1697cf]" />

      <header
        className={`site-header sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-all duration-300 ${
          scrolled
            ? "border-slate-200 shadow-[0_8px_24px_-12px_rgba(8,127,177,0.18)]"
            : "border-transparent"
        }`}
      >
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 transition-[height] duration-300 sm:px-8 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
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

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-10 text-sm font-semibold text-slate-600 md:flex"
          >
            {navItems.map(renderNavLink)}
          </nav>

          <TransitionLink
            href="/admin"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-[#1697cf] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#087fb1] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1697cf] sm:px-5 sm:text-sm"
          >
            LGU Portal
          </TransitionLink>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex gap-6 overflow-x-auto px-4 pb-3 text-sm font-semibold [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map(renderNavLink)}
        </nav>
      </header>
    </>
  )
}

export default SiteHeader
