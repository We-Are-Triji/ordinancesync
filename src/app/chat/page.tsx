"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowUp, Landmark, Loader2, Sparkles } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "Unsa man ang mga ordinansa bahin sa basura?",
  "What ordinances cover traffic in Cebu City?",
  "Naa bay ordinansa bahin sa noise pollution?",
]

// Stable per-visitor id for session continuity (memory across follow-ups).
function getUserId(): string {
  if (typeof window === "undefined") return "anon"
  let id = localStorage.getItem("os_chat_uid")
  if (!id) {
    id = `web-${crypto.randomUUID()}`
    localStorage.setItem("os_chat_uid", id)
  }
  return id
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const started = messages.length > 0
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, loading])

  async function send(text: string) {
    const question = text.trim()
    if (!question || loading) return

    setError(null)
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: question }])
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          sessionId,
          userId: getUserId(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.")

      if (data.sessionId && !sessionId) setSessionId(data.sessionId)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#eaf8ff] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="OrdinanceSync home"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-[#1697cf] text-white">
              <Landmark className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-black uppercase text-[#1697cf]">
              OrdinanceSync
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-slate-500 transition hover:text-[#1697cf]"
          >
            Home
          </Link>
        </div>
      </header>

      {!started ? (
        // ---- Google-style centered landing ----
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="w-full max-w-xl text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#1697cf] text-white shadow-lg shadow-[#1697cf]/20">
              <Sparkles className="size-7" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Ask about Cebu City ordinances
            </h1>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Mangutana sa English o Bisaya. Get answers grounded in official
              city ordinances.
            </p>

            <form onSubmit={handleSubmit} className="mt-8">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-lg shadow-slate-900/5 transition focus-within:border-[#1697cf] focus-within:ring-2 focus-within:ring-[#1697cf]/20">
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question in English or Bisaya"
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  aria-label="Your question"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1697cf] text-white transition hover:bg-[#087fb1] disabled:opacity-40"
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#1697cf] hover:text-[#1697cf]"
                >
                  {s}
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-5 text-sm font-semibold text-red-600">{error}</p>
            )}
          </div>
        </main>
      ) : (
        // ---- Conversation view ----
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1697cf] px-4 py-2.5 text-sm font-medium text-white">
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="prose prose-sm prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-strong:text-slate-900">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                    <Loader2 className="size-4 animate-spin text-[#1697cf]" aria-hidden="true" />
                    Searching ordinances...
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white/90 backdrop-blur">
            <form
              onSubmit={handleSubmit}
              className="mx-auto max-w-3xl px-4 py-4"
            >
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 shadow-sm transition focus-within:border-[#1697cf] focus-within:ring-2 focus-within:ring-[#1697cf]/20">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  aria-label="Your question"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1697cf] text-white transition hover:bg-[#087fb1] disabled:opacity-40"
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-center text-xs font-medium text-slate-400">
                Answers come only from official Cebu City ordinances on file.
              </p>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
