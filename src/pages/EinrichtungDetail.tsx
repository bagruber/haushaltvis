import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Timeline, TimelineControls, type TimelineMode } from "@/components/Timeline";
import { Chip } from "@/components/ui";
import {
  useData,
  einrichtungInfo,
  einrichtungPosten,
  einrichtungSeries,
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
    const hasInvest = invest.ansatz.some((v) => v) || invest.ergebnis.some((v) => v);
    const posten = einrichtungPosten(data, glz);

    // latest Ansatz per Posten for the list
    const latest = new Map<string, number>();
    for (const f of data.budget.facts) {
      if (f.year === y && f.ansatz != null) latest.set(f.hhst_id, f.ansatz);
    }

    const hasContext = !!(data.context.cpi || data.context.population);
    return { info, laufend, invest, hasInvest, posten, latest, y, hasContext };
  }, [data, glz, mode]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;
  if (!view.info)
    return (
      <p className="text-ink-muted">
        Unbekannte Einrichtung. <Link className="text-red-600 underline" to="/themen">Zur Übersicht</Link>
      </p>
    );

  const { info, laufend, invest, hasInvest, posten, latest, y, hasContext } = view;
  const ausgabenPosten = posten.filter((p) => p.ea === "A");
  const einnahmenPosten = posten.filter((p) => p.ea === "E");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted flex flex-wrap items-center gap-1.5">
        <Link to={`/einzelplan/${info.glz[0]}`} className="hover:text-ink underline-offset-2 hover:underline">{info.crumb.aufgabenbereich}</Link>
        <span>›</span>
        <span className="text-ink-soft">{info.crumb.bereich}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{info.label}</h1>
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip>Gliederung {info.glz}</Chip>
          {info.themes.map((t) => (
            <Link key={t.theme} to={`/themen/${t.theme}`}>
              <span className="rounded-md px-2.5 py-1 text-xs text-white" style={{ background: data!.themes.themes[t.theme]?.color ?? "#999" }}>
                {data!.themes.themes[t.theme]?.label ?? t.theme}
              </span>
            </Link>
          ))}
        </div>
      </header>

      <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="font-display text-lg font-bold">Laufende Ausgaben über die Jahre</h2>
          <span className="text-xs text-ink-muted">Verwaltungshaushalt; Plan gegen Ergebnis. Wert {y} vorläufig.</span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={hasContext} hasInvest={hasInvest} />
        <Timeline laufend={laufend} invest={invest} mode={mode} context={data!.context} baseYear={y} height={300} />
        {hasInvest && (
          <p className="text-xs text-ink-muted mt-1">
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
    <div className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
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
