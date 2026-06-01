export function TypingIndicator() {
  return (
    <span
      className="flex items-center gap-1"
      role="status"
      aria-label="Assistant is typing"
    >
      <span className="typing-dot size-2 rounded-full bg-brand/60 [animation-delay:0ms]" />
      <span className="typing-dot size-2 rounded-full bg-brand/60 [animation-delay:160ms]" />
      <span className="typing-dot size-2 rounded-full bg-brand/60 [animation-delay:320ms]" />
    </span>
  )
}
