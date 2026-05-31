import {
  CloudUpload,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type AdminNavItem = {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

/**
 * Primary navigation for the LGU admin panel.
 * Order here is the order rendered in the sidebar.
 */
export const adminNav: AdminNavItem[] = [
  {
    label: "Active Ordinances",
    description: "Track ordinances and dispatch status",
    href: "/admin/ordinances",
    icon: LayoutDashboard,
  },
  {
    label: "Upload New Policy",
    description: "Ingest a raw PDF ordinance",
    href: "/admin/upload",
    icon: CloudUpload,
  },
  {
    label: "Settings",
    description: "Sector profile and preferences",
    href: "/admin/settings",
    icon: Settings,
  },
]
