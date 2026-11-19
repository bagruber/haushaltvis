import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useData, postenSeries, postenCrumb, eventsFor, latestYear, lebenslauf, nurPlanSatz } from "@/lib/data";
import { usePageTitle } from "@/lib/title";
import { CaretRight } from "@phosphor-icons/react";
import { Chip, Loading, Teilen, ThemaPlatzhalter } from "@/components/ui";
import { Timeline, TimelineControls } from "@/components/Timeline";
import { useAnsicht } from "@/lib/teilen";
import { fmtDatum } from "@/lib/format";

export function PostenDetail() {
  const { id = "" } = useParams();
  const { data, error } = useData();
  const [mode, setMode] = useAnsicht();

  const view = useMemo(() => {
    if (!data) return null;
    const p = data.budget.posten[id];
    if (!p) return { p: null } as const;
    const baseYear = latestYear(data.budget);
    const series = postenSeries(data, id);
    const crumb = postenCrumb(data, p);
    const tags = data.themes.assignment[id] ?? [];
    const events = eventsFor(data, "hhst", id);
    const hasContext = !!(data.context.cpi || data.context.population);
    // Seit wann es die Stelle gibt und ob noch: Ein Entwurf ist noch nicht
    // beschlossen, das sagt der Text dann mit.
    const entwurf = data.budget.meta.entwurf?.jahr;
    const lauf = lebenslauf(data, id);
    const imEntwurf = (j: number) => (j === entwurf ? ` im Entwurf ${j}` : ` ab ${j}`);
    const lebenszeichen = [
      lauf.neuAb != null && `neu${imEntwurf(lauf.neuAb)}`,
      lauf.wiederAb != null && `wieder${imEntwurf(lauf.wiederAb)}`,
      lauf.wegSeit != null &&
        (lauf.wegSeit === entwurf ? `im Entwurf ${lauf.wegSeit} nicht mehr vorhanden` : `nicht mehr vorhanden seit ${lauf.wegSeit}`),
    ].filter((x): x is string => !!x);
    const erl = data.erlaeuterungen;
    const erlaeuterung = erl?.stellen[id]?.text ? { text: erl.stellen[id].text!, jahr: erl.jahr, stand: erl.stand } : null;
    return { p, series, crumb, tags, events, hasContext, baseYear, lebenszeichen, erlaeuterung };
  }, [data, id]);

  usePageTitle(view && view.p ? view.p.grz_text ?? view.p.hhst_id : undefined);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view) return <Loading />;
  if (!view.p)
    return (
      <p className="text-ink-muted">
        Unbekannter Posten. <Link className="text-red-600 underline" to="/erkunden">Zur Übersicht</Link>
      </p>
    );

  const { p, series, crumb, events, hasContext, baseYear, lebenszeichen, erlaeuterung } = view;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-ink-muted flex flex-wrap items-center gap-1.5">
        <Link to={`/einzelplan/${p.einzelplan}`} className="hover:text-ink underline-offset-2 hover:underline">{crumb.aufgabenbereich}</Link>
        <CaretRight size={12} aria-hidden />
        <span>{crumb.bereich}</span>
        <CaretRight size={12} aria-hidden />
        <Link to={`/einrichtung/${p.glz}`} className="text-ink-soft hover:text-ink underline-offset-2 hover:underline">{crumb.einrichtung}</Link>
      </nav>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">{p.grz_text}</h1>
        {p.kontotext && <p className="text-ink-soft">{p.kontotext}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Chip>{p.ea === "E" ? "Einnahme" : "Ausgabe"}</Chip>
          <Chip>{p.haushalt === "verwaltung" ? "Verwaltungshaushalt" : "Vermögenshaushalt"}</Chip>
          <Chip>Haushaltsstelle {p.glz}.{p.grz}</Chip>
          {lebenszeichen.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
          <ThemaPlatzhalter />
          <Teilen className="ml-auto" />
        </div>
      </header>

      {erlaeuterung && (
        // Wörtlich aus dem Arbeitsplan; die Quelle steht dabei, damit niemand
        // den Satz für eine Erklärung dieser Seite hält.
        <section className="max-w-3xl rounded-lg border border-ink-line bg-white px-5 py-4">
          {/* Nicht „zum Ansatz 2027“: Manche Texte sind aus dem Vorjahr
              stehen geblieben, ihre Beträge passen dann zum alten Ansatz. */}
          <h2 className="text-sm font-semibold">Erläuterung der Kämmerei</h2>
          <p className="text-xs text-ink-muted">
            aus dem Arbeitsplan {erlaeuterung.jahr}, Stand {fmtDatum(erlaeuterung.stand)}, noch nicht beschlossen
          </p>
          {erlaeuterung.text.map((t) => (
            <p key={t} className="mt-2 whitespace-pre-line text-ink-soft">{t}</p>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-line pb-2">
          <h2 className="font-display text-xl font-bold">Entwicklung über die Jahre</h2>
          <span className="text-xs text-ink-muted">Plan (Ansatz) gegen Ergebnis (Ist). {nurPlanSatz(data!.budget)}</span>
        </div>
        <TimelineControls mode={mode} setMode={setMode} hasContext={hasContext} />
        <Timeline laufend={series} mode={mode} context={data!.context} baseYear={baseYear} height={320} art={p.ea} />
      </section>

      {events.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold mb-2 border-b border-ink-line pb-2">Ereignisse</h2>
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-semibold tabular-nums text-red-600 shrink-0">{e.year}</span>
                <span>
                  <b>{e.title}</b>
                  {e.text && <span className="text-ink-soft">: {e.text}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
