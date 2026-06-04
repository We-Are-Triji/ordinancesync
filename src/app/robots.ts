import type { MetadataRoute } from "next"

/**
 * /robots.txt for the public site.
 *
 * The admin segment carries a noindex/nofollow meta tag via its layout, but
 * we belt-and-brace it here with Disallow rules so well-behaved crawlers
 * don't even fetch admin pages. Sitemap/host can be added later.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/chat"],
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
  }
}
