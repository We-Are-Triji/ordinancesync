/**
 * Scoped App Router template for public routes. Unlike layout.tsx, this
 * remounts on every navigation within the (public) group, replaying a short
 * crossfade on the inner content area only. The shared <SiteHeader/> lives
 * in the parent layout, so it stays put while only the page body animates,
 * which is what makes landing -> /chat feel fluid instead of flashy.
 *
 * The animation itself is defined in globals.css (.public-transition) and is
 * disabled automatically for users who prefer reduced motion.
 */
export default function PublicTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="public-transition">{children}</div>
}
