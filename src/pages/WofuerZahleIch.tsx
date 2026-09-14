import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useData, netBurdenByEinzelplan, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { ArrowRight, CaretDown, CaretRight } from "@phosphor-icons/react";
import { Klecks, Loading, SeitenKopf, Stripe } from "@/components/ui";
import { einzelplanKategorie } from "@/lib/kategorien";
import { cn } from "@/lib/cn";
import { Term } from "@/components/Term";
import { fmtEur, fmtEurFine } from "@/lib/format";

// Kommunaler Anteil je Steuerart (vereinfacht).
const ANTEIL_EST = 0.15; // Gemeindeanteil an der Einkommensteuer
const ANTEIL_GRUNDSTEUER = 1.0; // Grundsteuer B: vollständig kommunal

// Grobe Beispielwerte zum Einstieg — wer seine Zahlen kennt, tippt sie ein.
const PRESETS: { label: string; est: number; grund: number }[] = [
  { label: "Single, zur Miete", est: 5000, grund: 0 },
  { label: "Familie im Eigenheim", est: 7500, grund: 450 },
  { label: "Rente, Eigentumswohnung", est: 800, grund: 300 },
];

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
          className="h-10 w-32 rounded-lg border border-ink-line bg-white px-3 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <span className="text-ink-muted">€ / Jahr</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

export function WofuerZahleIch() {
  usePageTitle("Wofür zahle ich?");
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Inputs live in the URL, so a filled-in calculator can be shared as a link.
  const [searchParams, setSearchParams] = useSearchParams();
  const readAmount = (key: string, fallback: number) => {
    const raw = searchParams.get(key);
    if (raw == null) return fallback;
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  const est = readAmount("est", 4000);
  const grund = readAmount("grundsteuer", 400);
  const setAmounts = (nextEst: number, nextGrund: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("est", String(nextEst));
        next.set("grundsteuer", String(nextGrund));
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  const setEst = (v: number) => setAmounts(v, grund);
  const setGrund = (v: number) => setAmounts(est, v);

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const beitrag = est * ANTEIL_EST + grund * ANTEIL_GRUNDSTEUER;
    const shares = netBurdenByEinzelplan(data, y);
    return { y, beitrag, shares, max: shares[0]?.share ?? 1 };
  }, [data, selYear, est, grund]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;

  return (
    <div className="space-y-6 max-w-2xl">
      <SeitenKopf titel="Wofür zahle ich?" script="pro Kopf">
        <p>
          Gib deine jährliche Einkommensteuer und Grundsteuer ein — der Rechner schätzt deinen{" "}
          <b>kommunalen Beitrag</b> und zeigt, wohin er {view.y} fließt. Verteilt wird nach{" "}
          <b>Zuschussbedarf</b>: Bereiche, die sich über Gebühren selbst tragen, kosten dich fast
          nichts — Steuergeld deckt vor allem das, was übrig bleibt.
        </p>
      </SeitenKopf>

      <section className="rounded-lg border border-ink-line bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="shrink-0 text-xs text-ink-muted">Beispiele:</span>
          {/* Chips as one row that scrolls sideways when it runs out of room. */}
          <div className="-my-1 flex min-w-0 gap-2 overflow-x-auto py-1">
            {PRESETS.map((p) => {
              const gewaehlt = est === p.est && grund === p.grund;
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={gewaehlt}
                  onClick={() => setAmounts(p.est, p.grund)}
                  className={cn(
                    "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors",
                    gewaehlt ? "border-ink bg-ink text-cream" : "border-ink-line bg-white text-ink-soft hover:text-ink",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
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
      </section>

      <section className="relative overflow-hidden rounded-lg bg-flaeche-haushalt px-6 pt-5 pb-7 text-cream">
        <p className="text-sm">Dein geschätzter kommunaler Beitrag</p>
        <p className="mt-1 font-display text-4xl font-semibold text-gold-200 lining-nums tabular-nums">
          {fmtEur(view.beitrag)} <span className="font-sans text-base font-normal text-cream">pro Jahr</span>
        </p>
        <Stripe className="absolute inset-x-0 bottom-0" />
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">… davon finanzierst du etwa</h2>
        <p className="text-xs text-ink-muted">Auf einen Bereich tippen, um ihn aufzuklappen.</p>
        <ul className="space-y-2">
          {view.shares.map((s, i) => {
            const isOpen = open.has(s.ep);
            return (
              <li key={s.ep}>
                <button
                  onClick={() => setOpen((o) => { const n = new Set(o); n.has(s.ep) ? n.delete(s.ep) : n.add(s.ep); return n; })}
                  aria-expanded={isOpen}
                  className="w-full grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen
                      ? <CaretDown size={14} aria-hidden className="shrink-0 text-ink-muted" />
                      : <CaretRight size={14} aria-hidden className="shrink-0 text-ink-muted" />}
                    <Klecks farbe={s.color} icon={einzelplanKategorie(s.ep).icon} dicht variante={i} />
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
                  <ul className="mt-1.5 ml-[60px] space-y-1 border-l border-ink-line pl-3">
                    {s.einnahmen > 0 && (
                      <li className="pb-1 text-xs text-ink-muted">
                        {fmtEur(s.ausgaben)} Ausgaben, davon {fmtEur(s.einnahmen)} über eigene
                        Einnahmen gedeckt ({Math.round((s.einnahmen / s.ausgaben) * 100)} %).
                      </li>
                    )}
                    {s.children.map((c) => (
                      <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink-soft">{c.label}</span>
                        <span className="tabular-nums shrink-0 text-ink-soft">{fmtEurFine(view.beitrag * c.share)}</span>
                      </li>
                    ))}
                    <li className="pt-0.5">
                      <Link to={`/einzelplan/${s.ep}`} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                        Aufgabenbereich öffnen <ArrowRight size={12} aria-hidden />
                      </Link>
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
        zudem aus Zuweisungen, Gebühren und weiteren Quellen. Verteilt wird nach dem
        Zuschussbedarf je <Term name="einzelplan">Einzelplan</Term> (Ausgaben abzüglich eigener
        Einnahmen); die Finanzwirtschaft, aus der die Steuern selbst stammen, ist keine Ausgabe
        und daher nicht aufgeführt. Siehe{" "}
        <Link to="/methodik" className="underline hover:text-ink">Methodik</Link>.
      </p>
    </div>
  );
}
