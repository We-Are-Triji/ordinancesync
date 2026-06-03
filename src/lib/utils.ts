import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shared client-side email validation used by the office add/edit modals so
 * both forms enforce identical rules.
 *
 * It checks the standard "local@domain.tld" shape and then applies a couple
 * of pragmatic guards on the top-level domain (the part after the final dot)
 * to catch common fat-finger typos:
 *   - rejects consecutive dots (e.g. "a@b..com")
 *   - TLD must be 2–24 alphabetic characters
 *   - TLD can't contain a run of 3+ identical letters (catches "dept.commmm",
 *     "gmail.commm", etc.) — no real TLD does this.
 *
 * Note: without a full public-suffix list we can't guarantee a TLD is real;
 * these rules catch obvious mistakes while staying permissive for valid ones.
 */
export function isValidEmail(value: string): boolean {
  const email = value.trim()
  if (!email || email.length > 254) return false
  if (email.includes("..")) return false

  const match = /^[^\s@]+@[^\s@]+\.([a-zA-Z]{2,24})$/.exec(email)
  if (!match) return false

  const tld = match[1]
  // Reject any letter repeated 3+ times in a row in the TLD.
  if (/([a-zA-Z])\1\1/.test(tld)) return false

  return true
}
