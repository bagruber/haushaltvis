import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useData,
  gesamtliste,
  latestYear,
  type GesamtKnoten,
  type GesamtSpalte,
  type GesamtZeile,
  type SpaltenKey,
} from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { useTeilScroll } from "@/lib/teilen";
import { AbschnittLink, Kennzahl, Loading, SegmentedToggle, SeitenKopf } from "@/components/ui";
import { INVEST_COLOR } from "@/components/Timeline";
import { EINZELPLAN_COLORS, kategorieTon } from "@/lib/marke.mjs";
import { fmtEur, fmtEurShort } from "@/lib/format";

type HaushaltFilter = "beide" | "verwaltung" | "vermoegen";
type ArtFilter = "beide" | "E" | "A";

/** Nur Zeichen vergleichen, die jemand auch eintippt. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function Gesamtliste() {
  usePageTitle("Der ganze Haushalt, Stelle für Stelle");
  const { teil } = useParams();
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();
  const [haushalt, setHaushalt] = useState<HaushaltFilter>("beide");
  const [artFilter, setArt] = useState<ArtFilter>("beide");
  const [suche, setSuche] = useState("");
  const [leere, setLeere] = useState(false);
  const [stichtag, setStichtag] = useState(false);

  const view = useMemo(() => {
    if (!data) return null;
    const jahr = selYear ?? latestYear(data.budget);
    const liste = gesamtliste(data, jahr);
    const vorjahr = data.budget.meta.years.includes(jahr - 1) ? jahr - 1 : null;
    const spalten: GesamtSpalte[] = [{ key: "ansatz", kopf: `Ansatz ${jahr}` }];
    if (vorjahr != null) {
      spalten.push({ key: "ansatzVor", kopf: `Ansatz ${vorjahr}` });
      spalten.push({ key: "ergebnisVor", kopf: `Ergebnis ${vorjahr}` });
    }
    if (stichtag && liste.zwischenstand) {
      spalten.push({ key: "gebucht", kopf: "gebucht bis 30.09." });
      spalten.push({ key: "bezahlt", kopf: "bezahlt bis 30.09." });
    }
    return { jahr, liste, spalten };
  }, [data, selYear, stichtag]);

  // Filtern erst nach dem Baum: der Baum haengt nur am Jahr, die Filter am Tippen.
  const gefiltert = useMemo(() => {
    if (!view) return null;
    const q = norm(suche.trim());
    const passt = (z: GesamtZeile) => {
      if (haushalt !== "beide" && z.haushalt !== haushalt) return false;
      if (artFilter !== "beide" && z.ea !== artFilter) return false;
      if (!leere && !view.spalten.some((s) => z.werte[s.key])) return false;
      if (q && !norm(z.name).includes(q) && !z.hhst.includes(q) && !norm(z.kontotext ?? "").includes(q)) return false;
      return true;
    };
    const sichtbar: GesamtZeile[] = [];
    const baum = view.liste.einzelplaene
      .map((plan) => ({
        ...plan,
        kinder: plan.kinder
          .map((bereich) => ({
            ...bereich,
            kinder: bereich.kinder
              .map((e) => ({ ...e, zeilen: e.zeilen.filter(passt) }))
              .filter((e) => e.zeilen.length),
          }))
          .filter((b) => b.kinder.length),
      }))
      .filter((p) => p.kinder.length);
    for (const plan of baum) for (const b of plan.kinder) for (const e of b.kinder) sichtbar.push(...e.zeilen);
    // Ein gemeinsamer Maßstab für die ganze Seite: so zeigen die Balken, wo das
    // große Geld liegt, statt in jeder Einrichtung von vorne zu beginnen.
    const groesste = sichtbar.reduce((m, z) => Math.max(m, Math.abs(z.werte.ansatz ?? 0)), 0);
    return { baum, sichtbar, groesste };
  }, [view, haushalt, artFilter, suche, leere]);

  useTeilScroll(teil, !!gefiltert);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view || !gefiltert) return <Loading />;

  const { liste, spalten, jahr } = view;
  const breiteSpalten = `minmax(0,1fr) repeat(${spalten.length}, minmax(5.5rem, 8rem))`;

  return (
    <div className="space-y-6">
      <SeitenKopf titel="Der ganze Haushalt, Stelle für Stelle" script="alles">
        <p>
          Jede Haushaltsstelle in ihrer Nummernfolge, wie im amtlichen Plan: Einzelplan, Bereich,
          Einrichtung, dann die einzelnen Posten. Interne Verrechnungen stehen mit darin, sonst
          stimmen die Summen nicht.
        </p>
      </SeitenKopf>

      <section className="grid gap-x-8 gap-y-6 border-y border-ink-line py-6 sm:grid-cols-2 lg:grid-cols-4">
        <Kennzahl wert={fmtEurShort(liste.summen.verwaltung.einnahmen)} label={`Einnahmen ${jahr}, Verwaltungshaushalt`} className="text-2xl" />
        <Kennzahl wert={fmtEurShort(liste.summen.verwaltung.ausgaben)} label={`Ausgaben ${jahr}, Verwaltungshaushalt`} className="text-2xl" />
        <Kennzahl wert={fmtEurShort(liste.summen.vermoegen.einnahmen)} label={`Einnahmen ${jahr}, Vermögenshaushalt`} className="text-2xl" />
        <Kennzahl wert={fmtEurShort(liste.summen.vermoegen.ausgaben)} label={`Ausgaben ${jahr}, Vermögenshaushalt`} className="text-2xl" />
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <SegmentedToggle
          label="Haushalt"
          value={haushalt}
          onChange={setHaushalt}
          options={[["beide", "beide Haushalte"], ["verwaltung", "Verwaltung"], ["vermoegen", "Vermögen"]]}
        />
        <SegmentedToggle
          label="Einnahmen oder Ausgaben"
          value={artFilter}
          onChange={setArt}
          options={[["beide", "beides"], ["E", "Einnahmen"], ["A", "Ausgaben"]]}
        />
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="in der Liste filtern"
          aria-label="Liste nach Name oder Nummer filtern"
          className="h-9 w-48 rounded-lg border border-ink-line bg-white px-3 text-[13px] placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={leere} onChange={(e) => setLeere(e.target.checked)} />
          auch leere Stellen
        </label>
        {liste.zwischenstand && (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={stichtag} onChange={(e) => setStichtag(e.target.checked)} />
            Stand 01. Oktober zeigen
          </label>
        )}
        <span className="text-ink-muted">{gefiltert.sichtbar.length.toLocaleString("de-DE")} Stellen</span>
      </div>

      <nav aria-label="Zu einem Einzelplan springen" className="flex flex-wrap items-center gap-1 text-xs">
        <span className="text-ink-muted">Springen</span>
        {liste.einzelplaene.map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            className="rounded-md border border-ink-line bg-white px-2 py-1 tabular-nums hover:border-ink-soft"
            title={p.name}
          >
            {p.id}
          </a>
        ))}
      </nav>

      {/* Kopfzeile der Spalten, klebt unter der Jahresleiste. */}
      <div
        className="sticky top-[calc(var(--kopf-hoehe)+2.6rem)] z-[5] hidden gap-3 border-b border-ink-line bg-cream py-1 text-xs text-ink-muted sm:grid"
        style={{ gridTemplateColumns: breiteSpalten }}
      >
        <span>Haushaltsstelle</span>
        {spalten.map((s) => (
          <span key={s.key} className="text-right">{s.kopf}</span>
        ))}
      </div>

      {gefiltert.baum.map((plan) => (
        <section key={plan.id} id={plan.id} className="scroll-mt-28 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
          <KnotenKopf knoten={plan} art="Einzelplan" pfad={`/gesamtliste/${plan.id}`} farbe={EINZELPLAN_COLORS[plan.id]} gross />
          {plan.kinder.map((bereich) => (
            <div key={bereich.id} id={bereich.id} className="scroll-mt-28">
              <KnotenKopf knoten={bereich} art="Bereich" pfad={`/gesamtliste/${bereich.id}`} />
              {bereich.kinder.map((einrichtung) => (
                <div key={einrichtung.id} id={einrichtung.id} className="scroll-mt-28">
                  <KnotenKopf
                    knoten={einrichtung}
                    art="Einrichtung"
                    pfad={`/gesamtliste/${einrichtung.id}`}
                    ziel={`/einrichtung/${einrichtung.id}`}
                  />
                  <Zeilen
                    zeilen={einrichtung.zeilen}
                    spalten={spalten}
                    spaltenBreite={breiteSpalten}
                    groesste={gefiltert.groesste}
                    farbe={EINZELPLAN_COLORS[plan.id] ?? "#8a8170"}
                  />
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}

      {!gefiltert.sichtbar.length && (
        <p className="text-ink-muted">Kein Treffer. Andere Filter oder ein kürzeres Wort probieren.</p>
      )}
    </div>
  );
}

/** Kopfzeile einer Ebene: Nummer, Name, und was sie zusammen ausmacht. */
function KnotenKopf({ knoten, art, pfad, ziel, farbe, gross }: {
  knoten: GesamtKnoten;
  art: string;
  pfad: string;
  ziel?: string;
  farbe?: string;
  gross?: boolean;
}) {
  const name = (
    <>
      <span className="shrink-0 tabular-nums text-ink-muted">{knoten.nummer}</span>
      <span className={gross ? "font-bold" : "font-semibold"}>{knoten.name}</span>
    </>
  );
  return (
    <div
      className={
        gross
          ? "mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b-2 pb-1 font-display text-xl"
          : "mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ink-line pb-1 font-display"
      }
      style={gross && farbe ? { borderColor: kategorieTon(farbe).text } : undefined}
    >
      {/* Die oberste Ebene nennt sich beim Namen; darunter sagt das
          Nummerngerüst (00xx, 0000) die Ebene schon. */}
      <span className={gross ? "" : "sr-only"}>{art} </span>
      {ziel ? (
        <Link to={ziel} className="flex items-baseline gap-2 hover:text-red-600">{name}</Link>
      ) : (
        <span className="flex items-baseline gap-2">{name}</span>
      )}
      <AbschnittLink pfad={pfad} titel={`${art} ${knoten.nummer} · ${knoten.name}`} />
      <span className="ml-auto flex flex-wrap gap-x-4 font-sans text-xs text-ink-soft tabular-nums">
        {knoten.einnahmen > 0 && <span>Einnahmen {fmtEurShort(knoten.einnahmen)}</span>}
        {knoten.ausgaben > 0 && <span>Ausgaben {fmtEurShort(knoten.ausgaben)}</span>}
        {knoten.investitionen > 0 && <span>Investitionen {fmtEurShort(knoten.investitionen)}</span>}
      </span>
    </div>
  );
}

/** Die Posten einer Einrichtung, mit Zwischenzeile bei jedem Gruppenwechsel. */
function Zeilen({ zeilen, spalten, spaltenBreite, groesste, farbe }: {
  zeilen: GesamtZeile[];
  spalten: GesamtSpalte[];
  spaltenBreite: string;
  groesste: number;
  farbe: string;
}) {
  const ton = kategorieTon(farbe);
  return (
    <ul className="text-sm">
      {zeilen.map((z, i) => {
        const neueGruppe = i === 0 || zeilen[i - 1].gruppe !== z.gruppe;
        const betrag = z.werte.ansatz ?? 0;
        // Der Balken zeigt das Große; die kleinen Beträge verschwinden bewusst,
        // ihre Zahl steht ja daneben.
        const anteil = groesste ? Math.min(1, Math.abs(betrag) / groesste) : 0;
        return (
          <li key={z.hhst}>
            {neueGruppe && (
              <div className="mt-2 border-b border-dotted border-ink-line pb-0.5 text-xs text-ink-muted">
                {z.gruppe}
              </div>
            )}
            <Link
              to={`/posten/${z.hhst}`}
              aria-label={[
                `${z.name}, Haushaltsstelle ${z.hhst}`,
                ...spalten.map((s) => `${s.kopf}: ${z.werte[s.key] == null ? "keine Angabe" : fmtEur(z.werte[s.key]!)}`),
              ].join(", ")}
              className={
                "relative grid items-baseline gap-x-3 gap-y-0.5 border-b border-ink-line/40 py-1 hover:bg-cream-dark/60 " +
                (z.intern ? "text-ink-muted" : "")
              }
              style={{ gridTemplateColumns: spaltenBreite }}
            >
              <span className="col-span-full min-w-0 sm:col-span-1">
                <span className="mr-2 shrink-0 text-xs text-ink-muted tabular-nums">{z.hhst}</span>
                {z.name}
                {z.intern && <span className="ml-2 text-xs">intern</span>}
                {z.kontotext && <span className="block truncate text-xs text-ink-muted">{z.kontotext}</span>}
              </span>
              {spalten.map((s) => (
                <span key={s.key} className="relative hidden text-right tabular-nums sm:block">
                  {z.werte[s.key] == null ? "" : fmtEur(z.werte[s.key]!)}
                  {/* Der Datenbalken steht unter seiner Zahl: ein Maßstab für die
                      ganze Seite, damit beim Scrollen das Große ins Auge springt.
                      Investitionen sind ocker, wie ihre Balken in der Timeline. */}
                  {s.key === "ansatz" && anteil > 0 && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -bottom-[3px] right-0 h-[3px] rounded-l-sm"
                      style={{
                        width: `${Math.max(2, anteil * 100)}%`,
                        background: z.haushalt === "vermoegen" ? INVEST_COLOR : ton.text,
                      }}
                    />
                  )}
                </span>
              ))}
              {/* Unter 640 px steht die Stelle zweizeilig: Name, darunter die Beträge. */}
              <span className="col-span-full flex flex-wrap gap-x-3 text-xs text-ink-soft tabular-nums sm:hidden">
                {spalten.map((s) => (
                  <span key={s.key}>
                    {s.kopf}: {z.werte[s.key] == null ? "–" : fmtEur(z.werte[s.key]!)}
                  </span>
                ))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export type { SpaltenKey };
