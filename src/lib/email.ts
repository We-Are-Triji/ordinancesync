import { Resend } from "resend"

// Resend's shared sandbox sender works without a verified domain. In test mode
// it only delivers to the email that owns the Resend account, which is fine for
// the prototype demo. Override with RESEND_FROM_EMAIL once a domain is verified.
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "OrdinanceSync <onboarding@resend.dev>"

let client: Resend | null = null

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error("Missing RESEND_API_KEY environment variable.")
  }
  if (!client) {
    client = new Resend(key)
  }
  return client
}

export interface SendEmailInput {
  to: string
  subject: string
  text: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const resend = getClient()
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      text: input.text,
    })

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    }
  }
}
