/**
 * Shared audio playback that survives browser autoplay restrictions.
 *
 * Approach: Web Audio API. We create/resume a single AudioContext DURING a user
 * gesture (mic open, Send, Listen click). A gesture-resumed AudioContext can
 * play decoded audio later without being blocked — unlike <audio>.play(), which
 * the browser blocks when it fires seconds after the gesture (our case: TTS
 * plays after the chat + TTS round trips).
 */

let ctx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

/**
 * Call synchronously inside a user-gesture handler (click) to unlock audio for
 * later programmatic playback. Safe to call repeatedly.
 */
export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === "suspended") {
    // resume() inside a gesture unlocks the context for later playback.
    c.resume().catch(() => {})
  }
}

/**
 * Decodes and plays base64-encoded audio through the unlocked AudioContext.
 * Resolves when playback finishes.
 */
export async function playBase64(base64: string): Promise<void> {
  const c = getCtx()
  if (!c) throw new Error("Web Audio not supported")

  if (c.state === "suspended") {
    await c.resume().catch(() => {})
  }

  // base64 -> ArrayBuffer
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const audioBuffer = await c.decodeAudioData(bytes.buffer)

  stopAudio()

  return new Promise<void>((resolve) => {
    const source = c.createBufferSource()
    source.buffer = audioBuffer
    source.connect(c.destination)
    source.onended = () => {
      if (currentSource === source) currentSource = null
      resolve()
    }
    currentSource = source
    source.start(0)
  })
}

/**
 * Convenience for a `data:audio/...;base64,XXX` URL — extracts the base64 and
 * plays it. Kept so existing callers don't change shape.
 */
export async function playDataUrl(dataUrl: string): Promise<void> {
  const comma = dataUrl.indexOf(",")
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return playBase64(base64)
}

/** Stops any current playback. */
export function stopAudio(): void {
  if (currentSource) {
    try {
      currentSource.onended = null
      currentSource.stop(0)
    } catch {
      /* already stopped */
    }
    currentSource = null
  }
}
