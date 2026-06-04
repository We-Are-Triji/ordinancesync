import { ImageResponse } from "next/og"

/**
 * Default Open Graph / Twitter card image for the public site.
 *
 * Next.js renders this React tree to a 1200x630 PNG at request time and
 * serves it as the OG image for the root and any sub-route that doesn't
 * declare its own. Going dynamic means we don't need a designer-provided
 * static asset, and the image stays in lockstep with our brand color and
 * copy if we ever update either.
 *
 * Render constraints (these are real, not stylistic):
 *   - Use a single root element with explicit display: flex when stacking
 *     children. The OG renderer is strict about implicit defaults.
 *   - Inline styles only — no Tailwind / CSS files.
 */

export const alt =
  "OrdinanceSync — A digital platform for Cebu City ordinances"

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

const BRAND = "#1697cf"
const BRAND_DARK = "#087fb1"
const TEXT_DARK = "#0f172a"
const TEXT_MUTED = "#475569"
const SURFACE = "#eaf8ff"

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${SURFACE} 0%, #ffffff 60%)`,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top row: brand mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: BRAND,
              color: "#ffffff",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            OS
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 4,
              color: BRAND,
              textTransform: "uppercase",
            }}
          >
            OrdinanceSync
          </div>
        </div>

        {/* Headline + subhead */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              color: TEXT_DARK,
              maxWidth: 940,
            }}
          >
            <span>Cebu City ordinances,</span>
            <span style={{ color: BRAND }}>made searchable.</span>
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.4,
              color: TEXT_MUTED,
              maxWidth: 880,
            }}
          >
            A digital platform for citizens and LGU teams to search, summarize,
            and manage local policy.
          </div>
        </div>

        {/* Footer accent bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: TEXT_MUTED,
            }}
          >
            ordinancesync.gov.ph
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 96,
                height: 8,
                borderRadius: 999,
                background: BRAND,
              }}
            />
            <div
              style={{
                width: 32,
                height: 8,
                borderRadius: 999,
                background: BRAND_DARK,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
