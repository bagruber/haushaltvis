import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp } from "@phosphor-icons/react";
import {
  useData,
  bereinigung,
  gesamtliste,
  pfeile,
  standText,
  type Bereinigung,
  type GesamtKnoten,
  type GesamtSpalte,
  type GesamtWerte,
  type GesamtZeile,
  type IstQuelle,
  type SpaltenKey,
  type Veraenderung,
  type Wechsel,
} from "@/lib/data";
import { standardJahr, useYearCtx } from "@/lib/year";
import { usePageTitle } from "@/lib/title";
import { useTeilScroll } from "@/lib/teilen";
import { AbschnittLink, Kennzahl, Loading, SegmentedToggle, SeitenKopf } from "@/components/ui";
import { INVEST_COLOR } from "@/components/Timeline";
import { EINZELPLAN_COLORS, kategorieTon } from "@/lib/marke.mjs";
import { cn } from "@/lib/cn";
import { fmtDatum, fmtEur, fmtEurShort } from "@/lib/format";

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
  const { pathname } = useLocation();
  const { data, error } = useData();
  const { year: selYear } = useYearCtx();
  const [haushalt, setHaushalt] = useState<HaushaltFilter>("beide");
  const [artFilter, setArt] = useState<ArtFilter>("beide");
  const [suche, setSuche] = useState("");
  const [leere, setLeere] = useState(false);
  // Die Bedienelemente folgen sofort, die Liste rechnet im Hintergrund nach:
  // React baut sie mit den zurückgestellten Werten und bricht ab, wenn schon
  // die nächste Taste kommt. Solange sie hinterherhinkt, ist sie ausgegraut.
  const dHaushalt = useDeferredValue(haushalt);
  const dArt = useDeferredValue(artFilter);
  const dSuche = useDeferredValue(suche);
  const dLeere = useDeferredValue(leere);
  const veraltet = dHaushalt !== haushalt || dArt !== artFilter || dSuche !== suche || dLeere !== leere;

  const view = useMemo(() => {
    if (!data) return null;
    const jahr = selYear ?? standardJahr(data.budget, pathname);
    const liste = gesamtliste(data, jahr);
    const entwurf = data.budget.meta.entwurf;
    const vorjahr = data.budget.meta.years.includes(jahr - 1) ? jahr - 1 : null;
    const istJahr = (j: number) => (j === entwurf?.jahr ? `Entwurf, Stand ${fmtDatum(entwurf.stand)}` : undefined);
    // Von links nach rechts in der Zeit wie im amtlichen Plan: Vorjahr, Planjahr
    // (hervorgehoben), Folgejahr. Unter jedem Ansatz klein, was daraus wurde:
    // das Ergebnis oder, solange das Jahr läuft, der jüngste Stand.
    const spalten: GesamtSpalte[] = [];
    if (vorjahr != null) {
      spalten.push({ key: "ansatzVor", kopf: `Ansatz ${vorjahr}`, zusatz: istJahr(vorjahr), unter: unter(liste.ist.vor, "Vor") });
    }
    spalten.push({
      key: "ansatz",
      kopf: `Ansatz ${jahr}`,
      zusatz: istJahr(jahr),
      markiert: true,
      unter: unter(liste.ist.jahr, ""),
      vergleich: vorjahr != null ? "ansatzVor" : undefined,
    });
    spalten.push({
      key: "ansatzNach",
      kopf: `${liste.nach === "finanzplan" ? "Finanzplan" : "Ansatz"} ${jahr + 1}`,
      zusatz: istJahr(jahr + 1),
      leer: liste.nach == null,
    });
    return { jahr, vorjahr, liste, spalten, entwurf: jahr === entwurf?.jahr ? entwurf : null, bereinigt: bereinigung(data.context, jahr) };
  }, [data, selYear, pathname]);

  // Filtern erst nach dem Baum: der Baum haengt nur am Jahr, die Filter am Tippen.
  const gefiltert = useMemo(() => {
    if (!view) return null;
    const q = norm(dSuche.trim());
    const passt = (z: GesamtZeile) => {
      if (dArt !== "beide" && z.ea !== dArt) return false;
      if (!dLeere && !view.spalten.some((s) => z.werte[s.key] || s.unter?.keys.some((k) => z.werte[k]))) return false;
      if (q && ![z.name, z.hhst, z.kontotext ?? "", ...(z.erlaeuterung ?? []), ...(z.such ?? [])].some((t) => norm(t).includes(q))) return false;
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

  const { liste, spalten, jahr, vorjahr, entwurf, bereinigt } = view;
  // Die leere Folgejahr-Spalte ist schmaler; die übrigen tragen unter dem
  // Betrag zwei Zahlen nebeneinander und brauchen die Breite.
  const breite = (s: GesamtSpalte) =>
    s.leer ? "minmax(4.5rem, 5.5rem)" : s.unter || s.markiert ? "minmax(7.5rem, 10rem)" : "minmax(6rem, 8.5rem)";
  const breiteSpalten = `minmax(0,1fr) ${spalten.map(breite).join(" ")}`;
  const vergleich = { vorjahr, jahr, bereinigt };
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

      <div className="max-w-prose space-y-2 text-sm text-ink-soft">
        {entwurf && (
          <p>
            <strong className="font-semibold text-ink">{jahr} ist ein Entwurf.</strong> Die Zahlen stammen aus dem
            Arbeitsplan der Kämmerei, Stand {fmtDatum(entwurf.stand)}, und sind noch nicht beschlossen.
          </p>
        )}
        {vorjahr != null && (
          <p>
            Die Pfeile am Ansatz {jahr} vergleichen mit dem Ansatz {vorjahr}
            {bereinigt ? (
              <>
                , der linke in Euro, der rechte nach Abzug der Teuerung und je Einwohner{" "}
                <span className="inline-flex items-center gap-1 rounded-full border border-ink-line bg-white/70 px-1.5 align-[-2px] leading-[1.1rem]">
                  <PfeilBild r="auf" />
                  <PfeilBild r="gleich" />
                </span>
                .
              </>
            ) : (
              " in Euro; bereinigt erst, wenn für beide Jahre Preis- und Einwohnerzahlen vorliegen."
            )}{" "}
            Waagrecht heißt: weniger als 2 % Veränderung. Die genaue Zahl steht beim Darüberfahren.
          </p>
        )}
      </div>

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
          <span key={s.key} className={cn("py-1 text-right", s.markiert && MARKIERT)}>
            <span className={s.markiert ? "font-semibold text-ink" : undefined}>{s.kopf}</span>
            {s.zusatz && <span className="block text-[11px]">{s.zusatz}</span>}
            {s.unter && <span className="block text-[11px] leading-tight">{s.unter.kopf}</span>}
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
              <KnotenKopf knoten={plan} art="Einzelplan" jahr={jahr} entwurf={!!entwurf} pfad={`/erkunden/gesamtliste/${plan.id}`} farbe={EINZELPLAN_COLORS[plan.nummer]} gross summen />
              {plan.kinder.map((bereich) => (
                <div key={bereich.id} id={bereich.id} className="scroll-mt-[calc(var(--kopf-hoehe)+6.5rem)]">
                  <Aufschub
                    sofort={teil === bereich.id || bereich.kinder.some((e) => e.id === teil)}
                    hoehe={geschaetzteHoehe(bereich)}
                  >
                  <KnotenKopf knoten={bereich} art="Bereich" jahr={jahr} entwurf={!!entwurf} pfad={`/erkunden/gesamtliste/${bereich.id}`} summen />
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
                        vergleich={vergleich}
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
function KnotenKopf({ knoten, art, jahr, entwurf, pfad, ziel, farbe, gross, summen }: {
  knoten: GesamtKnoten;
  art: string;
  jahr: number;
  entwurf?: boolean;
  pfad: string;
  ziel?: string;
  farbe?: string;
  gross?: boolean;
  summen?: boolean;
}) {
  const name = (
    <>
      <span className="shrink-0 tabular-nums lining-nums text-ink-soft">{knoten.nummer}</span>
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
          <span className="text-ink-muted">Ansatz {jahr}{entwurf && " (Entwurf)"}:</span>
          {knoten.einnahmen > 0 && <span>Einnahmen {fmtEurShort(knoten.einnahmen)}</span>}
          {knoten.ausgaben > 0 && <span>Ausgaben {fmtEurShort(knoten.ausgaben)}</span>}
        </span>
      )}
    </div>
  );
}

const fmtWert = (v: number | null | undefined) => (v == null ? "" : fmtEur(v));

/**
 * Warum ein Feld leer ist, wo es eine Stelle im Vorjahr oder im Jahr nicht
 * gibt: „neu“ beim Vorjahr, „entfällt“ beim Jahr. Eine Stelle mit 0 € ist
 * dagegen eine ganz normale Stelle und hat ihren Betrag.
 */
function feldMarke(wechsel: Wechsel | null | undefined, s: GesamtSpalte): string | null {
  if (wechsel === "neu" && s.key === "ansatzVor") return "neu";
  if (wechsel === "weg" && s.markiert) return "entfällt";
  return null;
}

/** Was klein unter einem Ansatz steht: das Ergebnis oder gebucht und bezahlt zum jüngsten Stand. */
function unter(q: IstQuelle | null, endung: "" | "Vor"): GesamtSpalte["unter"] {
  if (!q) return undefined;
  if (q.art === "ergebnis") return { keys: [`ergebnis${endung}`], kopf: "darunter das Ergebnis" };
  return { keys: [`gebucht${endung}`, `bezahlt${endung}`], kopf: `darunter gebucht · bezahlt, Stand ${standText(q)}` };
}

interface Vergleich {
  vorjahr: number | null;
  jahr: number;
  bereinigt: Bereinigung | null;
}

const prozent = (anteil: number) =>
  `${anteil >= 0 ? "+" : "−"}${Math.abs(anteil * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

const PFEIL = { auf: ArrowUp, ab: ArrowDown, gleich: ArrowRight };

/** Am Telefon fehlt der Spaltenkopf; die kleinen Zahlen sagen selbst, was sie sind. */
const KURZ_MOBIL: Partial<Record<SpaltenKey, string>> = {
  ergebnis: "Ergebnis",
  ergebnisVor: "Ergebnis",
  gebucht: "gebucht",
  bezahlt: "bezahlt",
  gebuchtVor: "gebucht",
  bezahltVor: "bezahlt",
};

/** Ein Pfeil wie in der Liste, für den erklärenden Satz darüber. */
function PfeilBild({ r }: { r: keyof typeof PFEIL }) {
  const Icon = PFEIL[r];
  return <Icon size={12} weight="bold" className="inline align-[-1px]" aria-hidden />;
}

/**
 * Zwei Pfeile: der Ansatz gegen den des Vorjahres, einmal in Euro, einmal ohne
 * Teuerung und je Einwohner. Richtung statt Farbe: Ob mehr gut oder schlecht
 * ist, hängt am Posten, nicht an der Zahl.
 */
function Pfeile({ jetzt, vorher, v }: { jetzt: number | null | undefined; vorher: number | null | undefined; v: Vergleich }) {
  const p = pfeile(jetzt, vorher, v.bereinigt);
  if (!p || v.vorjahr == null) return null;
  const nominal =
    p.nominal.anteil == null
      ? `In Euro: von 0 € auf ${fmtEur(jetzt!)}`
      : `In Euro: ${prozent(p.nominal.anteil)} gegenüber dem Ansatz ${v.vorjahr}`;
  const b = v.bereinigt;
  const real =
    p.real && b
      ? p.real.anteil == null
        ? "Bereinigt: von 0 € aus, ohne Prozentzahl"
        : `Nach Abzug der Teuerung und je Einwohner: ${prozent(p.real.anteil)} (Preise ${prozent(b.preis - 1)}, ${b.preisVon} bis ${b.preisBis}; Einwohner ${prozent(b.einwohner - 1)})`
      : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink-line bg-white/70 px-1.5 leading-[1.1rem]">
      <Pfeil v={p.nominal} titel={nominal} />
      {p.real && real && <Pfeil v={p.real} titel={real} />}
    </span>
  );
}

function Pfeil({ v, titel }: { v: Veraenderung; titel: string }) {
  const Icon = PFEIL[v.richtung];
  return (
    <span title={titel} className={v.richtung === "gleich" ? "text-ink-muted" : "text-ink-soft"}>
      <Icon size={11} weight="bold" aria-hidden />
      <span className="sr-only">{titel}</span>
    </span>
  );
}

/** Eine Zeile im Spaltenraster: Bezeichnung links, Beträge rechts, das Planjahr hinterlegt. */
function Raster({ spalten, spaltenBreite, links, werte, wechsel, className, balken, vergleich }: {
  spalten: GesamtSpalte[];
  spaltenBreite: string;
  links: ReactNode;
  werte?: GesamtWerte;
  wechsel?: Wechsel | null;
  className?: string;
  balken?: ReactNode;
  /** Pfeile zeigen; aus beim Abgleich, wo ein Prozentwert nichts sagt. */
  vergleich?: Vergleich;
}) {
  return (
    // Das Spaltenraster erst ab 640 px: darunter sind die Spalten versteckt,
    // ihre Mindestbreiten würden die Zeile trotzdem über den Rand schieben.
    <div
      className={cn("grid items-stretch gap-x-3 sm:[grid-template-columns:var(--spalten)]", className)}
      style={{ "--spalten": spaltenBreite } as CSSProperties}
    >
      {/* Lange AKDB-Wörter („Beihilfen,Unterstützungen“) dürfen umbrechen,
          statt in die Nachbarspalte zu laufen. */}
      <span className="col-span-full min-w-0 py-1 hyphens-auto [overflow-wrap:anywhere] sm:col-span-1">{links}</span>
      {spalten.map((s) => {
        const klein = werte && s.unter ? s.unter.keys.map((k) => werte[k]) : [];
        const pfeil = werte && vergleich && s.vergleich && <Pfeile jetzt={werte[s.key]} vorher={werte[s.vergleich]} v={vergleich} />;
        return (
          <span key={s.key} className={cn("hidden py-1 text-right tabular-nums sm:block", s.markiert && MARKIERT)}>
            <span className="relative block">
              {werte && werte[s.key] == null && feldMarke(wechsel, s) ? (
                <span className="text-ink-muted">{feldMarke(wechsel, s)}</span>
              ) : werte ? (
                fmtWert(werte[s.key])
              ) : (
                ""
              )}
              {s.markiert && balken}
            </span>
            {(pfeil || klein.some((v) => v != null)) && (
              <span className="mt-0.5 flex items-center justify-end gap-2 text-[11px] leading-tight text-ink-muted">
                {pfeil && <span className="mr-auto">{pfeil}</span>}
                {klein.some((v) => v != null) && <span>{klein.map((v) => (v == null ? "–" : fmtEur(v))).join(" · ")}</span>}
              </span>
            )}
          </span>
        );
      })}
      {/* Unter 640 px: Bezeichnung, darunter zwei Spalten. Links klein das
          Vorjahr mit dem, was daraus wurde, rechts das Planjahr mit den Pfeilen.
          Das Folgejahr fehlt hier; dafür ist am Telefon kein Platz. */}
      {werte && (
        <span className="col-span-full grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 pb-1 text-xs tabular-nums sm:hidden">
          {spalten
            .filter((s) => s.key !== "ansatzNach")
            .map((s) => {
              const klein = s.unter ? s.unter.keys.map((k) => werte[k]) : [];
              return (
                <span key={s.key} className={cn(s.markiert ? "col-start-2 text-right text-ink" : "text-ink-soft")}>
                  <span className={s.markiert ? "font-semibold" : undefined}>
                    {s.kopf}: {werte[s.key] == null ? feldMarke(wechsel, s) ?? "–" : fmtEur(werte[s.key]!)}
                  </span>
                  {vergleich && s.vergleich && (
                    <span className="mt-0.5 block">
                      <Pfeile jetzt={werte[s.key]} vorher={werte[s.vergleich]} v={vergleich} />
                    </span>
                  )}
                  {klein.some((v) => v != null) && (
                    <span className="flex flex-wrap gap-x-2 text-[11px] text-ink-muted">
                      {s.unter!.keys.map((k, i) => (
                        <span key={k} className="whitespace-nowrap">
                          {KURZ_MOBIL[k]} {klein[i] == null ? "–" : fmtEur(klein[i]!)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
        </span>
      )}
    </div>
  );
}

/**
 * Die Posten einer Einrichtung in der Folge des amtlichen Plans: Einnahmen,
 * ihre Summe, Ausgaben, ihre Summe, dann der Abgleich.
 */
function Zeilen({ einrichtung, spalten, spaltenBreite, groesste, vergleich, farbe, summen, abgleich }: {
  einrichtung: GesamtKnoten;
  spalten: GesamtSpalte[];
  spaltenBreite: string;
  groesste: number;
  vergleich: Vergleich;
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
                      ...spalten.map((s) => `${s.kopf}: ${z.werte[s.key] == null ? feldMarke(z.wechsel, s) ?? "keine Angabe" : fmtEur(z.werte[s.key]!)}`),
                    ].join(", ")}
                    className={cn("block border-b border-ink-line/40 hover:bg-cream-dark/60", (z.intern || z.wechsel === "weg") && "text-ink-muted")}
                  >
                    <Raster
                      spalten={spalten}
                      spaltenBreite={spaltenBreite}
                      werte={z.werte}
                      wechsel={z.wechsel}
                      vergleich={vergleich}
                      links={
                        // Die Nummer steht in eigener Spalte, kräftig und bündig untereinander:
                        // Danach suchen Stadträte die Liste ab. Der Name bricht daneben um.
                        <span className="flex gap-x-3">
                          <span className="w-[10ch] shrink-0 whitespace-nowrap font-semibold tabular-nums [overflow-wrap:normal]">{z.hhst}</span>
                          <span className="min-w-0">
                            {z.name}
                            {z.intern && <span className="ml-2 text-xs">intern</span>}
                            {z.kontotext && <span className="block truncate text-xs text-ink-muted">{z.kontotext}</span>}
                            {/* Wörtlich aus dem Arbeitsplan; in Anführungszeichen, damit
                                es nicht für einen Teil des Namens gehalten wird. */}
                            {z.erlaeuterung?.map((t) => (
                              <span key={t} className="mt-0.5 line-clamp-2 text-xs italic text-ink-soft">„{t}“</span>
                            ))}
                          </span>
                        </span>
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
              vergleich={vergleich}
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
          werte={differenz(summe.E, summe.A)}
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
function differenz(e: GesamtWerte, a: GesamtWerte): GesamtWerte {
  const out: GesamtWerte = {};
  for (const key of new Set([...Object.keys(e), ...Object.keys(a)]) as Set<SpaltenKey>) {
    const ev = e[key];
    const av = a[key];
    out[key] = ev == null && av == null ? null : (ev ?? 0) - (av ?? 0);
  }
  return out;
}

export type { SpaltenKey };
