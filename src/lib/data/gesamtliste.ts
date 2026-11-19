// Der ganze Haushalt als eine Liste, in der Ordnung des amtlichen Plans (Vorbild:
// Haushaltsplanentwurf 2025). Alles andere in dieser App fasst zusammen; hier
// steht jede Haushaltsstelle einzeln, und die Reihenfolge ist die der Kämmerei:
//
//   A. Verwaltungshaushalt                    B. Vermögenshaushalt
//     Einzelplan 0 … 9                          Einzelplan 0 … 9
//       Einrichtung (amtlich: Unterabschnitt)     …
//         Einnahmen, Summe Einnahmen
//         Ausgaben, Summe Ausgaben
//         Abgleich (Einnahmen − Ausgaben)
//
// Die Bereiche (zweistellig) kennt der amtliche Plan nicht als Überschrift. Sie
// bleiben hier, weil die App überall in dieser Ebene denkt; an der Reihenfolge
// ändern sie nichts.
import type { Context, Data, EA, Haushalt, Posten, Zwischenstand } from "./types";
import { abschnittName } from "./core";
import { neuesterStand, wechsel, type Wechsel } from "./selectors";
import { isInternal } from "../kameral.mjs";
import { MONATE } from "../format";

/** Die Spalten, die eine Zeile tragen kann. Welche davon stehen, wählt die Seite. */
export type SpaltenKey =
  | "ansatz"
  | "ergebnis"
  | "gebucht"
  | "bezahlt"
  | "ansatzVor"
  | "ergebnisVor"
  | "gebuchtVor"
  | "bezahltVor"
  | "ansatzNach";

export interface GesamtSpalte {
  key: SpaltenKey;
  kopf: string;
  /** Zweite, kleine Zeile im Kopf, etwa „Entwurf, Stand 13.11.2026“. */
  zusatz?: string;
  /** Die hervorgehobene Spalte, wie das grau hinterlegte Planjahr im amtlichen Plan. */
  markiert?: boolean;
  /** Die Spalte steht als Platzhalter, hat aber noch keine Zahlen. */
  leer?: boolean;
  /** Klein unter dem Betrag: was aus diesem Ansatz wurde, Ergebnis oder Stand. */
  unter?: { keys: SpaltenKey[]; kopf: string };
  /** Pfeile gegen den Betrag dieser Spalte. */
  vergleich?: SpaltenKey;
}

export type GesamtWerte = Partial<Record<SpaltenKey, number | null>>;

export interface GesamtZeile {
  hhst: string;
  name: string;
  kontotext: string | null;
  ea: EA;
  haushalt: Haushalt;
  /** Innere Verrechnungen bleiben drin, sonst stimmen die Summen nicht. */
  intern: boolean;
  /** „Einnahmen" oder „Ausgaben" — wechselt mit der ersten Ziffer der GRZ. */
  gruppe: string;
  werte: GesamtWerte;
  /** Gegenüber dem Vorjahr neu oder nicht mehr vorhanden; null, wenn beides nicht. */
  wechsel: Wechsel | null;
  /** Erläuterung der Kämmerei, wörtlich; nur im Jahr, zu dem sie geschrieben ist. */
  erlaeuterung?: string[];
  /** Suchwörter zur Erläuterung, nur für den Filter */
  such?: string[];
}

export interface GesamtKnoten {
  /**
   * Sprungmarke und Adresse: 2 (Einzelplan), 21 (Bereich), 5701 (Einrichtung).
   * Eine Nummer kann in beiden Haushalten stehen; die kurze Kennung gehört dem
   * Verwaltungshaushalt, der zuerst kommt, der Vermögenshaushalt bekommt dann
   * `vm-5701`.
   */
  id: string;
  nummer: string;
  name: string;
  /** Ansatz des Stichjahrs, für die Kopfzeilen von Einzelplan und Bereich. */
  einnahmen: number;
  ausgaben: number;
  kinder: GesamtKnoten[];
  zeilen: GesamtZeile[];
  /** Nur bei Einrichtungen: die Summen je Seite über alle ihre Zeilen, je Spalte. */
  summe?: { E: GesamtWerte; A: GesamtWerte };
}

