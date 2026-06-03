"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Landmark, LockKeyhole, Loader2 } from "lucide-react"
import { useAuth } from "@clerk/nextjs"
import { useSignIn } from "@clerk/nextjs/legacy"

export default function AdminLoginPage() {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isSignedIn } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // If already authenticated, go straight to the dashboard.
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/admin/dashboard")
    }
  }, [isSignedIn, router])

  async function handleSubmit(e: React.FormEvent) {
    // Prevent the browser's default GET submission so credentials never
    // appear in the URL. The hook sends them over HTTPS via POST.
    e.preventDefault()
    if (!isLoaded || submitting) return

    setError(null)
    setSubmitting(true)

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        router.replace("/admin/dashboard")
      } else {
        // Password sign-in for a verified user completes in one step. Any
        // other status means additional factors are required.
        setError("Additional verification is required for this account.")
        setSubmitting(false)
      }
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "errors" in err &&
        Array.isArray((err as { errors: unknown[] }).errors)
          ? ((err as { errors: { message?: string }[] }).errors[0]?.message ??
            "Invalid credentials.")
          : "Invalid credentials."
      setError(message)
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mx-auto inline-flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            aria-label="OrdinanceSync home"
          >
            <span className="flex size-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Landmark className="size-6" aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block text-xl font-semibold tracking-tight">
                OrdinanceSync
              </span>
              <span className="block text-xs font-medium uppercase tracking-wider text-gray-600">
                Admin Portal
              </span>
            </span>
          </Link>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-950/10 sm:p-8">
          <div className="mb-6">
            <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <LockKeyhole className="size-5" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Administrator Login
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Secure access for authorized administrators only.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} method="post">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-900"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/20"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/20"
                placeholder="Enter your password"
              />
            </div>

            {/* Clerk bot-protection mounts here when enabled */}
            <div id="clerk-captcha" />

            <button
              type="submit"
              disabled={!isLoaded || submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
            >
              {submitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {!isLoaded
                ? "Loading authentication..."
                : submitting
                  ? "Signing in..."
                  : "Login"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          OrdinanceSync secure government access for Cebu City.
        </p>
      </section>
    </main>
  )
}
