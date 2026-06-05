"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

const MASCOT_STATES = [
  "idle",
  "greeting",
  "thinking",
  "answering",
  "apologetic",
  "blocked",
] as const

export type MascotState = (typeof MASCOT_STATES)[number]

const ARIA_LABELS: Record<MascotState, string> = {
  idle: "Mascot: calm and ready",
  greeting: "Mascot: waving hello",
  thinking: "Mascot: thinking...",
  answering: "Mascot: responding with enthusiasm",
  apologetic: "Mascot: apologetic and sorry",
  blocked: "Mascot: unable to help with this",
}

export const MASCOT_STATUS: Record<MascotState, string> = {
  greeting: "Ask me about local ordinances.",
  idle: "Ready to help.",
  thinking: "Searching ordinances...",
  answering: "Preparing response...",
  apologetic: "Something went wrong.",
  blocked: "I can't help with that request.",
}

const BLOCKED_ERROR_PATTERNS = [
  /too many questions/i,
  /today's chat limit/i,
  /message is too long/i,
  /not allowed/i,
  /can't help/i,
  /cannot help/i,
]

const BLOCKED_ANSWER_PATTERNS = [
  /I can only share ordinances/i,
  /couldn't find a matching one/i,
  /can't help with that/i,
]

export function isBlockedError(error: string): boolean {
  return BLOCKED_ERROR_PATTERNS.some((pattern) => pattern.test(error))
}

export function isBlockedAnswer(content: string): boolean {
  return BLOCKED_ANSWER_PATTERNS.some((pattern) => pattern.test(content))
}

export interface MascotProps {
  state?: MascotState
  size?: number | string
  className?: string
  "aria-hidden"?: boolean
  showStatus?: boolean
}

export const Mascot = memo(function Mascot({
  state: stateProp = "idle",
  size = 96,
  className,
  "aria-hidden": ariaHidden,
  showStatus = false,
}: MascotProps) {
  const dimension = typeof size === "number" ? `${size}px` : size
  const activeState = stateProp
  const statusText = MASCOT_STATUS[activeState]

  return (
    <div
      className={cn(
        showStatus && "flex flex-col items-center",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0",
          activeState === "thinking"
            ? "motion-safe:animate-mascot-float-fast"
            : "motion-safe:animate-mascot-float",
        )}
        style={{ width: dimension, height: dimension }}
      >
        {MASCOT_STATES.map((s) => (
          <img
            key={s}
            src={`/mascot/${s}.png`}
            alt=""
            role="img"
            aria-label={ariaHidden ? undefined : ARIA_LABELS[s]}
            aria-hidden={ariaHidden || s !== activeState}
            className={cn(
              "absolute inset-0 size-full object-contain transition-opacity duration-300 ease-in-out",
              s === activeState ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>
      {showStatus && !ariaHidden && (
        <p
          className="mt-3 text-sm font-semibold text-slate-500"
          aria-live="polite"
        >
          {statusText}
        </p>
      )}
    </div>
  )
})
