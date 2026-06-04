"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronsLeft,
  ChevronsRight,
  FileStack,
  Landmark,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react"
import { useClerk, useUser } from "@clerk/nextjs"
import { ToastProvider } from "@/components/ui/toast"
import { useFocusTrap } from "@/lib/use-focus-trap"
import ActiveOrdinances from "./active-ordinances"
import OfficesTab from "./offices-tab"
import SettingsTab from "./settings-tab"

/**
 * Admin dashboard shell.
 *
 * Layout:
 *   - Desktop (>=md): collapsible left rail. Toggle lives at the top of the
 *     rail (next to the brand mark) — common pattern in Linear, Vercel,
 *     Supabase, etc. The user's preference is persisted to localStorage so
 *     it survives reloads.
 *   - Mobile (<md): the same nav becomes an off-canvas drawer with focus
 *     trap, Escape close, and body-scroll lock.
 *   - Top bar: breadcrumb-style section path, page title, and a Clerk-backed
 *     user chip with an account menu (logout lives here too).
 *
 * The nav itself is short (3 items) so it intentionally does NOT scroll —
 * scrolling a 3-item list is jarring on tall screens.
 *
 * Tab components (ActiveOrdinances, OfficesTab, SettingsTab) are unchanged;
 * only the chrome around them is.
 */

type TabKey = "ordinances" | "offices" | "settings"

interface NavItem {
  key: TabKey
  label: string
  description: string
  icon: typeof FileStack
}

const navItems: NavItem[] = [
  {
    key: "ordinances",
    label: "Active Ordinances",
    description: "Search, edit, and dispatch local ordinances.",
    icon: FileStack,
  },
  {
    key: "offices",
    label: "Offices",
    description: "Master directory of LGU offices and barangays.",
    icon: Building2,
  },
  {
    key: "settings",
    label: "Settings",
    description: "Workspace preferences and account.",
    icon: Settings,
  },
]

const COLLAPSED_KEY = "os_admin_sidebar_collapsed"

