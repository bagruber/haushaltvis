import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useData, einzelplanName, einzelplanSections, bereichSeries, latestYear, totals } from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { useAnsicht, useTeilScroll } from "@/lib/teilen";
import { Timeline, TimelineControls } from "@/components/Timeline";
import { CaretRight } from "@phosphor-icons/react";
import { AbschnittLink, Klecks, Loading, Teilen } from "@/components/ui";
import { Nummer, Nummerngeruest, doppelte, useNummern } from "@/lib/nummern";
import { EINZELPLAN_COLORS } from "@/lib/colors";
import { einzelplanKategorie } from "@/lib/kategorien";
import { fmtEur, fmtEurFine, fmtEurShort, fmtPct } from "@/lib/format";

export function EinzelplanDetail() {
  // Zwei Adressen, eine Seite: /einzelplan/2 und /bereich/21 (dort führt die
  // Bereichsnummer den Einzelplan in ihrer ersten Stelle mit).
  const { ep: epParam = "", ab } = useParams();
  const ep = ab ? ab[0] : epParam;
  const { data, error } = useData();
  const [mode, setMode] = useAnsicht();
  const { year: selYear } = useYearCtx();
  const { zeigen } = useNummern();

  const view = useMemo(() => {
    if (!data) return null;
    const y = selYear ?? latestYear(data.budget);
    const sections = einzelplanSections(data, ep, y).map((s) => {
      const einnahmen = bereichSeries(data, s.code, "E", "verwaltung");
      return {
        ...s,
        laufend: bereichSeries(data, s.code, "A", "verwaltung"),
        invest: bereichSeries(data, s.code, "A", "vermoegen"),
        einnahmen,
        hasEinnahmen: einnahmen.ansatz.some((v) => v) || einnahmen.ergebnis.some((v) => v),
      };
    });
    // Notiz und Erklaersatz zum Zwischenstand stehen auf der Seite nur einmal,
    // am ersten Bereich, der ueberhaupt Rauten hat.
    const ersteMitZwischen = sections.findIndex((x) => x.laufend.zwischen);
    const total = sections.reduce((s, x) => s + x.total, 0);
    const hasInvest = sections.some((s) => s.invest.ansatz.some((v) => v) || s.invest.ergebnis.some((v) => v));
    const hasEinnahmen = sections.some((s) => s.hasEinnahmen);
    return {
      y,
      sections,
      total,
      hasInvest,
      hasEinnahmen,
      ersteMitZwischen,
      hasContext: !!(data.context.cpi || data.context.population),
      gesamt: totals(data.budget, y).ausgaben,
      pop: data.context.population?.[String(y)],
      name: einzelplanName(data, ep),
      intro: data.einleitungen[`ep:${ep}`],
    };
  }, [data, ep, selYear]);

  usePageTitle(view ? `Einzelplan ${ep} · ${view.name}` : undefined);
  useTeilScroll(ab, !!view);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;
  if (!/^[0-9]$/.test(ep))
    return <p className="text-ink-muted">Unbekannter Einzelplan. <Link className="text-red-600 underline" to="/erkunden">Zur Übersicht</Link></p>;

  const color = EINZELPLAN_COLORS[ep] ?? "#999";

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        <Link to="/erkunden" className="hover:text-ink">Haushalt erkunden</Link>
        <CaretRight size={12} aria-hidden />
        <span className="text-ink">Einzelplan {ep}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Klecks farbe={color} icon={einzelplanKategorie(ep).icon} />
          <h1 className="font-display text-3xl font-bold">{ep} · {view.name}</h1>
          <Teilen className="ml-auto" />
        </div>
        {view.intro && <p className="max-w-3xl text-ink-soft">{view.intro}</p>}
      </header>

      <div className="flex flex-wrap items-center gap-4">
        {/* Round 1: millions are hard to picture; a share and a per-head figure make them tangible. */}
        <span className="rounded-md bg-white border border-ink-line px-3 py-1.5 text-sm">
          Ausgaben {view.y}: <b>{fmtEurShort(view.total)}</b>
          {view.gesamt > 0 && <span className="text-ink-muted"> · {fmtPct(view.total / view.gesamt)} aller Ausgaben</span>}
          {view.pop && <span className="text-ink-muted"> · {fmtEurFine(view.total / view.pop)} je Einwohner</span>}
        </span>
        <TimelineControls mode={mode} setMode={setMode} hasContext={view.hasContext} hasEinnahmen={view.hasEinnahmen} />
      </div>

      <div className="space-y-4">
        {view.sections.map((s, i) => (
          <section key={s.code} id={s.code} className="scroll-mt-28 border-t border-ink-line pt-3">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h2 className="flex min-w-0 items-baseline gap-2 font-display text-lg font-bold">
                {/* Auf dieser Ebene ist die Nummer Orientierung, nicht Detail:
                    sie steht immer, unabhängig vom Nummern-Schalter. */}
                <Nummerngeruest wert={`${s.code}xx`} className="shrink-0 text-sm font-normal text-ink-soft" />
                <span className="truncate">{s.label}</span>
                <AbschnittLink pfad={`/bereich/${s.code}`} titel={s.label} />
              </h2>
              <span className="tabular-nums text-ink-soft">{fmtEur(s.total)}</span>
            </div>

            {/* Die Legende gilt fuer alle Bereichsdiagramme der Seite und
                steht deshalb nur ueber dem ersten. */}
            <Timeline laufend={s.laufend} invest={s.invest} einnahmen={s.einnahmen} mode={mode} context={data!.context} baseYear={view.y} color={color} height={220} legende={i === 0} zwischenNotiz={i === view.ersteMitZwischen} />

            <ul className="space-y-1.5 text-sm mt-3">
              {s.einrichtungen.map((e, _, alle) => (
                <li key={e.glz} className="border-b border-ink-line/50 pb-1.5 last:border-0">
                  <Link to={`/einrichtung/${e.glz}`} className="flex items-center justify-between gap-3 hover:text-red-600 transition-colors">
                    <span className="flex min-w-0 items-baseline">
                      <Nummer wert={e.glz} sichtbar={zeigen || doppelte(alle.map((x) => x.label)).has(e.label)} />
                      <span className="truncate">{e.label}</span>
                    </span>
                    <span className="tabular-nums shrink-0 font-medium">{fmtEur(e.value)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
