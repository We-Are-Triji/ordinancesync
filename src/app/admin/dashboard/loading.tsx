/**
 * Loading skeleton for /admin/dashboard shown instantly during navigation.
 *
 * Mirrors the dashboard shell (top brand bar + header + tabs) plus a generic
 * table skeleton, which is what the user sees when the dashboard finally
 * renders. The match isn't pixel-perfect on purpose — these are placeholders,
 * not the real components — but the column rhythm and header chrome stay
 * stable so the swap to the real UI doesn't reflow.
 */
export default function DashboardLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading admin dashboard"
      className="min-h-screen bg-[#eaf8ff] text-slate-950"
    >
      <div className="h-1 bg-[#1697cf]" />

      {/* Header chrome */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="size-9 animate-pulse rounded-md bg-slate-200 sm:size-10" />
            <span className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <span className="h-5 w-12 animate-pulse rounded-md bg-slate-200" />
          </div>
          <span className="h-9 w-24 animate-pulse rounded-md bg-slate-200" />
        </div>

        {/* Tabs strip */}
        <nav
          aria-hidden="true"
          className="mx-auto flex max-w-7xl gap-6 px-4 pb-3 sm:px-8"
        >
          <span className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <span className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <span className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </nav>
      </header>

      {/* Section heading + table placeholder */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block h-5 w-48 animate-pulse rounded bg-slate-200" />
            <span className="mt-2 block h-3.5 w-32 animate-pulse rounded bg-slate-200" />
          </div>
          <span className="h-9 w-32 animate-pulse rounded-md bg-slate-200" />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <span className="h-9 flex-1 animate-pulse rounded-md bg-slate-200" />
          <span className="h-9 w-64 animate-pulse rounded-md bg-slate-200" />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* table head */}
          <div className="flex gap-6 border-b border-slate-200 bg-slate-50 px-4 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="h-3 flex-1 animate-pulse rounded bg-slate-200"
              />
            ))}
          </div>

          {/* table body rows */}
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex gap-6 border-b border-slate-100 px-4 py-4 last:border-b-0"
            >
              {Array.from({ length: 6 }).map((_, colIndex) => (
                <span
                  key={colIndex}
                  className="h-3.5 flex-1 animate-pulse rounded bg-slate-200"
                />
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