export interface GesamtHaushalt {
  haushalt: Haushalt;
  /** „A. Verwaltungshaushalt" — Buchstabe und Name wie im amtlichen Plan. */
  titel: string;
  einzelplaene: GesamtKnoten[];
}

export interface Gesamtliste {
  /** Erst der Verwaltungs-, dann der Vermögenshaushalt. */
  haushalte: GesamtHaushalt[];
  summen: {
    verwaltung: { einnahmen: number; ausgaben: number };
    vermoegen: { einnahmen: number; ausgaben: number };
  };
  /**
   * Was unter dem Ansatz des Vorjahres und des Stichjahrs klein steht: das
   * Ergebnis, sobald es eines gibt, sonst der jüngste Zwischenstand, sonst
   * nichts.
   */
  ist: { vor: IstQuelle | null; jahr: IstQuelle | null };
  /** Woher die Zahlen des Folgejahres kommen; null, solange es keine gibt. */
  nach: "ansatz" | "finanzplan" | null;
}

export type IstQuelle = { art: "ergebnis" } | { art: "stand"; stichtag: string };

/** „01.10.2026“ */
export function standText(q: { stichtag: string }): string {
  const [j, m, t] = q.stichtag.split("-");
  return `${t}.${m}.${j}`;
}

const sauber = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Die Gruppe einer Haushaltsstelle innerhalb ihres Haushalts. Die erste Ziffer
 * der Gruppierung trennt kameral schon alles: 0–3 Einnahmen, 4–9 Ausgaben, und
 * 3 und 9 gehören zum Vermögenshaushalt. Aufsteigende Nummern ergeben so
 * innerhalb eines Haushalts von selbst erst die Einnahmen, dann die Ausgaben.
 */
export function gruppeVon(p: Posten): string {
  return p.ea === "E" ? "Einnahmen" : "Ausgaben";
}

/** Gliederungen sind vier- oder fünfstellig; 4640 steht vor 46410, nicht danach. */
const glzOrdnung = (glz: string) => glz.padEnd(5, "0");

const HAUSHALTE: [Haushalt, string][] = [
  ["verwaltung", "A. Verwaltungshaushalt"],
  ["vermoegen", "B. Vermögenshaushalt"],
];

