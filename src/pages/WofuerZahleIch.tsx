import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData, expenseShareByPrimaryTheme, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { Term } from "@/components/Term";
import { fmtEur, fmtEurFine } from "@/lib/format";

// Kommunaler Anteil je Steuerart (vereinfacht).
const ANTEIL_EST = 0.15; // Gemeindeanteil an der Einkommensteuer
const ANTEIL_GRUNDSTEUER = 1.0; // Grundsteuer B: vollständig kommunal

function NumberField({ id, label, hint, value, onChange }: {
  id: string; label: React.ReactNode; hint: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 min-w-[180px]">
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          step={50}
          inputMode="numeric"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="w-32 rounded-md border border-ink-line bg-white px-3 py-1.5 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <span className="text-ink-muted">€ / Jahr</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export function WofuerZahleIch() {
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();
  const [est, setEst] = useState(4000);
  const [grund, setGrund] = useState(400);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const beitrag = est * ANTEIL_EST + grund * ANTEIL_GRUNDSTEUER;
    const shares = expenseShareByPrimaryTheme(data, y);
    return { y, beitrag, shares, max: shares[0]?.share ?? 1 };
  }, [data, selYear, est, grund]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Wofür zahle ich?</h1>
        <p className="text-ink-soft">
          Gib deine jährliche <Term name="ansatz">Einkommensteuer</Term> und Grundsteuer ein —
          der Rechner schätzt deinen <b>kommunalen Beitrag</b> und zeigt, wie die Stadt ihn
          (anteilig zu ihren Gesamtausgaben {view.y}) auf die Themen verteilt.
        </p>
      </header>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap gap-5">
          <NumberField
            id="est"
            label="Einkommensteuer"
            hint="Aus deinem Steuerbescheid. Die Stadt erhält davon rund 15 %."
            value={est}
            onChange={setEst}
          />
          <NumberField
            id="grund"
            label="Grundsteuer B"
            hint="Aus dem Grundsteuerbescheid. Fließt zu 100 % an die Stadt."
            value={grund}
            onChange={setGrund}
          />
        </div>
        <p className="mt-4 border-t border-ink-line pt-3 text-sm">
          Dein geschätzter kommunaler Beitrag:{" "}
          <b className="font-display text-xl text-red-600">{fmtEur(view.beitrag)}</b> / Jahr
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">… davon finanzierst du etwa</h2>
        <p className="text-xs text-ink-muted">Auf einen Bereich tippen, um ihn aufzuklappen.</p>
        <ul className="space-y-2">
          {view.shares.map((s) => {
            const isOpen = open.has(s.theme);
            return (
              <li key={s.theme}>
                <button
                  onClick={() => setOpen((o) => { const n = new Set(o); n.has(s.theme) ? n.delete(s.theme) : n.add(s.theme); return n; })}
                  aria-expanded={isOpen}
                  className="w-full grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-ink-muted text-xs w-3 shrink-0">{isOpen ? "▾" : "▸"}</span>
                    <span className="inline-block h-3 w-3 rounded-sm shrink-0" style={{ background: s.color }} />
                    <span className="truncate font-medium">{s.label}</span>
                  </div>
                  <span className="tabular-nums text-right font-medium">
                    {fmtEurFine(view.beitrag * s.share)}
                    <span className="text-ink-muted font-normal"> · {(s.share * 100).toFixed(0)}%</span>
                  </span>
                  <div className="col-span-2 h-1.5 rounded-full bg-cream-dark overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.share / view.max) * 100}%`, background: s.color }} />
                  </div>
                </button>

                {isOpen && (
                  <ul className="mt-1.5 ml-6 space-y-1 border-l border-ink-line pl-3">
                    {s.children.map((c) => (
                      <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink-soft">{c.label}</span>
                        <span className="tabular-nums shrink-0 text-ink-soft">{fmtEurFine(view.beitrag * c.share)}</span>
                      </li>
                    ))}
                    <li className="pt-0.5">
                      <Link to={`/themen/${s.theme}`} className="text-xs text-red-600 hover:underline">Thema öffnen →</Link>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs text-ink-muted">
        Vereinfachtes Modell: Berücksichtigt sind nur Einkommensteuer (15 % Gemeindeanteil) und
        Grundsteuer B (100 %). Gewerbe-, Umsatz- und Kapitalertragsteuer lassen sich nicht
        sinnvoll einzelnen Personen zuordnen und sind nicht enthalten. Die Stadt finanziert sich
        zudem aus Zuweisungen, Gebühren und weiteren Quellen. Die Verteilung entspricht den
        Anteilen der Gesamtausgaben (Hauptthema je Posten). Siehe{" "}
        <Link to="/methodik" className="underline hover:text-ink">Methodik</Link>.
      </p>
    </div>
  );
}
