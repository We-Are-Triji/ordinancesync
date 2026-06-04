import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const SITE_NAME = "OrdinanceSync"
const SITE_DESCRIPTION =
  "A centralized digital platform for discovering, managing, and accessing Cebu City ordinances."

// Resolve the canonical site URL from the env. NEXT_PUBLIC_SITE_URL is the
// preferred override; fall back to Vercel's automatic VERCEL_URL on preview
// deployments, then a sensible localhost default for dev. metadataBase makes
// every relative OG/Twitter image resolve to an absolute URL, which social
// crawlers require.
function resolveSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) {
    try {
      return new URL(explicit)
    } catch {
      // fall through to other strategies
    }
  }
  const vercel = process.env.VERCEL_URL
  if (vercel) return new URL(`https://${vercel}`)
  return new URL("http://localhost:3000")
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Default favicon/app icons are auto-detected from src/app/icon.png and
  // src/app/apple-icon.png (Next.js file convention), so we don't need an
  // explicit `icons` map here.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_PH",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  // Sensible default: public pages are crawlable. Admin pages override this
  // per-route to noindex.
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#1697cf",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>{children}</ClerkProvider>
      </body>
    </html>
  )
}
