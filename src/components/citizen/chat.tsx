"use client"

import { useEffect, useRef, useState } from "react"
import { Landmark, SendHorizontal, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { TypingIndicator } from "./typing-indicator"

type ChatRole = "user" | "assistant"

type ChatMessage = {
  id: string
  role: ChatRole
  /** Empty content + pending flag renders the typing indicator bubble. */
  content: string
  pending?: boolean
}

/**
 * Stand-in for the real Vertex AI / RAG vector search. Resolves after a short
 * delay with a canned, cited-style answer so the loading UX can be exercised.
 */
function mockAssistantResponse(query: string): Promise<string> {
  const delay = 1400 + Math.random() * 800
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        `Here's what I found related to "${query.trim()}". Under the relevant Cebu City ordinance, the key rules and penalties would be summarized here with citations to the exact sections. (This is a mock response.)`
      )
    }, delay)
  })
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isThinking, setIsThinking] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const query = input.trim()
    // Guard: ignore empty submits and block while a request is in flight.
    if (!query || isThinking) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
    }
    const pendingId = crypto.randomUUID()
    const pendingMessage: ChatMessage = {
      id: pendingId,
      role: "assistant",
      content: "",
      pending: true,
    }

    // Lock the UI: show the user's message + the typing bubble in one update.
    setMessages((prev) => [...prev, userMessage, pendingMessage])
    setInput("")
    setIsThinking(true)

    try {
      const answer = await mockAssistantResponse(query)
      // Swap the pending bubble for the resolved answer.
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? { ...message, content: answer, pending: false }
            : message
        )
      )
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingId
            ? {
                ...message,
                content:
                  "Sorry, something went wrong reaching the assistant. Please try again.",
                pending: false,
              }
            : message
        )
      )
    } finally {
      // Re-enable inputs and restore focus for the next question.
      setIsThinking(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {/* Conversation panel */}
      <section className="animate-rise-delay flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-soft backdrop-blur">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Sparkles className="size-6" aria-hidden="true" />
              </span>
              <p className="text-sm text-slate-500">
                Ask a question to get started.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2.5",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                      <Landmark className="size-4" aria-hidden="true" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[70%]",
                      message.role === "user"
                        ? "rounded-br-md bg-brand text-brand-foreground"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                    )}
                  >
                    {message.pending ? (
                      <TypingIndicator />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="animate-rise-delay-2 rounded-3xl border border-white/60 bg-white/80 p-4 shadow-soft backdrop-blur sm:p-5"
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex flex-1 items-center rounded-2xl border bg-white/90 px-4 py-3 transition-colors",
              isThinking ? "border-slate-200 opacity-60" : "border-slate-200"
            )}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isThinking}
              aria-label="Ask a Cebu City ordinance question"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
              placeholder={
                isThinking
                  ? "Searching ordinances…"
                  : "Ask a Cebu City ordinance question in English or Bisaya"
              }
              type="text"
            />
          </div>
          <button
            type="submit"
            disabled={isThinking || input.trim().length === 0}
            aria-label="Send question"
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "bg-brand text-brand-foreground hover:bg-brand-strong disabled:hover:bg-brand"
            )}
          >
            {isThinking ? (
              <>
                <span className="hidden sm:inline">Thinking</span>
                <TypingIndicator />
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <SendHorizontal className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  )
}
