import type { Metadata } from "next"
import LandingPage from "@/components/ui/landing-page"

export const metadata: Metadata = {
  title: "Cebu City ordinances, made searchable",
  description:
    "OrdinanceSync helps citizens and Cebu City LGU teams search, understand, and manage local ordinances through one accessible public policy platform.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "OrdinanceSync · Cebu City ordinances, made searchable",
    description:
      "Discover and understand Cebu City ordinances. A digital platform for citizens and LGU teams to search, summarize, and manage local policy.",
    url: "/",
    type: "website",
  },
  twitter: {
    title: "OrdinanceSync · Cebu City ordinances, made searchable",
    description:
      "Discover and understand Cebu City ordinances. A digital platform for citizens and LGU teams.",
  },
}

export default function HomePage() {
  return <LandingPage />
}