/** Summe je Spalte; eine Spalte, in der keine Zeile einen Wert hat, bleibt leer. */
function summiere(zeilen: GesamtZeile[]): GesamtWerte {
  const out: GesamtWerte = {};
  for (const z of zeilen) {
    for (const [k, v] of Object.entries(z.werte) as [SpaltenKey, number | null][]) {
      if (!(k in out)) out[k] = null;
      if (v != null) out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

/**
 * Baut die ganze Liste für ein Stichjahr. Ansatz des Jahres, Ergebnis (und
 * Ansatz) des Vorjahres, Ansatz des Folgejahres. Der amtliche Plan zeigt das
 * Ergebnis des Vorvorjahres, weil das Vorjahr bei der Aufstellung noch nicht
 * abgerechnet ist — hier liegt es vor. Das Folgejahr ist leer, bis sein Plan in
 * den Daten steht; die Spalte steht trotzdem, als Platz für den nächsten Plan.
 */
export function gesamtliste(data: Data, jahr: number): Gesamtliste {
  const vorjahr = data.budget.meta.years.includes(jahr - 1) ? jahr - 1 : null;

  const ansatz = new Map<string, number>();
  const ergebnis = new Map<string, number>();
  const ansatzVor = new Map<string, number>();
  const ergebnisVor = new Map<string, number>();
  let ansatzNach = new Map<string, number>();
  for (const f of data.budget.facts) {
    if (f.year === jahr) {
      if (f.ansatz != null) ansatz.set(f.hhst_id, f.ansatz);
      if (f.ergebnis != null) ergebnis.set(f.hhst_id, f.ergebnis);
    }
    if (f.year === jahr + 1 && f.ansatz != null) ansatzNach.set(f.hhst_id, f.ansatz);
    if (vorjahr != null && f.year === vorjahr) {
      if (f.ansatz != null) ansatzVor.set(f.hhst_id, f.ansatz);
      if (f.ergebnis != null) ergebnisVor.set(f.hhst_id, f.ergebnis);
    }
  }
  let nach: Gesamtliste["nach"] = ansatzNach.size ? "ansatz" : null;
  if (!nach && data.finanzplan?.jahr === jahr + 1) {
    ansatzNach = new Map(Object.entries(data.finanzplan.ansatz));
    nach = "finanzplan";
  }
  // Ein Ergebnis geht jedem Zwischenstand vor: Ist das Jahr abgerechnet, zählt nur noch das.
  const istVon = (erg: Map<string, number>, j: number | null): { quelle: IstQuelle | null; stand?: Zwischenstand } => {
    if (j == null) return { quelle: null };
    if (erg.size) return { quelle: { art: "ergebnis" } };
    const stand = neuesterStand(data.zwischenstand, j);
    return stand ? { quelle: { art: "stand", stichtag: stand.stichtag }, stand } : { quelle: null };
  };
  const istJahr = istVon(ergebnis, jahr);
  const istVor = istVon(ergebnisVor, vorjahr);
  const erl = data.erlaeuterungen?.jahr === jahr ? data.erlaeuterungen : undefined;
  const erlaeuterung = (hhst: string) => {
    const e = erl?.stellen[hhst];
    return e ? { ...(e.text ? { erlaeuterung: e.text } : {}), ...(e.such ? { such: e.such } : {}) } : {};
  };

  const summen = {
    verwaltung: { einnahmen: 0, ausgaben: 0 },
    vermoegen: { einnahmen: 0, ausgaben: 0 },
  };

  // Einrichtungen je Haushalt sammeln, dann in Bereiche und Einzelpläne hängen.
  const nachGlz: Record<Haushalt, Map<string, Posten[]>> = { verwaltung: new Map(), vermoegen: new Map() };
  for (const p of Object.values(data.budget.posten)) {
    const liste = nachGlz[p.haushalt].get(p.glz);
    if (liste) liste.push(p);
    else nachGlz[p.haushalt].set(p.glz, [p]);
  }

  // Kurze Kennung für den, der zuerst kommt (Verwaltungshaushalt), sonst `vm-`.
  const vergeben = new Set<string>();
  const kennung = (nummer: string) => {
    const id = vergeben.has(nummer) ? `vm-${nummer}` : nummer;
    vergeben.add(nummer);
    return id;
  };

  const leer = (nummer: string, anzeige: string, name: string): GesamtKnoten => ({
    id: kennung(nummer),
    nummer: anzeige,
    name,
    einnahmen: 0,
    ausgaben: 0,
    kinder: [],
    zeilen: [],
  });

  const haushalte: GesamtHaushalt[] = [];
  for (const [haushalt, titel] of HAUSHALTE) {
    const einzelplaene = new Map<string, GesamtKnoten>();
    const bereiche = new Map<string, GesamtKnoten>();
    const glzs = [...nachGlz[haushalt].keys()].sort((a, b) => glzOrdnung(a).localeCompare(glzOrdnung(b)));
    // Einzelplan und Bereich vor der Einrichtung anlegen, damit die kurze
    // Kennung in Lesereihenfolge vergeben wird.
    for (const glz of glzs) {
      const posten = nachGlz[haushalt].get(glz)!.sort((a, b) => a.grz.localeCompare(b.grz));
      const erste = posten[0];
      const ab = glz.slice(0, 2);
      const ep = erste.einzelplan;
      let plan = einzelplaene.get(ep);
      if (!plan) {
        plan = leer(ep, ep, erste.einzelplan_name);
        einzelplaene.set(ep, plan);
      }
      let bereich = bereiche.get(ab);
      if (!bereich) {
        bereich = leer(ab, `${ab}xx`, abschnittName(data.labels, ab));
        bereiche.set(ab, bereich);
        plan.kinder.push(bereich);
      }
      const knoten = leer(glz, glz, sauber(erste.glz_text) || glz);
      bereich.kinder.push(knoten);
      fuelle(knoten, posten);
    }
    // Summen von unten nach oben.
    for (const plan of einzelplaene.values()) {
      for (const bereich of plan.kinder) {
        for (const e of bereich.kinder) {
          bereich.einnahmen += e.einnahmen;
          bereich.ausgaben += e.ausgaben;
        }
        plan.einnahmen += bereich.einnahmen;
        plan.ausgaben += bereich.ausgaben;
      }
    }
    if (einzelplaene.size) {
      haushalte.push({ haushalt, titel, einzelplaene: [...einzelplaene.values()].sort((a, b) => a.nummer.localeCompare(b.nummer)) });
    }
  }

  function fuelle(knoten: GesamtKnoten, posten: Posten[]) {
    for (const p of posten) {
      const werte: GesamtZeile["werte"] = {
        ansatz: ansatz.get(p.hhst_id) ?? null,
        ansatzNach: ansatzNach.get(p.hhst_id) ?? null,
      };
      if (istJahr.quelle?.art === "ergebnis") werte.ergebnis = ergebnis.get(p.hhst_id) ?? null;
      stand(werte, istJahr.stand, p.hhst_id, "gebucht", "bezahlt");
      if (vorjahr != null) {
        werte.ansatzVor = ansatzVor.get(p.hhst_id) ?? null;
        werte.ergebnisVor = ergebnisVor.get(p.hhst_id) ?? null;
        stand(werte, istVor.stand, p.hhst_id, "gebuchtVor", "bezahltVor");
      }
      knoten.zeilen.push({
        hhst: p.hhst_id,
        name: sauber(p.grz_text) || p.hhst_id,
        kontotext: sauber(p.kontotext) || null,
        ea: p.ea,
        haushalt: p.haushalt,
        intern: isInternal(p),
        gruppe: gruppeVon(p),
        werte,
        wechsel: wechsel(data, p.hhst_id, jahr),
        ...erlaeuterung(p.hhst_id),
      });
      const betrag = werte.ansatz ?? 0;
      if (p.ea === "E") knoten.einnahmen += betrag;
      else knoten.ausgaben += betrag;
      summen[p.haushalt][p.ea === "E" ? "einnahmen" : "ausgaben"] += betrag;
    }
    knoten.summe = {
      E: summiere(knoten.zeilen.filter((z) => z.ea === "E")),
      A: summiere(knoten.zeilen.filter((z) => z.ea === "A")),
    };
  }

  return { haushalte, summen, ist: { vor: istVor.quelle, jahr: istJahr.quelle }, nach };
}

/** Gebucht und bezahlt aus einem Stand; eine Stelle, die er nicht kennt, hat dort nichts. */
function stand(werte: GesamtWerte, z: Zwischenstand | undefined, hhst: string, g: SpaltenKey, b: SpaltenKey) {
  if (!z) return;
  const w = z.werte[hhst];
  werte[g] = w ? w[0] : null;
  werte[b] = w ? w[1] : null;
}

// ── Pfeile: Ansatz gegen Vorjahr ────────────────────────────────────────────

/** Unter zwei Prozent in beide Richtungen gilt als gleich geblieben. */
export const SCHWELLE = 0.02;

export type Richtung = "auf" | "ab" | "gleich";

export interface Veraenderung {
  richtung: Richtung;
  /** Veränderung als Anteil (0.042 = +4,2 %); null, wenn der Vorjahresbetrag 0 war */
  anteil: number | null;
}

/** Wie sich Preise und Einwohnerzahl zwischen zwei Ansätzen verändert haben. */
export interface Bereinigung {
  /** Preisindex Jahresbeginn jetzt / Jahresbeginn Vorjahr */
  preis: number;
  einwohner: number;
  /** die Monate des Preisindex, etwa „Dezember 2025“ und „Oktober 2026“ */
  preisVon: string;
  preisBis: string;
}

/**
 * Preisindex zum Beginn eines Jahres, also der Dezemberwert des Vorjahres:
 * Ein Ansatz gilt ab dem 1. Januar. Fehlt der Dezember noch, der jüngste
 * Monat davor im selben Jahr.
 */
function vpiZumJahresbeginn(ctx: Context, jahr: number): { wert: number; monat: string } | null {
  const monate = Object.keys(ctx.vpi_monat ?? {})
    .filter((k) => k.startsWith(`${jahr - 1}-`))
    .sort();
  const k = monate.at(-1);
  if (!k) return null;
  return { wert: ctx.vpi_monat![k], monat: `${MONATE[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}` };
}

/** Preis- und Einwohnerfaktor von Vorjahr zu Jahr; null, wenn eines davon fehlt. */
export function bereinigung(ctx: Context, jahr: number): Bereinigung | null {
  const von = vpiZumJahresbeginn(ctx, jahr - 1);
  const bis = vpiZumJahresbeginn(ctx, jahr);
  const ew = ctx.population?.[String(jahr)];
  const ewVor = ctx.population?.[String(jahr - 1)];
  if (!von || !bis || !ew || !ewVor) return null;
  return { preis: bis.wert / von.wert, einwohner: ew / ewVor, preisVon: von.monat, preisBis: bis.monat };
}

function richtung(anteil: number): Richtung {
  return anteil >= SCHWELLE ? "auf" : anteil <= -SCHWELLE ? "ab" : "gleich";
}

/**
 * Zwei Pfeile für einen Ansatz gegen den des Vorjahres: wie er sich in Euro
 * verändert und wie, wenn man Preise und Einwohnerzahl herausrechnet. Keine
 * Pfeile, wo einer der Beträge fehlt, beide null sind oder einer negativ ist:
 * Dort sagt ein Prozentwert nichts.
 */
export function pfeile(
  jetzt: number | null | undefined,
  vorher: number | null | undefined,
  b: Bereinigung | null,
): { nominal: Veraenderung; real: Veraenderung | null } | null {
  if (jetzt == null || vorher == null || jetzt < 0 || vorher < 0) return null;
  if (jetzt === 0 && vorher === 0) return null;
  if (vorher === 0) {
    const neu: Veraenderung = { richtung: "auf", anteil: null };
    return { nominal: neu, real: b ? neu : null };
  }
  const n = jetzt / vorher - 1;
  const r = b ? jetzt / vorher / (b.preis * b.einwohner) - 1 : null;
  return {
    nominal: { richtung: richtung(n), anteil: n },
    real: r == null ? null : { richtung: richtung(r), anteil: r },
  };
}

/** Alle Zeilen der Liste, in der Reihenfolge, in der sie auf der Seite stehen. */
export function gesamtlisteZeilen(liste: Gesamtliste): GesamtZeile[] {
  const out: GesamtZeile[] = [];
  for (const h of liste.haushalte) {
    for (const plan of h.einzelplaene) {
      for (const bereich of plan.kinder) {
        for (const einrichtung of bereich.kinder) out.push(...einrichtung.zeilen);
      }
    }
  }
  return out;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

const feld = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const KURZ: Partial<Record<SpaltenKey, string>> = {
  ergebnis: "Ergebnis",
  ergebnisVor: "Ergebnis",
  gebucht: "gebucht",
  bezahlt: "bezahlt",
  gebuchtVor: "gebucht",
  bezahltVor: "bezahlt",
};

/** Deutsches Excel: Dezimalkomma, keine Tausenderpunkte. */
const zahl = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

/**
 * Die sichtbaren Zeilen mit den sichtbaren Spalten als CSV für deutsches Excel:
 * Semikolon als Trenner, Dezimalkomma, UTF-8 mit BOM (ohne das zeigt Excel die
 * Umlaute falsch). Die Haushaltsstelle steht als Formel-Text, sonst macht Excel
 * aus `0301.6322` eine Zahl und frisst die führende Null.
 *
 * Reine Funktion: der Knopf dazu kommt erst nach Rückmeldung.
 */
export function gesamtlisteCsv(zeilen: GesamtZeile[], sichtbar: GesamtSpalte[]): string {
  // In der Tabelle stehen Ergebnis und Stand klein unter dem Ansatz, hier je
  // in eigener Spalte, sonst rechnet in Excel niemand damit.
  const spalten = sichtbar.flatMap((s) => [
    s,
    ...(s.unter?.keys ?? []).map((key) => ({ key, kopf: `${s.kopf}, ${KURZ[key]}` })),
  ]);
  const kopf = ["Haushaltsstelle", "Bezeichnung", "Art", "Haushalt", ...spalten.map((s) => s.kopf)];
  const reihen = zeilen.map((z) =>
    [
      `="${z.hhst}"`,
      feld(z.kontotext ? `${z.name} (${z.kontotext})` : z.name),
      z.ea === "E" ? "Einnahme" : "Ausgabe",
      z.haushalt === "verwaltung" ? "Verwaltungshaushalt" : "Vermögenshaushalt",
      ...spalten.map((s) => zahl(z.werte[s.key])),
    ].join(";"),
  );
  return `﻿${[kopf.map(feld).join(";"), ...reihen].join("\r\n")}\r\n`;
}
