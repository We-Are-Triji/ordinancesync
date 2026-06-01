"use client"

import Link, { type LinkProps } from "next/link"
import { useRouter } from "next/navigation"
import {
  type AnchorHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
} from "react"

/**
 * Anchor that produces a smooth route-to-route handoff without delaying
 * navigation. Two strategies, in order:
 *
 *   1. View Transitions API (Chromium). When available we wrap router.push
 *      in document.startViewTransition so the browser captures a real
 *      crossfade between the old and new DOM. No JS animation runtime, no
 *      layout shift, no manual exit delay.
 *
 *   2. Fallback. Plain navigation. The (public)/template.tsx component
 *      replays a short CSS crossfade on the inner content area only (the
 *      shared SiteHeader is in the parent layout, so it persists).
 *
 * Modifier-clicks (Cmd / Ctrl / Shift / Alt / middle-click) and
 * prefers-reduced-motion users always fall through to the browser default.
 */

type TransitionLinkProps = {
  href: string
  children: ReactNode
} & Omit<LinkProps, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown
}

export function TransitionLink({
  href,
  children,
  className,
  onClick,
  prefetch,
  ...rest
}: TransitionLinkProps) {
  const router = useRouter()

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return

      // Let the browser handle modifier / non-primary clicks normally so
      // open-in-new-tab and friends still work.
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return
      }

      // Same-page hash links: defer to the browser.
      if (href.startsWith("#")) return

      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      const doc = document as DocumentWithViewTransition

      // If the browser doesn't support View Transitions or the user prefers
      // reduced motion, fall through to Next's default <Link> navigation,
      // which is the snappiest possible behavior.
      if (prefersReduced || typeof doc.startViewTransition !== "function") {
        return
      }

      event.preventDefault()
      doc.startViewTransition(() => {
        router.push(href)
      })
    },
    [href, onClick, router]
  )

  return (
    <Link
      href={href}
      prefetch={prefetch ?? true}
      onClick={handleClick}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  )
}

export default TransitionLink
