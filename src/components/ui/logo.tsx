import Image from "next/image"

/**
 * OrdinanceSync brand mark.
 *
 * Renders the project logo (public/logo.png) at a fixed pixel size. Each
 * caller pairs it with their own wordmark text so headers can keep their
 * existing typography (uppercase landing nav, "Admin" pill in the dashboard,
 * stacked "Admin Portal" subtitle on the login page, etc.).
 *
 * Why a component:
 *   - Single import path so every header/footer points at the same asset.
 *   - Centralized sizing + alt text for a11y.
 *   - Easy to swap out later (e.g. a dark variant) without hunting through
 *     each route.
 *
 * The source PNG also lives at src/app/icon.png and src/app/apple-icon.png
 * so Next.js's App Router auto-generates the favicon + iOS icon from the
 * same artwork.
 */

interface LogoProps {
  /** Width/height in pixels. Height matches width (square mark). */
  size?: number
  /** Extra classes to compose with the base sizing/styles. */
  className?: string
  /**
   * Set true on above-the-fold logos (e.g. hero/header) so Next.js preloads
   * the image and skips the lazy-load placeholder.
   */
  priority?: boolean
  /** Override the default accessible name when the logo is purely decorative. */
  alt?: string
}

const DEFAULT_SIZE = 36

export function Logo({
  size = DEFAULT_SIZE,
  className = "",
  priority = false,
  alt = "OrdinanceSync",
}: LogoProps) {
  return (
    <Image
      src="/logo.png"
      width={size}
      height={size}
      priority={priority}
      alt={alt}
      // shrink-0 so flex parents don't squeeze the mark on narrow screens.
      className={`block shrink-0 ${className}`}
    />
  )
}

export default Logo
