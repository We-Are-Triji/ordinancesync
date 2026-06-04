import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Server-component layout for every /admin/* route. Two jobs:
 *
 *   1. Mark the entire admin surface as noindex/nofollow so search engines
 *      and social preview crawlers don't surface admin URLs in results or
 *      link previews.
 *   2. Provide a sensible default title for admin pages. Individual admin
 *      pages can still export their own `metadata` to override.
 *
 * The admin login (src/app/admin/page.tsx) and dashboard layouts are both
 * "use client" components, which can't export `metadata` themselves; this
 * layout is the canonical place to set it.
 */

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin · OrdinanceSync",
  },
  // Belt-and-braces: noindex + nofollow at the segment level applies to all
  // nested admin routes (login, dashboard, future ones). Also disables Google
  // Image, snippets, and archived caching for safety.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": 0,
      "max-image-preview": "none",
      "max-video-preview": 0,
    },
  },
  // Drop OG/Twitter cards inherited from the root layout — admin pages
  // shouldn't surface in social previews even if a URL leaks.
  openGraph: { title: undefined, description: undefined },
  twitter: { title: undefined, description: undefined },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children
}
