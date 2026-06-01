import type { ReactNode } from "react"

import { SiteHeader } from "@/components/ui/site-header"

/**
 * Layout for the public-facing routes: marketing landing + the citizen
 * search portal. Rendering the shared <SiteHeader/> here (instead of inside
 * each page) means it persists across navigations within the group, so the
 * chrome doesn't flash and only the inner content animates between routes.
 *
 * Routes outside this group (e.g. /admin) intentionally don't share this
 * layout because they ship their own portal-specific chrome.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
