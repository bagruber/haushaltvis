import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Timeline, TimelineControls, type TimelineMode } from "@/components/Timeline";
import { usePageTitle } from "@/lib/title";
import { Chip, Loading, ThemaPlatzhalter } from "@/components/ui";
import {
  useData,
  einrichtungInfo,
  einrichtungPosten,
  einrichtungSeries,
  factsOfYear,
  latestYear,
} from "@/lib/data";
import { fmtEur } from "@/lib/format";

export function EinrichtungDetail() {
  const { glz = "" } = useParams();
  const { data, error } = useData();
  const [mode, setMode] = useState<TimelineMode>({});

  const view = useMemo(() => {
    if (!data) return null;
    const info = einrichtungInfo(data, glz);
    if (!info) return { info: null } as const;
    const y = latestYear(data.budget);
    const laufend = einrichtungSeries(data, glz, "A", "verwaltung");
    const invest = einrichtungSeries(data, glz, "A", "vermoegen");
    const einnahmen = einrichtungSeries(data, glz, "E", "verwaltung");
    const hasInvest = invest.ansatz.some((v) => v) || invest.ergebnis.some((v) => v);
    const hasEinnahmen = einnahmen.ansatz.some((v) => v) || einnahmen.ergebnis.some((v) => v);
    const posten = einrichtungPosten(data, glz);

    // latest Ansatz per Posten for the list
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
    return { info, laufend, invest, einnahmen, hasInvest, hasEinnahmen, posten, latest, y, hasContext, aus, ein, deckung };
  }, [data, glz]);

  usePageTitle(view && view.info ? view.info.label : undefined);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;
  if (!view.info)
    return (
      <p className="text-ink-muted">
        Unbekannte Einrichtung. <Link className="text-red-600 underline" to="/erkunden">Zur Übersicht</Link>
      </p>
    );

  const { info, laufend, invest, einnahmen, hasInvest, hasEinnahmen, posten, latest, y, hasContext, aus, ein, deckung } = view;
  const ausgabenPosten = posten.filter((p) => p.ea === "A");
  const einnahmenPosten = posten.filter((p) => p.ea === "E");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted flex flex-wrap items-center gap-1.5">
        <Link to={`/einzelplan/${info.glz[0]}`} className="hover:text-ink underline-offset-2 hover:underline">{info.crumb.aufgabenbereich}</Link>
        <span aria-hidden>›</span>
        <span className="text-ink-soft">{info.crumb.bereich}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{info.label}</h1>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>Gliederung {info.glz}</Chip>
          <ThemaPlatzhalter />
        </div>
      </header>

      {hasEinnahmen && deckung != null && (
        <div className="flex flex-wrap gap-x-10 gap-y-3 border-y border-ink-line py-4">
          <div>
            <div className="eyebrow text-ink-muted">Ausgaben {y}</div>
            <div className="font-display text-xl font-bold tabular-nums">{fmtEur(aus)}</div>
          </div>
          <div>
            <div className="eyebrow text-ink-muted">Eigene Einnahmen</div>
            <div className="font-display text-xl font-bold tabular-nums">{fmtEur(ein)}</div>
          </div>
          <div>
            <div className="eyebrow text-ink-muted">Zuschussbedarf</div>
            <div className="font-display text-xl font-bold tabular-nums text-red-600">{fmtEur(aus - ein)}</div>
          </div>
          <div>
            <div className="eyebrow text-ink-muted">Kostendeckung</div>
            <div className="font-display text-xl font-bold tabular-nums">{Math.round(deckung * 100)} %</div>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-xl font-bold">Laufende Ausgaben über die Jahre</h2>
          <span className="text-xs text-ink-muted">Verwaltungshaushalt; Plan gegen Ergebnis. Für {y} nur der Plan.</span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={hasContext} hasInvest={hasInvest} hasEinnahmen={hasEinnahmen} />
        <Timeline laufend={laufend} invest={invest} einnahmen={einnahmen} mode={mode} context={data!.context} baseYear={y} height={300} />
        {hasEinnahmen && (
          <p className="text-xs text-ink-muted">
            „Bilanziert" zieht die eigenen Einnahmen (Gebühren, Mieten, Entgelte) ab — es bleibt der
            Betrag, den der allgemeine Haushalt trägt. Die graue Linie zeigt weiter die Bruttoausgaben.
          </p>
        )}
        {hasInvest && (
          <p className="text-xs text-ink-muted">
            Investitionen (Vermögenshaushalt) sind von Jahr zu Jahr unregelmäßig und nur als Balken
            eingeblendet, wenn aktiviert — sie taugen nicht als Trend.
          </p>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <PostenList title={`Ausgaben-Posten ${y}`} posten={ausgabenPosten} latest={latest} />
        {einnahmenPosten.length > 0 && (
          <PostenList title={`Einnahme-Posten ${y}`} posten={einnahmenPosten} latest={latest} />
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
  posten: { hhst_id: string; grz_text: string | null; grz: string }[];
  latest: Map<string, number>;
}) {
  const rows = posten
    .map((p) => ({ p, v: latest.get(p.hhst_id) ?? 0 }))
    .sort((a, b) => b.v - a.v);
  return (
    <div className="rounded-lg border border-ink-line bg-white p-4">
      <h2 className="font-display text-lg font-bold mb-2">{title}</h2>
      <ol className="space-y-1.5 text-sm">
        {rows.map(({ p, v }) => (
          <li key={p.hhst_id} className="border-b border-ink-line/60 pb-1.5">
            <Link to={`/posten/${p.hhst_id}`} className="flex justify-between gap-3 hover:text-red-600 transition-colors">
              <span className="text-ink-soft">{p.grz_text ?? p.grz}</span>
              <span className="tabular-nums shrink-0 font-medium">{fmtEur(v)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
