import Link from "next/link"
import { Landmark, LockKeyhole } from "lucide-react"

export default function LGUPortalLoginPage() {
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
                LGU Portal
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
              LGU Personnel Login
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Secure access for authorized LGU personnel.
            </p>
          </div>

          <form className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-900"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className="mt-2 block w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/20"
                placeholder="Enter your username"
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
                className="mt-2 block w-full rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/20"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="#"
                className="rounded-md text-sm font-medium text-blue-600 transition hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Login
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
