/**
 * Global loading fallback shown while any server segment is fetching.
 *
 * Next.js streams this UI immediately when navigation begins, so the user
 * never sees a blank/white screen. Per-route loading.tsx files (e.g.
 * /chat/loading.tsx) override this with a tighter, route-specific skeleton.
 *
 * Kept intentionally minimal: a centered brand-colored pulse matches the
 * marketing/admin palette without committing to any layout that the actual
 * page might not have.
 */
export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center bg-white"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#1697cf]" />
        <span className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Loading
        </span>
      </div>
    </div>
  )
}
