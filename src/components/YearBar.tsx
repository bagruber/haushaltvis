import { useLocation } from "react-router-dom";
import { useData, latestYear } from "@/lib/data";
import { standardJahr, useYearCtx } from "@/lib/year";
import { fmtDatum } from "@/lib/format";
import { NummernSchalter } from "@/lib/nummern";

/**
 * Global year selector for snapshot views (treemap, sankey, category lists).
 * On pages with numbered lists it also carries the numbers switch: sticky, and
 * apart from the chart options it has nothing to do with.
 */
export function YearBar({ nummern }: { nummern?: boolean }) {
  const { data } = useData();
  const { year, setYear } = useYearCtx();
  const { pathname } = useLocation();
  if (!data) return null;
  const years = data.budget.meta.years;
  const min = years[0];
  const max = years[years.length - 1];
  const standard = standardJahr(data.budget, pathname);
  const current = year ?? standard;
  const entwurf = data.budget.meta.entwurf;

  return (
    <div className="border-b border-ink-line bg-cream-dark">
      <div className="mx-auto max-w-6xl px-5 py-2 flex items-center gap-3 text-sm">
        <span className="text-ink-muted shrink-0">Stichjahr</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={current}
          onChange={(e) => setYear(Number(e.target.value))}
          className="flex-1 min-w-0 max-w-md accent-red-600"
          aria-label="Stichjahr wählen"
        />
        <span className="font-display font-bold text-ink tabular-nums w-12">{current}</span>
        {current === entwurf?.jahr ? (
          <span className="text-xs text-ink-muted">(Entwurf, Stand {fmtDatum(entwurf.stand)})</span>
        ) : (
          current === latestYear(data.budget) && <span className="text-xs text-ink-muted">(nur Plan)</span>
        )}
        {year !== null && year !== standard && (
          <button onClick={() => setYear(null)} className="text-xs text-red-600 hover:underline">
            aktuellstes
          </button>
        )}
        {nummern && <NummernSchalter className="ml-auto shrink-0 text-ink-soft" />}
      </div>
    </div>
  );
}
