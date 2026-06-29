import { useData } from "@/lib/data";
import { useYearCtx } from "@/lib/year";

/** Global year selector for snapshot views (treemap, sankey, category lists). */
export function YearBar() {
  const { data } = useData();
  const { year, setYear } = useYearCtx();
  if (!data) return null;
  const years = data.budget.meta.years;
  const min = years[0];
  const max = years[years.length - 1];
  const current = year ?? max;

  return (
    <div className="border-b border-ink-line bg-cream-dark/60">
      <div className="mx-auto max-w-6xl px-5 py-2 flex items-center gap-3 text-sm">
        <span className="text-ink-muted shrink-0">Stichjahr</span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={current}
          onChange={(e) => setYear(Number(e.target.value))}
          className="flex-1 max-w-md accent-red-600"
          aria-label="Stichjahr wählen"
        />
        <span className="font-display font-bold text-ink tabular-nums w-12">{current}</span>
        {current === max && <span className="text-xs text-ink-muted">(vorläufig)</span>}
        {year !== null && year !== max && (
          <button onClick={() => setYear(null)} className="text-xs text-red-600 hover:underline">
            aktuellstes
          </button>
        )}
      </div>
    </div>
  );
}
