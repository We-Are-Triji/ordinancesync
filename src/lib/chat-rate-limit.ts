import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"
import { getDb } from "./mongodb"

const COLLECTION = "chat_rate_limits"
const MINUTE_LIMIT = 10
const DAY_LIMIT = 100
const MINUTE_WINDOW_MS = 60 * 1000
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000
const DOC_TTL_SECONDS = 2 * 24 * 60 * 60

interface RateLimitDocument {
  _id: string
  minuteHits: Date[]
  dayHits: Date[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatRateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
  limit: number
  remaining: number
  window: "minute" | "day"
}

let indexPromise: Promise<void> | null = null

async function getCollection() {
  const db = await getDb()
  const collection = db.collection<RateLimitDocument>(COLLECTION)

  indexPromise ??= collection
    .createIndex(
      { updatedAt: 1 },
      { expireAfterSeconds: DOC_TTL_SECONDS, name: "chat_rate_limit_ttl" }
    )
    .then(() => undefined)

  await indexPromise
  return collection
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex")
}

function forwardedForIp(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null
}

function forwardedHeaderIp(value: string | null): string | null {
  const match = value?.match(/(?:^|[;,]\s*)for=(?:"?)([^",;]+)/i)
  return match?.[1]?.trim() || null
}

function normalizeIp(ip: string): string {
  const value = ip.trim().replace(/^"|"$/g, "")
  if (value.startsWith("[") && value.includes("]")) {
    return value.slice(1, value.indexOf("]"))
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) {
    return value.slice(0, value.lastIndexOf(":"))
  }
  return value
}

export function getClientIp(request: NextRequest): string {
  const headers = request.headers
  const candidate =
    headers.get("cf-connecting-ip") ||
    forwardedForIp(headers.get("x-forwarded-for")) ||
    forwardedForIp(headers.get("x-vercel-forwarded-for")) ||
    headers.get("x-real-ip") ||
    headers.get("x-client-ip") ||
    forwardedHeaderIp(headers.get("forwarded")) ||
    "unknown"

  return normalizeIp(candidate)
}

function retryAfterSeconds(hits: Date[], windowMs: number): number {
  if (hits.length === 0) return 1
  const oldest = hits
    .map((hit) => hit.getTime())
    .sort((a, b) => a - b)[0]
  return Math.max(1, Math.ceil((oldest + windowMs - Date.now()) / 1000))
}

/**
 * Durable per-IP limiter for public chat. It stores a bounded sliding log in
 * MongoDB so limits survive cold starts and apply across serverless instances.
 */
export async function checkChatRateLimit(
  ip: string
): Promise<ChatRateLimitResult> {
  const now = new Date()
  const minuteStart = new Date(now.getTime() - MINUTE_WINDOW_MS)
  const dayStart = new Date(now.getTime() - DAY_WINDOW_MS)
  const key = `chat:${hashIp(ip)}`
  const collection = await getCollection()

  const doc = await collection.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          minuteHits: {
            $filter: {
              input: { $ifNull: ["$minuteHits", []] },
              as: "hit",
              cond: { $gte: ["$$hit", minuteStart] },
            },
          },
          dayHits: {
            $filter: {
              input: { $ifNull: ["$dayHits", []] },
              as: "hit",
              cond: { $gte: ["$$hit", dayStart] },
            },
          },
          createdAt: { $ifNull: ["$createdAt", now] },
        },
      },
      {
        $set: {
          minuteHits: { $concatArrays: ["$minuteHits", [now]] },
          dayHits: { $concatArrays: ["$dayHits", [now]] },
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  )

  const minuteHits = doc?.minuteHits ?? [now]
  const dayHits = doc?.dayHits ?? [now]
  const minuteExceeded = minuteHits.length > MINUTE_LIMIT
  const dayExceeded = dayHits.length > DAY_LIMIT

  if (dayExceeded) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(dayHits, DAY_WINDOW_MS),
      limit: DAY_LIMIT,
      remaining: 0,
      window: "day",
    }
  }

  if (minuteExceeded) {
    return {
      allowed: false,
      retryAfterSeconds: retryAfterSeconds(minuteHits, MINUTE_WINDOW_MS),
      limit: MINUTE_LIMIT,
      remaining: 0,
      window: "minute",
    }
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    limit: MINUTE_LIMIT,
    remaining: Math.max(0, MINUTE_LIMIT - minuteHits.length),
    window: "minute",
  }
}
