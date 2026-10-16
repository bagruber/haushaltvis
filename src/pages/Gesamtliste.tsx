import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useData,
  gesamtliste,
  gesamtlisteZeilen,
  latestYear,
  type GesamtKnoten,
  type GesamtSpalte,
  type GesamtWerte,
  type GesamtZeile,
  type SpaltenKey,
} from "@/lib/data";
import { useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { useTeilScroll } from "@/lib/teilen";
import { AbschnittLink, Kennzahl, Loading, SegmentedToggle, SeitenKopf } from "@/components/ui";
import { INVEST_COLOR } from "@/components/Timeline";
import { EINZELPLAN_COLORS, kategorieTon } from "@/lib/marke.mjs";
import { cn } from "@/lib/cn";
import { fmtEur, fmtEurShort } from "@/lib/format";

type HaushaltFilter = "beide" | "verwaltung" | "vermoegen";
type ArtFilter = "beide" | "E" | "A";

/** Nur Zeichen vergleichen, die jemand auch eintippt. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const UNTERTITEL: Record<string, string> = {
  verwaltung: "Der laufende Betrieb: Personal, Unterhalt, Zuschüsse, dazu Steuern, Gebühren und Zuweisungen.",
  vermoegen: "Investitionen und wie sie bezahlt werden: Bau, Grunderwerb, Anschaffungen, Förderung, Kredite.",
};

/**
 * Die hervorgehobene Spalte: das Planjahr, im amtlichen Plan grau hinterlegt.
 * Hier im Ton der Creme-Flächen, damit das Band die Zahlen trägt, statt sie zu
 * übertönen.
 */
const MARKIERT = "bg-cream-dark px-2";

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
  // Die Bedienelemente folgen sofort, die Liste rechnet im Hintergrund nach:
  // React baut sie mit den zurückgestellten Werten und bricht ab, wenn schon
  // die nächste Taste kommt. Solange sie hinterherhinkt, ist sie ausgegraut.
  const dHaushalt = useDeferredValue(haushalt);
  const dArt = useDeferredValue(artFilter);
  const dSuche = useDeferredValue(suche);
  const dLeere = useDeferredValue(leere);
  const dStichtag = useDeferredValue(stichtag);
  const veraltet =
    dHaushalt !== haushalt || dArt !== artFilter || dSuche !== suche || dLeere !== leere || dStichtag !== stichtag;

  const view = useMemo(() => {
    if (!data) return null;
    const jahr = selYear ?? latestYear(data.budget);
    const liste = gesamtliste(data, jahr);
    const vorjahr = data.budget.meta.years.includes(jahr - 1) ? jahr - 1 : null;
    const stand = (j: number) => dStichtag && liste.zwischenstand.some((z) => z.jahr === j);
    // Von links nach rechts in der Zeit wie im amtlichen Plan: Ergebnis des
    // Vorjahres, Plan des Stichjahrs (hervorgehoben), Plan des Folgejahres. Der
    // Stand zum 01.10. steht, wenn gewählt, gleich hinter der Zahl seines Jahres.
    const spalten: GesamtSpalte[] = [];
    if (vorjahr != null) {
      spalten.push({ key: "ergebnisVor", kopf: `Ergebnis ${vorjahr}` });
      if (stand(vorjahr)) {
        spalten.push({ key: "gebuchtVor", kopf: `gebucht bis 30.09.${vorjahr}` });
        spalten.push({ key: "bezahltVor", kopf: `bezahlt bis 30.09.${vorjahr}` });
      }
    }
    spalten.push({ key: "ansatz", kopf: `Ansatz ${jahr}`, markiert: true });
    if (stand(jahr)) {
      spalten.push({ key: "gebucht", kopf: `gebucht bis 30.09.${jahr}` });
      spalten.push({ key: "bezahlt", kopf: `bezahlt bis 30.09.${jahr}` });
    }
    const nachLeer = !gesamtlisteZeilen(liste).some((z) => z.werte.ansatzNach != null);
    spalten.push({ key: "ansatzNach", kopf: `Ansatz ${jahr + 1}`, leer: nachLeer });
    return { jahr, liste, spalten };
  }, [data, selYear, dStichtag]);

  // Filtern erst nach dem Baum: der Baum haengt nur am Jahr, die Filter am Tippen.
  const gefiltert = useMemo(() => {
    if (!view) return null;
    const q = norm(dSuche.trim());
    const passt = (z: GesamtZeile) => {
      if (dArt !== "beide" && z.ea !== dArt) return false;
      if (!dLeere && !view.spalten.some((s) => z.werte[s.key])) return false;
      if (q && !norm(z.name).includes(q) && !z.hhst.includes(q) && !norm(z.kontotext ?? "").includes(q)) return false;
      return true;
    };
    const sichtbar: GesamtZeile[] = [];
    const baum = view.liste.haushalte
      .filter((h) => dHaushalt === "beide" || h.haushalt === dHaushalt)
      .map((h) => ({
        ...h,
        einzelplaene: h.einzelplaene
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
          .filter((p) => p.kinder.length),
      }))
      .filter((h) => h.einzelplaene.length);
    for (const h of baum) for (const plan of h.einzelplaene) for (const b of plan.kinder) for (const e of b.kinder) sichtbar.push(...e.zeilen);
    // Ein gemeinsamer Maßstab für die ganze Seite: so zeigen die Balken, wo das
    // große Geld liegt, statt in jeder Einrichtung von vorne zu beginnen.
    const groesste = sichtbar.reduce((m, z) => Math.max(m, Math.abs(z.werte.ansatz ?? 0)), 0);
    return { baum, sichtbar, groesste };
  }, [view, dHaushalt, dArt, dSuche, dLeere]);

  useTeilScroll(teil, !!gefiltert);

  if (error) return <p className="text-red-600">Daten konnten nicht geladen werden.</p>;
  if (!view || !gefiltert) return <Loading />;

  const { liste, spalten, jahr } = view;
  // Die Stichtagsspalten und die leere Folgejahr-Spalte sind schmaler als die
  // Jahreszahlen, sonst bleibt der Bezeichnung bei sieben Spalten kaum Platz.
  const breite = (s: GesamtSpalte) =>
    s.leer ? "minmax(4.5rem, 5.5rem)" : /^(gebucht|bezahlt)/.test(s.key) ? "minmax(5rem, 6.5rem)" : "minmax(5.5rem, 8rem)";
  const breiteSpalten = `minmax(0,1fr) ${spalten.map(breite).join(" ")}`;
  // Gefiltert nach Text, wären Summen nur Teilsummen. Dann lieber keine.
  const summenZeigen = !dSuche.trim();

  return (
    <div className="space-y-6">
      <SeitenKopf titel="Der ganze Haushalt, Stelle für Stelle" script="alles">
        <p>
          Jede Haushaltsstelle in der Ordnung des amtlichen Plans: erst der Verwaltungs-, dann der
          Vermögenshaushalt, darin nach Nummern, je Einrichtung erst die Einnahmen, dann die
          Ausgaben. Interne Verrechnungen stehen mit darin, sonst stimmen die Summen nicht.
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
        {liste.zwischenstand.length > 0 && (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={stichtag} onChange={(e) => setStichtag(e.target.checked)} />
            Stand 01. Oktober zeigen ({liste.zwischenstand.map((z) => z.jahr).join(" und ")})
          </label>
        )}
        <span className="text-ink-muted">{gefiltert.sichtbar.length.toLocaleString("de-DE")} Stellen</span>
      </div>

      <nav aria-label="Zu einem Einzelplan springen" className="space-y-1 text-xs">
        {liste.haushalte
          .filter((h) => dHaushalt === "beide" || h.haushalt === dHaushalt)
          .map((h) => (
            <div key={h.haushalt} className="flex flex-wrap items-center gap-1">
              <a href={`#${h.haushalt}`} className="mr-1 w-36 text-ink-muted hover:text-ink">{h.titel}</a>
              {h.einzelplaene.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  className="rounded-md border border-ink-line bg-white px-2 py-1 tabular-nums hover:border-ink-soft"
                  title={`${h.titel}, Einzelplan ${p.nummer} · ${p.name}`}
                >
                  {p.nummer}
                </a>
              ))}
            </div>
          ))}
      </nav>

      {/* Kopfzeile der Spalten, klebt unter der Jahresleiste. */}
      <div
        className="sticky top-[calc(var(--kopf-hoehe)+2.6rem)] z-[5] hidden gap-x-3 border-b border-ink-line bg-cream text-xs text-ink-muted sm:grid"
        style={{ gridTemplateColumns: breiteSpalten }}
      >
        <span className="py-1">Haushaltsstelle</span>
        {spalten.map((s) => (
          <span key={s.key} className={cn("py-1 text-right", s.markiert && cn(MARKIERT, "font-semibold text-ink"))}>
            {s.kopf}
            {s.leer && <span className="block text-[11px]">noch keine Zahlen</span>}
          </span>
        ))}
      </div>

      <div className={cn("transition-opacity", veraltet && "opacity-50")} aria-busy={veraltet}>
      {gefiltert.baum.map((h) => (
        <section key={h.haushalt} id={h.haushalt} className="scroll-mt-[calc(var(--kopf-hoehe)+6.5rem)]">
          <header className="mt-10 border-b-2 border-ink pb-2">
            <h2 className="font-display text-2xl font-bold">{h.titel}</h2>
            <p className="mt-1 text-sm text-ink-soft">{UNTERTITEL[h.haushalt]}</p>
          </header>
          {h.einzelplaene.map((plan) => (
            <section key={plan.id} id={plan.id} className="scroll-mt-[calc(var(--kopf-hoehe)+6.5rem)] [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
              <KnotenKopf knoten={plan} art="Einzelplan" jahr={jahr} pfad={`/erkunden/gesamtliste/${plan.id}`} farbe={EINZELPLAN_COLORS[plan.nummer]} gross summen />
              {plan.kinder.map((bereich) => (
                <div key={bereich.id} id={bereich.id} className="scroll-mt-[calc(var(--kopf-hoehe)+6.5rem)]">
                  <Aufschub
                    sofort={teil === bereich.id || bereich.kinder.some((e) => e.id === teil)}
                    hoehe={geschaetzteHoehe(bereich)}
                  >
                  <KnotenKopf knoten={bereich} art="Bereich" jahr={jahr} pfad={`/erkunden/gesamtliste/${bereich.id}`} summen />
                  {bereich.kinder.map((einrichtung) => (
                    <div key={einrichtung.id} id={einrichtung.id} className="scroll-mt-[calc(var(--kopf-hoehe)+6.5rem)]">
                      <KnotenKopf
                        knoten={einrichtung}
                        art="Einrichtung"
                        jahr={jahr}
                        pfad={`/erkunden/gesamtliste/${einrichtung.id}`}
                        ziel={`/einrichtung/${einrichtung.nummer}`}
                      />
                      <Zeilen
                        einrichtung={einrichtung}
                        spalten={spalten}
                        spaltenBreite={breiteSpalten}
                        groesste={gefiltert.groesste}
                        farbe={EINZELPLAN_COLORS[plan.nummer] ?? "#8a8170"}
                        summen={summenZeigen}
                        abgleich={summenZeigen && dArt === "beide"}
                      />
                    </div>
                  ))}
                  </Aufschub>
                </div>
              ))}
            </section>
          ))}
        </section>
      ))}
      </div>

      {!gefiltert.sichtbar.length && (
        <p className="text-ink-muted">Kein Treffer. Andere Filter oder ein kürzeres Wort probieren.</p>
      )}
    </div>
  );
}

