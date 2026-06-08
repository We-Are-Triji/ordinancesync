"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  ArrowUp,
  Loader2,
  Mic,
  Menu,
  MoreVertical,
  RefreshCw,
  Trash2,
  HelpCircle,
  LogOut,
  MessageSquare,
  BookOpen,
  Settings,
  CheckCircle2,
} from "lucide-react"
import {
  Mascot,
  type MascotState,
  isBlockedAnswer,
  isBlockedError,
} from "@/components/chat/mascot"
import { unlockAudio, playDataUrl } from "@/lib/audio-player"

const VoiceModal = dynamic(() => import("@/components/chat/voice-modal"), {
  ssr: false,
})
const SpeakButton = dynamic(() => import("@/components/chat/speak-button"), {
  ssr: false,
})

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = [
  "Unsa man ang mga ordinansa bahin sa basura?",
  "What ordinances cover traffic in Cebu City?",
  "Naa bay ordinansa bahin sa noise pollution?",
]

const ANSWERING_HOLD_MS = 900

// Color tokens
const COLORS = {
  navy: "#1B2A4A",
  navyLight: "#2C3E6B",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  cream: "#FAF7F2",
  surface: "#FFFFFF",
  border: "#E8E0D4",
  textMuted: "#9B8F82",
  online: "#22C55E",
} as const

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

function formatRetryAfter(seconds: unknown): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return null
  }
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