export default function DashboardShell() {
  const [active, setActive] = useState<TabKey>("ordinances")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const { signOut } = useClerk()
  const { user } = useUser()
  const router = useRouter()

  const activeItem = navItems.find((item) => item.key === active) ?? navItems[0]

  // Restore collapse preference on first paint (try/catch handles private-mode
  // browsers that disallow localStorage).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true)
    } catch {
      /* ignore */
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  // Mobile drawer: lock scroll + close on Escape while open.
  useEffect(() => {
    if (!drawerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen])

  async function handleLogout() {
    await signOut()
    router.replace("/admin")
  }

  function selectTab(key: TabKey) {
    setActive(key)
    setDrawerOpen(false)
  }

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    "Admin"
  const userInitial = userEmail.slice(0, 1).toUpperCase()

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-950">
        <DesktopSidebar
          activeKey={active}
          collapsed={collapsed}
          onSelect={selectTab}
          onToggleCollapsed={toggleCollapsed}
          onLogout={handleLogout}
        />

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeKey={active}
          onSelect={selectTab}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            activeItem={activeItem}
            userEmail={userEmail}
            userInitial={userInitial}
            onOpenDrawer={() => setDrawerOpen(true)}
            onLogout={handleLogout}
          />

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_28px_-12px_rgba(8,127,177,0.12)] sm:p-6 lg:p-8">
              {active === "ordinances" && <ActiveOrdinances />}
              {active === "offices" && <OfficesTab />}
              {active === "settings" && <SettingsTab />}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

/* ------------------------------------------------------------------------ */
/* Desktop sidebar                                                          */
/* ------------------------------------------------------------------------ */

interface DesktopSidebarProps {
  activeKey: TabKey
  collapsed: boolean
  onSelect: (key: TabKey) => void
  onToggleCollapsed: () => void
  onLogout: () => void | Promise<void>
}

function DesktopSidebar({
  activeKey,
  collapsed,
  onSelect,
  onToggleCollapsed,
  onLogout,
}: DesktopSidebarProps) {
  return (
    <aside
      aria-label="Primary navigation"
      className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-out md:flex ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      {/* Floating collapse/expand toggle, pinned to the right edge at the
          vertical midpoint of the sidebar. Same anchor in both states so the
          control feels stable when toggling. Square (rounded-md), slightly
          larger than a chip so it stays easy to hit. */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute right-0 top-1/2 z-10 inline-flex size-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#1697cf]/40 hover:bg-[#1697cf]/5 hover:text-[#1697cf] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf]"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronsRight className="size-4" aria-hidden="true" />
        ) : (
          <ChevronsLeft className="size-4" aria-hidden="true" />
        )}
      </button>

      {/* Brand strip with the collapse toggle on the right edge. Toggle moved
          here from the bottom — it's the dominant pattern in modern dashboards
          (Linear / Vercel / Supabase) and gives the user immediate access. */}
      <SidebarBrand collapsed={collapsed} />

      {/* Section heading. Hidden when collapsed so the rail stays minimal. */}
      {!collapsed && (
        <div className="px-5 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>
        </div>
      )}

      {/* Nav — intentionally NOT scrollable. Three items fit on every screen
          we care about, and an internal scrollbar on a sidebar reads as a
          glitch, not a feature. */}
      <nav className={`mt-2 px-3 ${collapsed ? "pt-3" : ""}`}>
        <ul className="space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = activeKey === key
            return (
              <li key={key} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`peer relative flex w-full items-center gap-3 rounded-lg text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    collapsed ? "h-11 justify-center px-0" : "px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-[#1697cf]/10 text-[#1697cf]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {/* Inner-edge accent for the active item. */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-0 h-6 w-1 rounded-r-full transition ${
                      isActive ? "bg-[#1697cf]" : "bg-transparent"
                    }`}
                  />
                  <Icon
                    className={`size-[18px] shrink-0 ${
                      isActive
                        ? "text-[#1697cf]"
                        : "text-slate-400 group-hover:text-slate-700"
                    }`}
                    aria-hidden="true"
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </button>

                {/* Hover/focus tooltip for collapsed state. CSS-only, no
                    popover runtime. */}
                {collapsed && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition peer-hover:opacity-100 peer-focus-visible:opacity-100"
                  >
                    {label}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Spacer pushes logout to the bottom without using a scrollable nav. */}
      <div className="flex-1" />

      {/* Footer logout — full-width when expanded, square icon button when
          collapsed (with the same hover-tooltip treatment as nav items). */}
      <div className="border-t border-slate-200 p-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => void onLogout()}
            className={`peer inline-flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] ${
              collapsed ? "h-10 justify-center px-0" : "px-3 py-2"
            }`}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {!collapsed && <span>Logout</span>}
          </button>
          {collapsed && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition peer-hover:opacity-100 peer-focus-visible:opacity-100"
            >
              Logout
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------------ */
/* Mobile drawer                                                            */
/* ------------------------------------------------------------------------ */

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  activeKey: TabKey
  onSelect: (key: TabKey) => void
  onLogout: () => void | Promise<void>
}

function MobileDrawer({
  open,
  onClose,
  activeKey,
  onSelect,
  onLogout,
}: MobileDrawerProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, { onClose, active: open })

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarBrand collapsed={false} onCloseDrawer={onClose} />

        <div className="px-5 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>
        </div>

        <nav className="mt-2 px-3">
          <ul className="space-y-1">
            {navItems.map(({ key, label, icon: Icon }) => {
              const isActive = activeKey === key
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSelect(key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] ${
                      isActive
                        ? "bg-[#1697cf]/10 text-[#1697cf]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-0 h-6 w-1 rounded-r-full transition ${
                        isActive ? "bg-[#1697cf]" : "bg-transparent"
                      }`}
                    />
                    <Icon
                      className={`size-[18px] shrink-0 ${
                        isActive ? "text-[#1697cf]" : "text-slate-400"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex-1" />

        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={() => {
              onClose()
              void onLogout()
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf]"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* Sidebar brand strip (logo + collapse toggle on desktop, X on mobile)     */
/* ------------------------------------------------------------------------ */

interface SidebarBrandProps {
  collapsed: boolean
  onCloseDrawer?: () => void
}

function SidebarBrand({ collapsed, onCloseDrawer }: SidebarBrandProps) {
  return (
    <div
      className={`flex h-16 items-center gap-3 border-b border-slate-200 ${
        collapsed ? "justify-center px-2" : "px-4"
      }`}
    >
      <Link
        href="/"
        aria-label="OrdinanceSync home"
        className="flex min-w-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1697cf] text-white shadow-sm shadow-[#1697cf]/30">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-black uppercase tracking-wide text-slate-900">
              OrdinanceSync
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1697cf]">
              Admin
            </span>
          </span>
        )}
      </Link>

      {/* Mobile close button. */}
      {onCloseDrawer && (
        <button
          type="button"
          onClick={onCloseDrawer}
          className="ml-auto inline-flex size-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf]"
          aria-label="Close navigation"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Top bar                                                                  */
/* ------------------------------------------------------------------------ */

interface TopBarProps {
  activeItem: NavItem
  userEmail: string
  userInitial: string
  onOpenDrawer: () => void
  onLogout: () => void | Promise<void>
}

function TopBar({
  activeItem,
  userEmail,
  userInitial,
  onOpenDrawer,
  onLogout,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={onOpenDrawer}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf] md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <nav aria-label="Breadcrumb" className="hidden sm:block">
          <ol className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <li className="font-bold uppercase tracking-[0.2em] text-[#1697cf]">
              Admin
            </li>
            <li aria-hidden="true" className="text-slate-300">
              /
            </li>
            <li className="truncate">{activeItem.label}</li>
          </ol>
        </nav>
        <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl">
          {activeItem.label}
        </h1>
        <p className="hidden truncate text-xs font-semibold text-slate-500 sm:block">
          {activeItem.description}
        </p>
      </div>

      <div ref={wrapperRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[#1697cf]/40 hover:text-[#1697cf] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1697cf]"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[#1697cf] text-xs font-black text-white">
            {userInitial}
          </span>
          <span className="hidden max-w-[180px] truncate sm:inline">
            {userEmail}
          </span>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Account"
            className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Signed in as
              </p>
              <p className="mt-1 break-all text-sm font-bold text-slate-700">
                {userEmail}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                void onLogout()
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
