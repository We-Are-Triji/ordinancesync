"use client"

/**
 * Lightweight toast notifications.
 *
 * - <ToastProvider/> mounts a single overlay + aria-live region. Wrap any
 *   subtree that needs to fire toasts (e.g. the admin dashboard shell).
 * - useToast() exposes helpers: toast.success / toast.error / toast.info.
 *
 * Why hand-rolled instead of a library: the dashboard already has a tight
 * brand palette (#1697cf) and minimal dependencies; a custom 100-line
 * component matches the design and keeps the bundle small. Accessibility is
 * baked in via role="status" / aria-live="polite" so screen readers announce
 * each toast as it appears.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { CheckCircle2, Info, X, XCircle } from "lucide-react"

type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastInput {
  title: string
  description?: string
  /** Override the default duration (ms). Set to 0 to keep until dismissed. */
  duration?: number
}

interface ToastContextValue {
  show: (variant: ToastVariant, input: ToastInput) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION_MS = 4500
// Errors stay a bit longer so the user has time to read them.
const ERROR_DURATION_MS = 6500

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: ReactNode; live: "polite" | "assertive" }
> = {
  success: {
    container: "border-l-[#1697cf] bg-white text-slate-800",
    icon: <CheckCircle2 className="size-5 text-[#1697cf]" aria-hidden="true" />,
    live: "polite",
  },
  error: {
    container: "border-l-red-500 bg-white text-slate-800",
    icon: <XCircle className="size-5 text-red-500" aria-hidden="true" />,
    // Errors are announced more urgently for assistive tech.
    live: "assertive",
  },
  info: {
    container: "border-l-slate-400 bg-white text-slate-800",
    icon: <Info className="size-5 text-slate-500" aria-hidden="true" />,
    live: "polite",
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Track timers so dismiss() can clear pending auto-dismissals.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (variant: ToastVariant, input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`

      setToasts((prev) => [
        ...prev,
        { id, variant, title: input.title, description: input.description },
      ])

      const duration =
        input.duration ??
        (variant === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS)
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, timer)
      }

      return id
    },
    [dismiss]
  )

  // Clear any in-flight timers if the provider unmounts (e.g. logout).
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((timer) => clearTimeout(timer))
      map.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({ show, dismiss }),
    [show, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Stacked overlay. Pointer-events are off on the wrapper so it never
          blocks the page; individual toasts re-enable them so the close
          button is clickable. */}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => {
          const style = variantStyles[t.variant]
          return (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              aria-live={style.live}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border-l-4 px-4 py-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-2 ${style.container}`}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-5">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/**
 * useToast: returns helpers for firing toasts.
 *
 *   const toast = useToast()
 *   toast.success({ title: "Saved" })
 *   toast.error({ title: "Couldn't save", description: "Please try again." })
 *
 * Calling outside <ToastProvider/> is a programming error.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used inside a <ToastProvider/>.")
  }

  return useMemo(
    () => ({
      success: (input: ToastInput) => ctx.show("success", input),
      error: (input: ToastInput) => ctx.show("error", input),
      info: (input: ToastInput) => ctx.show("info", input),
      dismiss: ctx.dismiss,
    }),
    [ctx]
  )
}