/**
 * Baut seinen Inhalt erst, wenn er in die Nähe des Bildschirms kommt; bis dahin
 * hält ein leerer Block in geschätzter Höhe den Platz, damit die Scrollleiste
 * schon stimmt. Einmal gebaut, bleibt er stehen. Rund 2.400 Zeilen auf einmal
 * blockierten auf einem Mittelklasse-Telefon die Seite für Sekunden; so wird
 * nur gebaut, was jemand ansieht. `sofort` für das Ziel eines Sprunglinks.
 */
function Aufschub({ sofort, hoehe, children }: { sofort: boolean; hoehe: number; children: ReactNode }) {
  const [da, setDa] = useState(sofort);
  const platz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sofort) setDa(true);
  }, [sofort]);
  useEffect(() => {
    if (da || !platz.current) return;
    // Anderthalb Bildschirme Vorlauf: beim normalen Scrollen ist der Block
    // fertig, bevor er auftaucht.
    const beobachter = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setDa(true);
          beobachter.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    beobachter.observe(platz.current);
    return () => beobachter.disconnect();
  }, [da]);
  return da ? <>{children}</> : <div ref={platz} style={{ height: hoehe }} aria-hidden />;
}

/**
 * Ungefähre Höhe eines Bereichs: Kopf, je Einrichtung Kopf und Summenzeilen,
 * je Stelle eine Zeile. Gemessen am 16.10.2026 über alle 88 Bereiche
 * (133.000 px bei 2.378 Stellen in 279 Einrichtungen); bei Desktop-Breite
 * trifft die Summe auf etwa ein Prozent.
 */
