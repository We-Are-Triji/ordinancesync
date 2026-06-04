/**
 * Loading skeleton for /chat shown instantly during navigation.
 *
 * Mirrors the chat page's structure (sticky header + centered hero) so the
 * page doesn't visibly reflow when the real content takes over. All shimmer
 * is plain Tailwind animate-pulse — disabled automatically for users with
 * prefers-reduced-motion via the global CSS rule.
 */
export default function ChatLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading chat"
      className="flex h-screen flex-col overflow-hidden bg-[#eaf8ff] text-slate-900"
    >
      {/* Header skeleton */}
      <header className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="size-8 animate-pulse rounded-md bg-slate-200" />
            <span className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
          </div>
          <span className="h-3 w-10 animate-pulse rounded bg-slate-200" />
        </div>
      </header>

      {/* Hero placeholder */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-xl text-center">
          <span className="mx-auto mb-5 block size-14 animate-pulse rounded-2xl bg-[#1697cf]/30" />
          <span className="mx-auto block h-8 w-3/4 animate-pulse rounded bg-slate-200" />
          <span className="mx-auto mt-3 block h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
          <span className="mx-auto mt-8 block h-12 w-full animate-pulse rounded-full bg-slate-200" />

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="h-7 w-40 animate-pulse rounded-full bg-slate-200" />
            <span className="h-7 w-48 animate-pulse rounded-full bg-slate-200" />
            <span className="h-7 w-44 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      </main>
    </div>
  )
}
