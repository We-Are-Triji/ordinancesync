export default function App() {
  return (
    <div className="bg-atmos text-slate-900">
      <div className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-12 2xl:px-24">
        <header className="animate-rise">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand/70">
                Cebu City
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                OrdinanceSync
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Ask in English or Bisaya. Get a cited answer.
              </p>
            </div>
          </div>
        </header>

        <main className="mt-6 flex flex-1 flex-col gap-4">
          <section className="animate-rise-delay flex-1 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-soft backdrop-blur sm:p-6">
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Ask a question to get started.
            </div>
          </section>

          <section className="animate-rise-delay-2 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
                <input
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  placeholder="Ask a Cebu City ordinance question in English or Bisaya"
                  type="text"
                />
              </div>
              <button
                type="button"
                className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Send
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}