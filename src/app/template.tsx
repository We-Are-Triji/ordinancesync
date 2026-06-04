/**
 * Page transition wrapper.
 *
 * Why a template (not a layout):
 *   In Next.js App Router, layouts persist between navigations while
 *   templates remount with each navigation. By wrapping every page in this
 *   template and applying a CSS fade-in animation, we get a smooth fade
 *   transition on every route change without pulling in framer-motion or
 *   client-side mounting state.
 *
 * Why this is safe for SSR:
 *   The template renders on the server with stable markup; the animation is
 *   pure CSS, so no JS hydration is required and no hydration warnings can
 *   surface. The `prefers-reduced-motion` reset in globals.css disables the
 *   animation for users who request it.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="page-transition">{children}</div>
}
