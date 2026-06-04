import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Server-component layout that exists solely so the chat route can export
 * Next.js metadata. The chat page itself is "use client" (needs hooks for
 * voice + scroll handling), and client components can't export `metadata`.
 * Wrapping it in a thin server layout is the canonical workaround.
 */

export const metadata: Metadata = {
  title: "Search Cebu City ordinances",
  description:
    "Ask in English or Bisaya and get cited answers grounded in official Cebu City ordinances on file.",
  alternates: { canonical: "/chat" },
  openGraph: {
    title: "Policy chat · OrdinanceSync",
    description:
      "Ask in English or Bisaya and get cited answers grounded in official Cebu City ordinances.",
    url: "/chat",
    type: "website",
  },
  twitter: {
    title: "Policy chat · OrdinanceSync",
    description:
      "Ask about Cebu City ordinances in English or Bisaya and get cited answers.",
  },
}

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children
}
