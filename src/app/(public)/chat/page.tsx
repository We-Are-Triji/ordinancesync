import { Chat } from "@/components/citizen/chat"

/**
 * Citizen "search portal" page. The shared <SiteHeader/> is rendered by the
 * (public) layout, so this component only owns the page body — that's what
 * keeps the landing -> /chat handoff feeling fluid (header stays put, only
 * the content area crossfades).
 */
export default function ChatPage() {
  return (
    <div className="bg-atmos min-h-[calc(100vh-5.25rem)] text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5.25rem)] w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="animate-rise">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-700/70">
            Cebu City
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Search policies
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Ask in English or Bisaya. Get a cited answer.
          </p>
        </header>

        <main className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
          <Chat />
        </main>
      </div>
    </div>
  )
}
