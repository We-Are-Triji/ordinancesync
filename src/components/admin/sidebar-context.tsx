"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

const STORAGE_KEY = "ordinancesync.admin.sidebar.collapsed"

type SidebarContextValue = {
  /** Desktop rail collapsed (icon-only) state. */
  collapsed: boolean
  toggleCollapsed: () => void
  setCollapsed: (value: boolean) => void
  /** Whether the mobile drawer is open. */
  drawerOpen: boolean
  setDrawerOpen: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Restore the persisted collapse preference once on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsedState(stored === "true")
    } catch {
      /* localStorage unavailable — fall back to default */
    }
    setHydrated(true)
  }, [])

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* ignore persistence failures */
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed)
  }, [collapsed, setCollapsed])

  return (
    <SidebarContext.Provider
      value={{
        collapsed: hydrated ? collapsed : false,
        toggleCollapsed,
        setCollapsed,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return ctx
}
