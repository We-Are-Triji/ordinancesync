import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import DashboardShell from "@/components/admin/dashboard-shell"

export default async function AdminDashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/admin")
  }

  return <DashboardShell />
}