function geschaetzteHoehe(bereich: GesamtKnoten): number {
  return 70 + bereich.kinder.reduce((s, e) => s + 175 + e.zeilen.length * 33, 0);
}

/** Kopfzeile einer Ebene: Nummer, Name, und bei Einzelplan und Bereich, was sie zusammen ausmachen. */
function KnotenKopf({ knoten, art, jahr, pfad, ziel, farbe, gross, summen }: {
  knoten: GesamtKnoten;
  art: string;
  jahr: number;
  pfad: string;
  ziel?: string;
  farbe?: string;
  gross?: boolean;
  summen?: boolean;
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
      {/* Eigene Zeile unter dem Namen, nicht rechtsbündig: dort stehen die
          Spalten, und das hier ist nur der Ansatz des Stichjahrs, nach Seite
          getrennt. Einrichtungen haben stattdessen Summenzeilen in den Spalten,
          wie im amtlichen Plan. */}
      {summen && (
        <span className="flex basis-full flex-wrap gap-x-4 font-sans text-xs text-ink-soft tabular-nums">
          <span className="text-ink-muted">Ansatz {jahr}:</span>
          {knoten.einnahmen > 0 && <span>Einnahmen {fmtEurShort(knoten.einnahmen)}</span>}
          {knoten.ausgaben > 0 && <span>Ausgaben {fmtEurShort(knoten.ausgaben)}</span>}
        </span>
      )}
    </div>
  );
}

