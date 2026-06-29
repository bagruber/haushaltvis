import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useData, einzelplanName, einzelplanSections, latestYear, type Haushalt } from "@/lib/data";
import { EINZELPLAN_COLORS } from "@/lib/colors";
import { fmtEur, fmtEurShort } from "@/lib/format";

type HaushaltFilter = "alle" | Haushalt;

export function EinzelplanDetail() {
  const { ep = "" } = useParams();
  const { data, error } = useData();
  const [hh, setHh] = useState<HaushaltFilter>("alle");

  const view = useMemo(() => {
    if (!data) return null;
    const y = latestYear(data.budget);
    const sections = einzelplanSections(data, ep, y, hh === "alle" ? undefined : hh);
    const total = sections.reduce((s, x) => s + x.total, 0);
    return {
      y,
      sections,
      total,
      name: einzelplanName(data, ep),
      intro: data.einleitungen[`ep:${ep}`],
      themes: data.themes.themes,
    };
  }, [data, ep, hh]);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <p className="text-ink-muted">Lade Daten …</p>;
  if (!/^[0-9]$/.test(ep))
    return <p className="text-ink-muted">Unbekannter Einzelplan. <Link className="text-red-600 underline" to="/erkunden">Zur Übersicht</Link></p>;

  const color = EINZELPLAN_COLORS[ep] ?? "#999";

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted">
        <Link to="/erkunden" className="hover:text-ink">Haushalt erkunden</Link> ›{" "}
        <span className="text-ink">Einzelplan {ep}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="inline-block h-6 w-6 rounded" style={{ background: color }} />
          <h1 className="font-display text-3xl font-bold">{ep} · {view.name}</h1>
        </div>
        {view.intro && <p className="max-w-3xl text-ink-soft">{view.intro}</p>}
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5">
          {([["alle", "Gesamt"], ["verwaltung", "Laufender Betrieb"], ["vermoegen", "Investitionen"]] as [HaushaltFilter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setHh(k)} className={"px-3 py-1 rounded-md transition-colors " + (hh === k ? "bg-red-600 text-cream" : "text-ink-soft hover:text-ink")}>{l}</button>
          ))}
        </div>
        <span className="rounded-md bg-white border border-ink-line px-3 py-1.5">Ausgaben {view.y}: <b>{fmtEurShort(view.total)}</b></span>
      </div>

      <div className="space-y-4">
        {view.sections.map((s) => (
          <section key={s.code} className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
            <div className="flex items-baseline justify-between gap-3 mb-2 border-b border-ink-line pb-1.5">
              <h2 className="font-display text-lg font-bold">{s.label}</h2>
              <span className="tabular-nums text-ink-soft">{fmtEur(s.total)}</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {s.einrichtungen.map((e) => (
                <li key={e.glz} className="border-b border-ink-line/50 pb-1.5 last:border-0">
                  <Link to={`/einrichtung/${e.glz}`} className="flex items-center justify-between gap-3 hover:text-red-600 transition-colors">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{e.label}</span>
                      <span className="flex gap-1 shrink-0">
                        {e.themes.map((t) => (
                          <span key={t} title={view.themes[t]?.label} className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: view.themes[t]?.color ?? "#ccc" }} />
                        ))}
                      </span>
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
