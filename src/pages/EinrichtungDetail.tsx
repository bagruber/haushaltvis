import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Timeline, TimelineControls } from "@/components/Timeline";
import { useAnsicht } from "@/lib/teilen";
import { usePageTitle } from "@/lib/title";
import { CaretRight } from "@phosphor-icons/react";
import { Chip, Kennzahl, Loading, Teilen, ThemaPlatzhalter, WechselMarke } from "@/components/ui";
import { Nummer, NummernSchalter, doppelte, useNummern } from "@/lib/nummern";
import {
  useData,
  einrichtungInfo,
  einrichtungPosten,
  einrichtungSeries,
  factsOfYear,
  latestYear,
  nurPlanSatz,
  vorhanden,
  wechsel,
  type Wechsel,
} from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { fmtEur, fmtEurFine } from "@/lib/format";

export function EinrichtungDetail() {
  const { glz = "" } = useParams();
  const { data, error } = useData();
  const [mode, setMode] = useAnsicht();
  const { year: selYear } = useYearCtx();

  const view = useMemo(() => {
    if (!data) return null;
    const info = einrichtungInfo(data, glz);
    if (!info) return { info: null } as const;
    const y = selYear ?? latestYear(data.budget);
    const entwurf = data.budget.meta.entwurf?.jahr === y;
    const laufend = einrichtungSeries(data, glz, "A", "verwaltung");
    const invest = einrichtungSeries(data, glz, "A", "vermoegen");
    const einnahmen = einrichtungSeries(data, glz, "E", "verwaltung");
    const hasInvest = invest.ansatz.some((v) => v) || invest.ergebnis.some((v) => v);
    const hasEinnahmen = einnahmen.ansatz.some((v) => v) || einnahmen.ergebnis.some((v) => v);
    // Die Stellen des Stichjahrs, dazu ausgegraut die, die es im Vorjahr noch
    // gab. Was schon länger fehlt oder erst später kommt, steht nicht da: Eine
    // „0 €“ wäre dort falsch, es gibt die Stelle in dem Jahr nicht.
    const erl = data.erlaeuterungen?.jahr === y ? data.erlaeuterungen : undefined;
    const posten = einrichtungPosten(data, glz)
      .map((p) => ({ ...p, wechsel: wechsel(data, p.hhst_id, y), erlaeuterung: erl?.stellen[p.hhst_id]?.text }))
      .filter((p) => vorhanden(data, p.hhst_id, y) || p.wechsel === "weg");

    const latest = new Map<string, number>();
    for (const f of factsOfYear(data.budget, y)) {
      if (f.ansatz != null) latest.set(f.hhst_id, f.ansatz);
    }

    const hasContext = !!(data.context.cpi || data.context.population);
    // Cost recovery in the latest year: how much of the running cost the
    // facility earns back through fees, rents and charges.
    const i = laufend.years.indexOf(y);
    const aus = laufend.ansatz[i] ?? 0;
    const ein = einnahmen.ansatz[i] ?? 0;
    const deckung = aus > 0 ? ein / aus : null;
    const pop = data.context.population?.[String(y)];
    return { info, laufend, invest, einnahmen, hasInvest, hasEinnahmen, posten, latest, y, entwurf, hasContext, aus, ein, deckung, pop };
  }, [data, glz, selYear]);

  usePageTitle(view && view.info ? view.info.label : undefined);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;
  if (!view.info)
    return (
      <p className="text-ink-muted">
        Unbekannte Einrichtung. <Link className="text-red-600 underline" to="/erkunden">Zur Übersicht</Link>
      </p>
    );

  const { info, laufend, invest, einnahmen, hasInvest, hasEinnahmen, posten, latest, y, entwurf, hasContext, aus, ein, deckung, pop } = view;
  const jeKopf = (v: number) => (pop ? `, ${fmtEurFine(v / pop)} je Einwohner` : "");
  const ausgabenPosten = posten.filter((p) => p.ea === "A");
  const einnahmenPosten = posten.filter((p) => p.ea === "E");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted flex flex-wrap items-center gap-1.5">
        <Link to={`/einzelplan/${info.glz[0]}`} className="hover:text-ink underline-offset-2 hover:underline">{info.crumb.aufgabenbereich}</Link>
        <CaretRight size={12} aria-hidden />
        <span className="text-ink-soft">{info.crumb.bereich}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{info.label}</h1>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Chip>Gliederung {info.glz}</Chip>
          <ThemaPlatzhalter />
          <Teilen className="ml-auto" />
        </div>
      </header>

      {hasEinnahmen && deckung != null && (
        <div className="flex flex-wrap gap-x-10 gap-y-3 border-y border-ink-line py-4">
          <Kennzahl wert={fmtEur(aus)} label={`Ausgaben ${y}${jeKopf(aus)}`} className="text-2xl" />
          <Kennzahl wert={fmtEur(ein)} label="Eigene Einnahmen" className="text-2xl" />
          {/* Red is right here: this figure is the shortfall the general budget covers. */}
          <Kennzahl wert={fmtEur(aus - ein)} label={`Eigenanteil der Stadt${jeKopf(aus - ein)}`} className="text-2xl text-red-600" />
          <Kennzahl wert={`${Math.round(deckung * 100)} %`} label="Kostendeckung" className="text-2xl" />
        </div>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-xl font-bold">Laufende Ausgaben über die Jahre</h2>
          <span className="text-xs text-ink-muted">Verwaltungshaushalt; Plan gegen Ergebnis. {nurPlanSatz(data!.budget)}</span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={hasContext} hasEinnahmen={hasEinnahmen} />
        <Timeline laufend={laufend} invest={invest} einnahmen={einnahmen} mode={mode} context={data!.context} baseYear={y} height={300} />
        {hasEinnahmen && (
          <p className="text-xs text-ink-muted">
            „Mit Einnahmen verrechnet" zieht Gebühren, Mieten und Entgelte ab. Übrig bleibt, was der
            allgemeine Haushalt trägt; die graue Linie zeigt weiter alle Ausgaben.
          </p>
        )}
        {hasInvest && (
          <p className="text-xs text-ink-muted">
            Investitionen schwanken stark und erscheinen nur auf Wunsch, als Balken statt als Trend.
          </p>
        )}
      </section>

      <NummernSchalter />
      <section className="grid lg:grid-cols-2 gap-4">
        <PostenList title={`Ausgaben-Posten ${y}${entwurf ? " (Entwurf)" : ""}`} posten={ausgabenPosten} latest={latest} />
        {einnahmenPosten.length > 0 && (
          <PostenList title={`Einnahme-Posten ${y}${entwurf ? " (Entwurf)" : ""}`} posten={einnahmenPosten} latest={latest} />
        )}
      </section>
    </div>
  );
}

function PostenList({
  title,
  posten,
  latest,
}: {
  title: string;
  posten: { hhst_id: string; grz_text: string | null; grz: string; wechsel: Wechsel | null; erlaeuterung?: string[] }[];
  latest: Map<string, number>;
}) {
  const { zeigen } = useNummern();
  // Weggefallene ans Ende; eine Stelle ohne Ansatzzeile, die es nur im
  // Zwischenstand gibt, hat keinen Betrag, keine 0.
  const rows = posten
    .map((p) => ({ p, v: latest.get(p.hhst_id) ?? null }))
    .sort((a, b) => Number(a.p.wechsel === "weg") - Number(b.p.wechsel === "weg") || (b.v ?? 0) - (a.v ?? 0));
  // The same Gruppierung can appear twice in one Einrichtung (both Haushalte).
  const dup = doppelte(rows.map(({ p }) => p.grz_text ?? p.grz));
  return (
    <div className="rounded-lg border border-ink-line bg-white p-4">
      <h2 className="font-display text-lg font-bold mb-2">{title}</h2>
      <ol className="space-y-1.5 text-sm">
        {rows.map(({ p, v }) => (
          <li key={p.hhst_id} className="border-b border-ink-line/60 pb-1.5">
            <Link
              to={`/posten/${p.hhst_id}`}
              className={`flex justify-between gap-3 hover:text-red-600 transition-colors ${p.wechsel === "weg" ? "text-ink-muted" : ""}`}
            >
              <span className={`flex items-baseline ${p.wechsel === "weg" ? "" : "text-ink-soft"}`}>
                <Nummer wert={p.hhst_id} sichtbar={zeigen || dup.has(p.grz_text ?? p.grz)} />
                <span>
                  {p.grz_text ?? p.grz}
                  <WechselMarke wechsel={p.wechsel} />
                  {p.erlaeuterung?.map((t) => (
                    <span key={t} className="mt-0.5 line-clamp-2 text-xs italic text-ink-muted">„{t}“</span>
                  ))}
                </span>
              </span>
              <span className="tabular-nums shrink-0 font-medium">{p.wechsel === "weg" || v == null ? "" : fmtEur(v)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
