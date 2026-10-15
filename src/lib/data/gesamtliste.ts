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
import type { Data, EA, Haushalt, Posten } from "./types";
import { abschnittName } from "./core";
import { isInternal } from "../kameral.mjs";

/** Die Spalten, die eine Zeile tragen kann. Welche davon stehen, wählt die Seite. */
export type SpaltenKey =
  | "ansatz"
  | "ansatzVor"
  | "ergebnisVor"
  | "ansatzNach"
  | "gebucht"
  | "bezahlt"
  | "gebuchtVor"
  | "bezahltVor";

export interface GesamtSpalte {
  key: SpaltenKey;
  kopf: string;
  /** Die hervorgehobene Spalte, wie das grau hinterlegte Planjahr im amtlichen Plan. */
  markiert?: boolean;
  /** Die Spalte steht als Platzhalter, hat aber noch keine Zahlen. */
  leer?: boolean;
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
   * Die Stichtage, die zu dieser Liste passen: zum Stichjahr und zu dessen
   * Vorjahr, nach Jahr aufsteigend. Leer, wenn es keinen gibt.
   */
  zwischenstand: { jahr: number; stichtag: string }[];
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
  const zsJahr = data.zwischenstand.find((z) => z.jahr === jahr);
  const zsVor = data.zwischenstand.find((z) => z.jahr === jahr - 1);

  const ansatz = new Map<string, number>();
  const ansatzVor = new Map<string, number>();
  const ergebnisVor = new Map<string, number>();
  const ansatzNach = new Map<string, number>();
  for (const f of data.budget.facts) {
    if (f.year === jahr && f.ansatz != null) ansatz.set(f.hhst_id, f.ansatz);
    if (f.year === jahr + 1 && f.ansatz != null) ansatzNach.set(f.hhst_id, f.ansatz);
    if (vorjahr != null && f.year === vorjahr) {
      if (f.ansatz != null) ansatzVor.set(f.hhst_id, f.ansatz);
      if (f.ergebnis != null) ergebnisVor.set(f.hhst_id, f.ergebnis);
    }
  }

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
      if (vorjahr != null) {
        werte.ansatzVor = ansatzVor.get(p.hhst_id) ?? null;
        werte.ergebnisVor = ergebnisVor.get(p.hhst_id) ?? null;
      }
      const stich = zsJahr?.werte[p.hhst_id];
      if (stich) {
        werte.gebucht = stich[0];
        werte.bezahlt = stich[1];
      }
      const stichVor = zsVor?.werte[p.hhst_id];
      if (stichVor) {
        werte.gebuchtVor = stichVor[0];
        werte.bezahltVor = stichVor[1];
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

  return {
    haushalte,
    summen,
    zwischenstand: [zsVor, zsJahr].filter((z) => z != null).map((z) => ({ jahr: z.jahr, stichtag: z.stichtag })),
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
export function gesamtlisteCsv(zeilen: GesamtZeile[], spalten: GesamtSpalte[]): string {
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
