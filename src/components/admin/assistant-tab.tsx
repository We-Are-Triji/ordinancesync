"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ArrowUp,
  Database,
  Loader2,
  Sparkles,
  Wrench,
} from "lucide-react"

interface TraceStep {
  kind: "tool_call" | "tool_result" | "answer" | "error"
  tool?: string
  args?: Record<string, unknown>
  preview?: string
  text?: string
  message?: string
}

interface Turn {
  question: string
  answer?: string
  trace?: TraceStep[]
  error?: string
}

const SUGGESTIONS = [
  "How many ordinances are on file?",
  "Which ordinances are still pending?",
  "List all offices and their categories.",
  "Which ordinances have been dispatched, and to how many offices?",
]

export default function AssistantTab() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [turns, loading])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || loading) return
    setInput("")
    setLoading(true)
    const index = turns.length
    setTurns((prev) => [...prev, { question: q }])

    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.")
      setTurns((prev) =>
        prev.map((t, i) =>
          i === index ? { ...t, answer: data.answer, trace: data.trace } : t
        )
      )
    } catch (err) {
      setTurns((prev) =>
        prev.map((t, i) =>
          i === index
            ? { ...t, error: err instanceof Error ? err.message : "Failed." }
            : t
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    ask(input)
  }

  const empty = turns.length === 0

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-[#1697cf]/10 text-[#1697cf]">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black text-slate-900">AI Assistant</h2>
          <p className="text-sm font-semibold text-slate-500">
            Ask about your ordinances, offices, and dispatches. The assistant
            queries the database live via MongoDB tools.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-5 max-h-[calc(100vh-22rem)] min-h-[320px] space-y-5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-4"
      >
        {empty && (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Try one of these:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#1697cf] hover:text-[#1697cf]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1697cf] px-4 py-2.5 text-sm font-medium text-white">
                {turn.question}
              </div>
            </div>

            {turn.trace && turn.trace.length > 0 && (
              <TraceView trace={turn.trace} />
            )}

            {turn.answer && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="prose prose-sm prose-slate max-w-none prose-headings:font-black prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-slate-900">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {turn.answer}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {turn.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {turn.error}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2 className="size-4 animate-spin text-[#1697cf]" aria-hidden="true" />
            Thinking and querying the database...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 shadow-sm transition focus-within:border-[#1697cf] focus-within:ring-2 focus-within:ring-[#1697cf]/20">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your ordinances, offices, or dispatches..."
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="Ask the assistant"
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
          Read-only. The assistant can view data but never modifies it.
        </p>
      </form>
    </div>
  )
}

/* Collapsible trace showing the agent's tool calls — the visible reasoning. */
function TraceView({ trace }: { trace: TraceStep[] }) {
  const [open, setOpen] = useState(false)
  const toolSteps = trace.filter(
    (s) => s.kind === "tool_call" || s.kind === "tool_result"
  )
  if (toolSteps.length === 0) return null

  const callCount = trace.filter((s) => s.kind === "tool_call").length

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[90%] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-500 transition hover:bg-slate-50"
        >
          <Database className="size-3.5 text-[#1697cf]" aria-hidden="true" />
          {callCount} database {callCount === 1 ? "query" : "queries"} ·{" "}
          {open ? "hide" : "show"} steps
        </button>
        {open && (
          <ul className="space-y-2 border-t border-slate-100 px-3 py-2 text-xs">
            {trace.map((s, i) => {
              if (s.kind === "tool_call") {
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Wrench className="mt-0.5 size-3.5 shrink-0 text-[#1697cf]" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="font-bold text-slate-700">{s.tool}</span>
                      <code className="ml-1 break-all rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-600">
                        {JSON.stringify(s.args)}
                      </code>
                    </span>
                  </li>
                )
              }
              if (s.kind === "tool_result") {
                return (
                  <li key={i} className="pl-5 text-slate-400">
                    <span className="break-all font-mono text-[11px]">
                      {s.preview}
                      {s.preview && s.preview.length >= 400 ? "…" : ""}
                    </span>
                  </li>
                )
              }
              return null
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