const fmtWert = (v: number | null | undefined) => (v == null ? "" : fmtEur(v));

/** Eine Zeile im Spaltenraster: Bezeichnung links, Beträge rechts, das Planjahr hinterlegt. */
function Raster({ spalten, spaltenBreite, links, werte, className, balken }: {
  spalten: GesamtSpalte[];
  spaltenBreite: string;
  links: ReactNode;
  werte?: GesamtWerte;
  className?: string;
  balken?: ReactNode;
}) {
  return (
    <div className={cn("grid items-stretch gap-x-3", className)} style={{ gridTemplateColumns: spaltenBreite }}>
      {/* Lange AKDB-Wörter („Beihilfen,Unterstützungen“) dürfen umbrechen,
          statt in die Nachbarspalte zu laufen. */}
      <span className="col-span-full min-w-0 py-1 hyphens-auto [overflow-wrap:anywhere] sm:col-span-1">{links}</span>
      {spalten.map((s) => (
        <span key={s.key} className={cn("hidden py-1 text-right tabular-nums sm:block", s.markiert && MARKIERT)}>
          <span className="relative block">
            {werte ? fmtWert(werte[s.key]) : ""}
            {s.markiert && balken}
          </span>
        </span>
      ))}
      {/* Unter 640 px steht alles zweizeilig: Bezeichnung, darunter die Beträge. */}
      {werte && (
        <span className="col-span-full flex flex-wrap gap-x-3 pb-1 text-xs text-ink-soft tabular-nums sm:hidden">
          {/* Eine leere Platzhalterspalte wäre hier in jeder Zeile ein „–". */}
          {spalten.filter((s) => !s.leer).map((s) => (
            <span key={s.key} className={s.markiert ? "font-semibold text-ink" : undefined}>
              {s.kopf}: {werte[s.key] == null ? "–" : fmtEur(werte[s.key]!)}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

/**
 * Die Posten einer Einrichtung in der Folge des amtlichen Plans: Einnahmen,
 * ihre Summe, Ausgaben, ihre Summe, dann der Abgleich.
 */
function Zeilen({ einrichtung, spalten, spaltenBreite, groesste, farbe, summen, abgleich }: {
  einrichtung: GesamtKnoten;
  spalten: GesamtSpalte[];
  spaltenBreite: string;
  groesste: number;
  farbe: string;
  summen: boolean;
  abgleich: boolean;
}) {
  const ton = kategorieTon(farbe);
  const seiten = (["E", "A"] as const)
    .map((ea) => ({ ea, zeilen: einrichtung.zeilen.filter((z) => z.ea === ea) }))
    .filter((s) => s.zeilen.length);
  const summe = einrichtung.summe;

  return (
    <div className="text-sm">
      {seiten.map(({ ea, zeilen }) => (
        <div key={ea}>
          <Raster
            spalten={spalten}
            spaltenBreite={spaltenBreite}
            links={<span className="text-xs tracking-wide text-ink-muted">{zeilen[0].gruppe}</span>}
            className="mt-1"
          />
          <ul>
            {zeilen.map((z) => {
              const betrag = z.werte.ansatz ?? 0;
              // Der Balken zeigt das Große; die kleinen Beträge verschwinden bewusst,
              // ihre Zahl steht ja daneben.
              const anteil = groesste ? Math.min(1, Math.abs(betrag) / groesste) : 0;
              return (
                <li key={z.hhst}>
                  <Link
                    to={`/posten/${z.hhst}`}
                    aria-label={[
                      `${z.name}, Haushaltsstelle ${z.hhst}`,
                      ...spalten.map((s) => `${s.kopf}: ${z.werte[s.key] == null ? "keine Angabe" : fmtEur(z.werte[s.key]!)}`),
                    ].join(", ")}
                    className={cn("block border-b border-ink-line/40 hover:bg-cream-dark/60", z.intern && "text-ink-muted")}
                  >
                    <Raster
                      spalten={spalten}
                      spaltenBreite={spaltenBreite}
                      werte={z.werte}
                      links={
                        <>
                          <span className="mr-2 shrink-0 text-xs text-ink-muted tabular-nums">{z.hhst}</span>
                          {z.name}
                          {z.intern && <span className="ml-2 text-xs">intern</span>}
                          {z.kontotext && <span className="block truncate text-xs text-ink-muted">{z.kontotext}</span>}
                        </>
                      }
                      balken={
                        // Der Datenbalken steht unter der Zahl des Planjahrs: ein
                        // Maßstab für die ganze Seite, damit beim Scrollen das Große
                        // ins Auge springt. Investitionen sind ocker, wie ihre
                        // Balken in der Timeline.
                        anteil >= 0.02 && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute -bottom-[3px] right-0 h-[3px] rounded-l-sm"
                            style={{
                              width: `${anteil * 100}%`,
                              background: z.haushalt === "vermoegen" ? INVEST_COLOR : ton.text,
                            }}
                          />
                        )
                      }
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {summen && summe && (
            <Raster
              spalten={spalten}
              spaltenBreite={spaltenBreite}
              werte={summe[ea]}
              links={`Summe ${zeilen[0].gruppe}`}
              className="border-t border-ink-soft/50 font-semibold"
            />
          )}
        </div>
      ))}
      {abgleich && summe && (
        <Raster
          spalten={spalten}
          spaltenBreite={spaltenBreite}
          werte={differenz(summe.E, summe.A, spalten)}
          links={
            <>
              Abgleich <span className="text-xs font-normal text-ink-muted">Einnahmen − Ausgaben</span>
            </>
          }
          className="mt-1 border-t-2 border-ink-soft/50 font-semibold"
        />
      )}
    </div>
  );
}

/** Einnahmen minus Ausgaben je Spalte; leer nur, wo beide Seiten leer sind. */
function differenz(e: GesamtWerte, a: GesamtWerte, spalten: GesamtSpalte[]): GesamtWerte {
  const out: GesamtWerte = {};
  for (const { key } of spalten) {
    const ev = e[key];
    const av = a[key];
    out[key] = ev == null && av == null ? null : (ev ?? 0) - (av ?? 0);
  }
  return out;
}

export type { SpaltenKey };
