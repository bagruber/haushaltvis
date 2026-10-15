import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";
import { Timeline, TimelineControls } from "@/components/Timeline";
import { Chip, Kennzahl, Loading, Teilen } from "@/components/ui";
import { useData, incomeByCategory, incomeCategory, incomeCategorySeries, latestYear } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { kennung, useAnsicht } from "@/lib/teilen";
import { Nummer, doppelte, useNummern } from "@/lib/nummern";
import { fmtEur, fmtEurFine, fmtPct } from "@/lib/format";
import { STEUERN } from "./Einnahmen";

/**
 * Eine Einnahmeart für sich: Einkommensteuer-Anteil, Gewerbesteuer und so
 * weiter. Dieselbe Zeitreihe wie im Steuer-Diagramm der Einnahmen-Seite, hier
 * aber mit Plan, Ergebnis und dem Stand zum 01.10., dazu die Haushaltsstellen,
 * aus denen sie sich zusammensetzt.
 */
export function Einnahmeart({ teil }: { teil: string }) {
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();
  const [mode, setMode] = useAnsicht();
  const { zeigen } = useNummern();

  const view = useMemo(() => {
    if (!data) return null;
    // Die Kennung ist aus dem Namen gebildet; zurück geht es über alle Arten,
    // nicht nur die des Stichjahrs, damit auch ein alter Link noch trifft.
    const arten = new Set<string>();
    for (const p of Object.values(data.budget.posten)) if (p.ea === "E") arten.add(incomeCategory(p));
    const name = [...arten].find((a) => kennung(a) === teil);
    if (!name) return { name: null } as const;

    const y = selYear ?? latestYear(data.budget);
    const reihe = incomeCategorySeries(data, name);
    const i = reihe.years.indexOf(y);
    const ansatz = i >= 0 ? reihe.ansatz[i] : null;
    const ergebnisVor = i > 0 ? reihe.ergebnis[i - 1] : null;
    const pop = data.context.population?.[String(y)];
    // Stand zum 01.10. im Stichjahr, und zum Vergleich derselbe Tag im Vorjahr,
    // je gegen den Ansatz seines eigenen Jahres.
    const anteil = (jahr: number) => {
      const z = reihe.zwischen?.find((x) => x.jahr === jahr);
      const a = reihe.ansatz[reihe.years.indexOf(jahr)];
      return z && a ? { ist: z.ist, quote: z.ist / a } : null;
    };
    const stand = anteil(y);
    const standVor = anteil(y - 1);
    const posten = incomeByCategory(data, y).find((g) => g.key === name)?.posten ?? [];
    const farbe = STEUERN.find(([n]) => n === name)?.[1];
    return {
      name,
      y,
      reihe,
      ansatz,
      ergebnisVor,
      pop,
      stand,
      standVor,
      posten,
      farbe,
      hasContext: !!(data.context.cpi || data.context.population),
    };
  }, [data, teil, selYear]);

  usePageTitle(view?.name ?? undefined);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;
  if (!view.name)
    return (
      <p className="text-ink-muted">
        Unbekannte Einnahmeart.{" "}
        <Link className="text-red-600 underline" to="/erkunden/einnahmen">Zu den Einnahmen</Link>
      </p>
    );

  const { name, y, reihe, ansatz, ergebnisVor, pop, stand, standVor, posten, farbe, hasContext } = view;
  const dup = doppelte(posten.map((p) => p.label));

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        <Link to="/erkunden/einnahmen" className="underline-offset-2 hover:text-ink hover:underline">Einnahmen</Link>
        <CaretRight size={12} aria-hidden />
        <span className="text-ink-soft">{name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{name}</h1>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Chip>Einnahmeart</Chip>
          <Teilen className="ml-auto" />
        </div>
      </header>

      <div className="flex flex-wrap gap-x-10 gap-y-3 border-y border-ink-line py-4">
        {ansatz != null && (
          <Kennzahl
            wert={fmtEur(ansatz)}
            label={`Ansatz ${y}${pop ? `, ${fmtEurFine(ansatz / pop)} je Einwohner` : ""}`}
            className="text-2xl"
          />
        )}
        {ergebnisVor != null && <Kennzahl wert={fmtEur(ergebnisVor)} label={`Ergebnis ${y - 1}`} className="text-2xl" />}
        {stand && (
          <Kennzahl
            wert={fmtEur(stand.ist)}
            label={
              <>
                eingegangen bis 30.09.{y}, {fmtPct(stand.quote)} des Ansatzes
                {standVor && <> (Vorjahr zum selben Tag: {fmtPct(standVor.quote)})</>}
              </>
            }
            className="text-2xl"
          />
        )}
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-xl font-bold">Über die Jahre</h2>
          <span className="text-xs text-ink-muted">Plan gegen Ergebnis. Für {latestYear(data!.budget)} nur der Plan.</span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={hasContext} />
        <Timeline laufend={reihe} mode={mode} context={data!.context} baseYear={y} color={farbe} art="E" height={300} />
      </section>

      <section className="rounded-lg border border-ink-line bg-white p-4">
        <h2 className="mb-2 font-display text-lg font-bold">Haushaltsstellen {y}</h2>
        {posten.length ? (
          <ol className="space-y-1.5 text-sm">
            {posten.map((p) => (
              <li key={p.key} className="border-b border-ink-line/60 pb-1.5">
                <Link to={`/posten/${p.key}`} className="flex justify-between gap-3 transition-colors hover:text-red-600">
                  <span className="flex items-baseline text-ink-soft">
                    <Nummer wert={p.key} sichtbar={zeigen || dup.has(p.label)} />
                    <span>{p.label}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{fmtEur(p.value)}</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-muted">Für {y} ist dafür nichts angesetzt.</p>
        )}
      </section>
    </div>
  );
}
