"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, CircleHelp, Landmark } from "lucide-react"

import { cn } from "@/lib/utils"
import { adminNav } from "./nav"
import { useSidebar } from "./sidebar-context"

type AdminSidebarProps = {
  /** Invoked when a nav link is activated (used to close the mobile drawer). */
  onNavigate?: () => void
  /**
   * Force the expanded layout regardless of collapse state. Used inside the
   * mobile drawer, which is always full-width.
   */
  forceExpanded?: boolean
}

export function AdminSidebar({
  onNavigate,
  forceExpanded = false,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const { collapsed: collapsedState, toggleCollapsed } = useSidebar()
  const collapsed = forceExpanded ? false : collapsedState

  return (
    <div className="flex h-full flex-col bg-white/80 backdrop-blur">
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "flex items-center border-b border-slate-200/70 py-5",
          collapsed ? "justify-center px-3" : "gap-3 px-5"
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-sm">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
              OrdinanceSync
            </p>
            <p className="truncate text-xs text-brand">Admin Console</p>
          </div>
        )}
        {!forceExpanded && !collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            aria-expanded={true}
            title="Collapse sidebar"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Expand control when collapsed */}
      {!forceExpanded && collapsed && (
        <div className="flex justify-center border-b border-slate-200/70 py-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            aria-expanded={false}
            title="Expand sidebar"
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <ChevronLeft className="size-4 rotate-180" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Primary navigation */}
      <nav
        className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}
        aria-label="Primary"
      >
        {!collapsed && (
          <p className="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {adminNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-start rounded-2xl text-sm transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-brand/50",
                    collapsed
                      ? "justify-center px-2 py-2"
                      : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-brand/8 text-brand-strong shadow-sm ring-1 ring-brand/15"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                      !collapsed && "mt-0.5",
                      isActive
                        ? "bg-brand text-brand-foreground"
                        : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-brand"
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span className="block font-medium leading-5">
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs leading-4",
                          isActive ? "text-brand/80" : "text-slate-400"
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer / help */}
      <div className={cn("border-t border-slate-200/70 p-3", collapsed && "px-2")}>
        <a
          href="#"
          title={collapsed ? "Help & Guides" : undefined}
          className={cn(
            "flex items-center rounded-2xl text-sm text-slate-600 transition-colors hover:bg-slate-100/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
            collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2.5"
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CircleHelp className="size-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-medium leading-5">Help &amp; Guides</span>
              <span className="block truncate text-xs leading-4 text-slate-400">
                How ingestion &amp; routing work
              </span>
            </span>
          )}
        </a>
      </div>
    </div>
  )
}
