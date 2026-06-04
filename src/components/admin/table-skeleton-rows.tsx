/**
 * Reusable skeleton rows for admin data tables (Active Ordinances + Offices).
 *
 * Why this exists:
 *   - Replaces the single centered "Loading..." spinner with row-shaped
 *     placeholders so the table doesn't visually jump when real data arrives.
 *   - Each cell renders a Tailwind `animate-pulse` bar whose width approximates
 *     the real content (timestamps are wide, status chips are short, etc.),
 *     giving a believable shimmer without inventing layout.
 *   - aria-hidden on the wrapper rows so screen readers announce only the
 *     parent table's loading state once, not 60 placeholder cells.
 *
 * Usage:
 *   {loading ? (
 *     <TableSkeletonRows
 *       rows={PAGE_SIZE}
 *       columns={[
 *         { width: "w-32" },
 *         { width: "w-24" },
 *         { width: "w-56" },
 *         { width: "w-16", asChip: true },
 *         { width: "w-8",  align: "right" },
 *         { width: "w-20", align: "right" },
 *       ]}
 *     />
 *   ) : ...}
 */

export interface SkeletonColumn {
  /** Tailwind width class for the shimmer bar (e.g. "w-32", "w-1/3"). */
  width: string
  /** Cell alignment hint; matches the real <td>/<th> alignment. */
  align?: "left" | "right"
  /** Render a pill-shaped shimmer instead of a flat bar — for status chips. */
  asChip?: boolean
}

interface TableSkeletonRowsProps {
  /** How many placeholder rows to render. Match PAGE_SIZE for stability. */
  rows: number
  /** One config entry per column, in order. */
  columns: SkeletonColumn[]
}

export function TableSkeletonRows({ rows, columns }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {columns.map((col, colIndex) => (
            <td
              key={colIndex}
              className={`px-4 py-3 ${col.align === "right" ? "text-right" : ""}`}
            >
              <span
                className={`inline-block h-3.5 ${col.width} ${
                  col.asChip ? "rounded-full" : "rounded"
                } animate-pulse bg-slate-200`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default TableSkeletonRows
