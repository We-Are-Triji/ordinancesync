"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { AdminSidebar } from "./admin-sidebar"
import { AdminTopbar } from "./admin-topbar"
import { SidebarProvider, useSidebar } from "./sidebar-context"

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const { collapsed, drawerOpen, setDrawerOpen } = useSidebar()
  const pathname = usePathname()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname, setDrawerOpen])

  // Allow Escape to dismiss the mobile drawer and lock body scroll while open.
  useEffect(() => {
    if (!drawerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [drawerOpen, setDrawerOpen])

  return (
    <div className="bg-atmos min-h-screen text-slate-900">
      {/* Permanent sidebar — desktop only. Width animates between rail/expanded. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/70 transition-[width] duration-300 ease-in-out lg:block",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <AdminSidebar />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200",
            drawerOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-slate-200/70 shadow-soft transition-transform duration-200 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <AdminSidebar forceExpanded onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      {/* Content column — offset by the fixed sidebar on desktop. */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out",
          collapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        <AdminTopbar onOpenSidebar={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </SidebarProvider>
  )
}
