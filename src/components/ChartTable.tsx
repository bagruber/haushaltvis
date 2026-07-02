import type { ReactNode } from "react";

interface Props {
  /** Column headers; columns after the first are right-aligned (numbers). */
  columns: string[];
  /** Pre-formatted cell values, one array per row. */
  rows: (string | number | ReactNode)[][];
  summary?: string;
}

/**
 * Collapsed table twin of a canvas chart — the accessible (and copy-pastable)
 * version of the same numbers (WCAG 1.1.1).
 */
export function ChartTable({ columns, rows, summary = "Daten als Tabelle" }: Props) {
  if (!rows.length) return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink w-fit rounded-sm">
        {summary}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink-muted border-b border-ink-line">
            <tr>
              {columns.map((c, i) => (
                <th key={c} className={`py-1 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b border-ink-line/50 last:border-0">
                {r.map((cell, ci) => (
                  <td key={ci} className={`py-1 pr-3 ${ci > 0 ? "text-right tabular-nums" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