// Map mascot states to image paths
function getMascotImagePath(state: MascotState): string {
  const stateToImage: Partial<Record<MascotState, string>> = {
    thinking: "thinking",
    greeting: "idle",
    answering: "idle",
    blocked: "blocked",
    idle: "idle",
    apologetic: "apologetic",
  }
  const imageName = stateToImage[state] || "idle"
  return `/mascot/${imageName}.png`
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [requestInFlight, setRequestInFlight] = useState(false)
  const [mascotState, setMascotState] = useState<MascotState>("greeting")
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const started = messages.length > 0
  const loading = requestInFlight
  const scrollRef = useRef<HTMLDivElement>(null)
  const requestInFlightRef = useRef(false)
  const mascotIdleTimerRef = useRef<number | null>(null)

  function clearMascotIdleTimer() {
    if (!mascotIdleTimerRef.current) return
    window.clearTimeout(mascotIdleTimerRef.current)
    mascotIdleTimerRef.current = null
  }

  function setRequestActive(active: boolean) {
    requestInFlightRef.current = active
    setRequestInFlight(active)
  }

  function resetChat() {
    clearMascotIdleTimer()
    setRequestActive(false)
    setMessages([])
    setInput("")
    setError(null)
    setMascotState("greeting")
  }

  // Voice needs mic capture + MediaRecorder, available in modern browsers over
  // HTTPS/localhost. Detect once on mount so we only show the mic when usable.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVoiceSupported(
        typeof navigator !== "undefined" &&
          !!navigator.mediaDevices?.getUserMedia &&
          "MediaRecorder" in window
      )
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => clearMascotIdleTimer, [])

  function handleVoiceTranscript(text: string, language?: string) {
    setVoiceOpen(false)
    // A voice question gets a spoken answer back — the full voice loop.
    if (text.trim()) send(text, { speak: true, language })
  }

  // Opening voice is a user gesture — unlock audio now so the later spoken
  // answer isn't blocked by the browser's autoplay policy.
  function openVoice() {
    unlockAudio()
    setVoiceOpen(true)
  }

  // Plays an answer aloud via /api/speak. Used for the voice loop. Uses the
  // shared (autoplay-unlocked) audio element so playback isn't blocked when it
  // fires seconds after the user's gesture.
  async function speakAnswer(text: string, language?: string) {
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: language ?? "fil-PH" }),
      })
      const data = await res.json()
      if (!res.ok || !data.audio) return
      setSpeaking(true)
      await playDataUrl(`data:${data.mimeType};base64,${data.audio}`)
    } catch {
      /* non-fatal — the text answer is already shown */
    } finally {
      setSpeaking(false)
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, loading])

  async function send(
    text: string,
    opts?: { speak?: boolean; language?: string }
  ) {
    const question = text.trim()
    if (!question || requestInFlightRef.current) return

    clearMascotIdleTimer()
    setRequestActive(true)
    setMascotState("thinking")
    setError(null)
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: question }])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          sessionId,
          userId: getUserId(),
          history: messages.slice(-6),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const message = data.error ?? "Something went wrong."
        const retryAfter =
          res.status === 429 ? formatRetryAfter(data.retryAfter) : null
        throw new Error(
          retryAfter ? `${message} Try again in ${retryAfter}.` : message
        )
      }

      if (data.sessionId && !sessionId) setSessionId(data.sessionId)
      const answer = typeof data.answer === "string" ? data.answer : ""
      const blocked = isBlockedAnswer(answer)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer },
      ])
      setMascotState(blocked ? "blocked" : "answering")
      if (!blocked) {
        mascotIdleTimerRef.current = window.setTimeout(() => {
          mascotIdleTimerRef.current = null
          if (!requestInFlightRef.current) {
            setMascotState("idle")
          }
        }, ANSWERING_HOLD_MS)
      }

      // Voice loop: speak the answer back for voice-originated questions.
      if (opts?.speak && data.answer) {
        speakAnswer(data.answer, opts.language)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong."
      setError(message)
      setMascotState(isBlockedError(message) ? "blocked" : "apologetic")
    } finally {
      setRequestActive(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  // Memoize mascot element to prevent unnecessary re-renders when input changes
  const mascotElement = useMemo(
    () => (
      <Mascot
        state={mascotState}
        size={100}
        aria-hidden={false}
      />
    ),
    [mascotState]
  )

  // ============================================================================
  // SIDEBAR (LEFT COLUMN) — visible on lg: and above
  // ============================================================================
  function SidebarContent() {
    return (
      <div
        className="flex h-full flex-col border-r"
        style={{
          backgroundColor: COLORS.cream,
          borderColor: COLORS.border,
        }}
      >
        {/* Mascot section */}
        <div className="flex flex-col items-center px-4 py-6">
          {mascotElement}
          <p
            className="mt-3 text-sm font-semibold"
            style={{ color: COLORS.navy }}
          >
            Asst. Kiko
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: COLORS.online }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: COLORS.textMuted }}
            >
              Online
            </span>
          </div>
        </div>

        {/* New Chat button */}
        <div className="px-3">
          <button
            onClick={resetChat}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ backgroundColor: COLORS.navy }}
          >
            + New Chat
          </button>
        </div>

        {/* Nav links */}
        <nav className="mt-8 flex flex-col gap-2 px-3">
          <NavLink icon={MessageSquare} label="Chats" />
          <NavLink icon={BookOpen} label="Knowledge Base" />
          <NavLink icon={Settings} label="Settings" />
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom links */}
        <nav className="border-t px-3 py-4" style={{ borderColor: COLORS.border }}>
          <NavLink icon={HelpCircle} label="Help" />
          <NavLink icon={LogOut} label="Log out" />
        </nav>
      </div>
    )
  }

  interface NavLinkProps {
    icon: React.ComponentType<{ className?: string }>
    label: string
  }

  function NavLink({ icon: Icon, label }: NavLinkProps) {
    return (
      <button
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:brightness-95"
        style={{
          color: COLORS.navy,
          backgroundColor: "transparent",
        }}
      >
        <Icon className="size-4 shrink-0" />
        <span>{label}</span>
      </button>
    )
  }

  // ============================================================================
  // MAIN LAYOUT
  // ============================================================================
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: COLORS.cream }}>
      {/* Left sidebar — hidden in chat mode (no sidebar) */}
      <div className="hidden">
        <SidebarContent />
      </div>

      {/* Right column — chat panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* HEADER */}
        <header
          className="shrink-0 border-b px-4 py-3 sm:px-6"
          style={{
            backgroundColor: COLORS.surface,
            borderColor: COLORS.border,
          }}
        >
          <div className="flex items-center justify-between">
            {/* Left: hamburger on mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden rounded-lg p-2 transition hover:brightness-90 md:hidden"
              style={{ color: COLORS.navy }}
              aria-label="Toggle menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Center: mascot + name (mobile) or just empty (desktop) */}
            <div className="hidden items-center gap-2 md:flex">
              {/* Placeholder for alignment on desktop */}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-1">
              <button
                className="rounded-lg p-2 transition hover:brightness-90"
                style={{ color: COLORS.navy }}
                aria-label="Refresh"
              >
                <RefreshCw className="size-4" />
              </button>
              <button
                onClick={resetChat}
                className="rounded-lg p-2 transition hover:brightness-90"
                style={{ color: COLORS.navy }}
                aria-label="Clear chat"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                className="rounded-lg p-2 transition hover:brightness-90 lg:hidden"
                style={{ color: COLORS.navy }}
                aria-label="More"
              >
                <MoreVertical className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Landing screen — absolute positioned for smooth transition */}
        <main
          className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-4 py-10 sm:px-6 transition-opacity duration-250 ease-in"
          style={{
            opacity: !started ? 1 : 0,
            pointerEvents: !started ? "auto" : "none",
            zIndex: !started ? 10 : 0,
          }}
        >
            <div className="w-full max-w-3xl text-center">
              <div className="relative mx-auto flex w-full max-w-sm justify-center pb-2">
                <div
                  className="absolute left-1/2 top-8 -translate-x-1/2 rounded-3xl border px-4 py-2 text-left text-xs font-bold shadow-sm sm:left-[68%] sm:top-10 sm:w-56 sm:translate-x-0"
                  style={{
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    color: COLORS.navy,
                  }}
                >
                  Kumusta! Ask me anything about Cebu City ordinances.
                  <span
                    className="absolute -bottom-2 left-8 size-4 rotate-45 border-b border-r sm:left-6"
                    style={{
                      backgroundColor: COLORS.surface,
                      borderColor: COLORS.border,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div
                  className="mt-20 rounded-full border p-5 shadow-[0_18px_48px_rgba(27,42,74,0.12)] sm:mt-0 sm:p-6"
                  style={{
                    backgroundColor: COLORS.cream,
                    borderColor: COLORS.border,
                  }}
                >
                  <Mascot
                    state={mascotState}
                    size={220}
                    aria-hidden={false}
                  />
                </div>
              </div>

              <h1
                className="mt-8 text-3xl font-black leading-tight sm:text-4xl"
                style={{ color: COLORS.navy }}
              >
                Hi, I&apos;m Asst. Kiko.
                <br />
                Ask about Cebu City ordinances.
              </h1>
              <p
                className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-6"
                style={{ color: COLORS.textMuted }}
              >
                Mangutana sa English o Bisaya. Get answers grounded in official
                city ordinances.
              </p>

              <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-2xl">
                <div
                  className="flex items-center gap-2 rounded-[1.75rem] border px-4 py-3 shadow-[0_10px_28px_rgba(27,42,74,0.08)] transition focus-within:ring-2 focus-within:ring-offset-2"
                  style={{
                    backgroundColor: COLORS.surface,
                    borderColor: COLORS.border,
                    "--tw-ring-color": COLORS.navy,
                  } as React.CSSProperties}
                >
                  <input
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    style={{ color: COLORS.navy }}
                    aria-label="Your question"
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={openVoice}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full transition hover:brightness-90"
                      style={{ color: COLORS.navy }}
                      aria-label="Ask with voice"
                      title="Ask with voice"
                    >
                      <Mic className="size-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-white transition hover:brightness-110 disabled:opacity-40"
                    style={{ backgroundColor: COLORS.navy }}
                    aria-label="Send"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
              </form>

              <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"
                    style={{
                      borderColor: COLORS.goldLight,
                      color: COLORS.navy,
                      backgroundColor: COLORS.cream,
                    }}
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

        {/* Chat layout — fades in with delay */}
        <div
          className="flex flex-1 flex-col overflow-hidden transition-opacity duration-250 ease-in"
          style={{
            opacity: started ? 1 : 0,
            pointerEvents: started ? "auto" : "none",
            transitionDelay: started ? "50ms" : "0ms",
            zIndex: started ? 10 : 0,
          }}
        >
            {/* Messages area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            >
              <div className="mx-auto max-w-4xl space-y-4">
                {messages.map((m, i) => (
                  <div key={i}>
                    {m.role === "user" ? (
                      // User message
                      <div className="flex justify-end">
                        <div
                          className="max-w-[85%] rounded-3xl px-4 py-2.5 text-sm font-medium text-white sm:max-w-[75%]"
                          style={{ backgroundColor: COLORS.navy }}
                        >
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      // Assistant message
                      <div className="flex justify-start gap-3">
                        <img
                          src="/mascot/idle.png"
                          alt=""
                          className="size-10 shrink-0 rounded-full object-contain"
                        />
                        <div
                          className="max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm sm:max-w-[75%]"
                          style={{
                            backgroundColor: COLORS.surface,
                            borderColor: COLORS.border,
                          }}
                        >
                          <h3
                            className="text-sm font-bold"
                            style={{ color: COLORS.navy }}
                          >
                            Hi! I&apos;m Asst. Kiko 🐾
                          </h3>
                          <div
                            className="prose prose-sm prose-slate mt-2 max-w-none"
                            style={{ "--tw-prose-headings": COLORS.navy } as React.CSSProperties}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                ul: ({ children }) => (
                                  <ul className="list-none space-y-1 pl-0">
                                    {children}
                                  </ul>
                                ),
                                li: ({ children }) => (
                                  <li className="flex items-start gap-2">
                                    <CheckCircle2
                                      className="mt-0.5 size-4 shrink-0"
                                      style={{ color: COLORS.online }}
                                    />
                                    <span style={{ color: COLORS.navy }}>
                                      {children}
                                    </span>
                                  </li>
                                ),
                                p: ({ children }) => (
                                  <p style={{ color: COLORS.navy, margin: "0.5rem 0" }}>
                                    {children}
                                  </p>
                                ),
                              }}
                            >
                              {m.content}
                            </ReactMarkdown>
                          </div>
                          <p
                            className="mt-2 text-xs font-medium"
                            style={{ color: COLORS.textMuted }}
                          >
                            Just now
                          </p>
                        </div>
                        <div className="mt-1.5 flex justify-end border-t border-slate-100 pt-1.5">
                        <SpeakButton text={m.content} />
                      </div>
                    </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start gap-3">
                    <img
                      src="/mascot/thinking.png"
                      alt=""
                      className="size-10 shrink-0 rounded-full object-contain"
                    />
                    <div
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold"
                      style={{
                        backgroundColor: COLORS.surface,
                        borderColor: COLORS.border,
                        color: COLORS.textMuted,
                      }}
                    >
                      <Loader2 className="size-4 animate-spin" />
                      Searching ordinances...
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                      style={{
                        backgroundColor: "#FEE2E2",
                        borderColor: "#FECACA",
                        color: "#991B1B",
                      }}
                    >
                      {error}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input bar with mascot avatar */}
            <div
              className="shrink-0 border-t px-4 py-4 sm:px-6"
              style={{
                backgroundColor: COLORS.surface,
                borderColor: COLORS.border,
              }}
            >
              <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
                <div
                  className="flex items-center gap-2 rounded-2xl border px-4 py-2.5 transition focus-within:ring-2 focus-within:ring-offset-2"
                  style={{
                    borderColor: COLORS.border,
                    "--tw-ring-color": COLORS.navy,
                  } as React.CSSProperties}
                >
                  {/* Mascot avatar */}
                  <img
                    src={getMascotImagePath(mascotState)}
                    alt="Kiko"
                    className="size-11 shrink-0 rounded-full object-contain"
                  />
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    style={{ color: COLORS.navy }}
                    aria-label="Your message"
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={() => setVoiceOpen(true)}
                      disabled={loading}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full transition hover:brightness-90 disabled:opacity-40"
                      style={{ color: COLORS.navy }}
                      aria-label="Ask with voice"
                      title="Ask with voice"
                    >
                      <Mic className="size-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-white transition hover:brightness-110 disabled:opacity-40"
                    style={{ backgroundColor: COLORS.navy }}
                    aria-label="Send"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
                <p
                  className="mt-2 text-center text-xs font-medium"
                  style={{ color: COLORS.textMuted }}
                >
                  Asst. Kiko can make mistakes. Please verify important information.
                </p>
              </form>
            </div>
        </div>

        {voiceOpen && (
          <VoiceModal
            onClose={() => setVoiceOpen(false)}
            onTranscript={handleVoiceTranscript}
          />
        )}
      </div>
    </div>
  )
}
