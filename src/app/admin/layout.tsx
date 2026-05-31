import type { Metadata } from "next"

import { AdminShell } from "@/components/admin/admin-shell"

export const metadata: Metadata = {
  title: "Admin Console · OrdinanceSync",
  description:
    "LGU administrative console for ordinance ingestion, routing, and dispatch tracking.",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminShell>{children}</AdminShell>
}
