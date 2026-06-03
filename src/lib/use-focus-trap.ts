"use client"

import { useEffect, useRef, type RefObject } from "react"

/**
 * Accessibility helper for modal dialogs.
 *
 * Given a ref to the dialog container, this hook:
 *   - moves keyboard focus into the dialog when it opens (the first focusable
 *     descendant, or the container itself if none exist),
 *   - traps Tab / Shift+Tab so focus stays inside the dialog,
 *   - closes the dialog on Escape via the supplied onClose callback,
 *   - restores focus to whatever element was focused before the dialog
 *     opened, so keyboard users return to their trigger button.
 *
 * Usage (works for any element ref'd as the dialog root):
 *
 *   const ref = useRef<HTMLDivElement>(null)
 *   useFocusTrap(ref, { onClose, active: true })
 *   return <div ref={ref} role="dialog" aria-modal="true">...</div>
 *
 * The hook is a no-op when `active` is false, so callers can mount it
 * unconditionally.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

interface UseFocusTrapOptions {
  /** Called when the user presses Escape. */
  onClose: () => void
  /** Skip the trap entirely when false (e.g. for inline / non-modal panels). */
  active?: boolean
}

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  { onClose, active = true }: UseFocusTrapOptions
) {
  // We keep the latest onClose in a ref so the effect doesn't tear down +
  // re-initialize every render just because the parent passed a fresh inline
  // function.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Save the trigger so we can return focus on close.
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Move focus inside the dialog. If no focusable child exists yet (e.g.
    // initial loading state), focus the container itself so screen readers
    // announce the dialog and arrow keys don't scroll the page behind it.
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.hasAttribute("data-focus-skip"))
    const initial = focusables[0] ?? container
    if (initial === container && !container.hasAttribute("tabindex")) {
      container.setAttribute("tabindex", "-1")
    }
    initial.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== "Tab") return

      // Re-query on each Tab so dynamically added inputs are included.
      const items = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("data-focus-skip"))
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (activeEl === first || !container!.contains(activeEl)) {
          event.preventDefault()
          last.focus()
        }
      } else {
        if (activeEl === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown)
    return () => {
      container.removeEventListener("keydown", handleKeyDown)
      // Restore focus to the trigger if it's still in the document. Wrapping
      // in a try/catch guards against detached elements (e.g. unmounted
      // virtualized lists).
      try {
        if (
          previouslyFocused &&
          typeof previouslyFocused.focus === "function" &&
          document.contains(previouslyFocused)
        ) {
          previouslyFocused.focus()
        }
      } catch {
        // Best-effort restore; ignore failures.
      }
    }
  }, [active, containerRef])
}
