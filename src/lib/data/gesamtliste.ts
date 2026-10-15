// Der ganze Haushalt als eine Liste, in Nummernfolge — die Sicht, die der
// amtliche Plan und die AKDB-Auswertung haben. Alles andere in dieser App
// fasst zusammen; hier steht jede Haushaltsstelle einzeln.
import type { Data, EA, Haushalt, Posten } from "./types";
import { abschnittName } from "./core";
import { isInternal } from "../kameral.mjs";

/** Die Spalten, die eine Zeile tragen kann. Welche davon stehen, wählt die Seite. */
export type SpaltenKey = "ansatz" | "ansatzVor" | "ergebnisVor" | "gebucht" | "bezahlt";

export interface GesamtSpalte {
  key: SpaltenKey;
  kopf: string;
}

export interface GesamtZeile {
  hhst: string;
  name: string;
  kontotext: string | null;
  ea: EA;
  haushalt: Haushalt;
  /** Innere Verrechnungen bleiben drin, sonst stimmen die Summen nicht. */
  intern: boolean;
  /** „Einnahmen · Verwaltungshaushalt" — wechselt mit der ersten Ziffer der GRZ. */
  gruppe: string;
  werte: Partial<Record<SpaltenKey, number | null>>;
}

export interface GesamtKnoten {
  /** Sprungmarke und Adresse: 2 (Einzelplan), 21 (Bereich), 5701 (Einrichtung) */
  id: string;
  nummer: string;
  name: string;
  einnahmen: number;
  ausgaben: number;
  investitionen: number;
  kinder: GesamtKnoten[];
  zeilen: GesamtZeile[];
}

export interface Gesamtliste {
  einzelplaene: GesamtKnoten[];
  summen: {
    verwaltung: { einnahmen: number; ausgaben: number };
    vermoegen: { einnahmen: number; ausgaben: number };
  };
  /** Stichtagsspalten gibt es nur, wenn die Datei zum Stichjahr passt. */
  zwischenstand: { jahr: number; stichtag: string } | null;
}

const sauber = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/**
 * Die Gruppe einer Haushaltsstelle. Die erste Ziffer der Gruppierung trennt
 * kameral schon alles: 0–2 Einnahmen VwH, 3 Einnahmen VmH, 4–8 Ausgaben VwH,
 * 9 Ausgaben VmH. Die Nummernfolge ist damit zugleich die Gliederung.
 */
export function gruppeVon(p: Posten): string {
  const seite = p.ea === "E" ? "Einnahmen" : "Ausgaben";
  if (p.haushalt === "vermoegen") {
    return p.ea === "E" ? "Einnahmen · Vermögenshaushalt" : "Ausgaben · Vermögenshaushalt (Investitionen)";
  }
  return `${seite} · Verwaltungshaushalt`;
}

/** Gliederungen sind vier- oder fünfstellig; 4640 steht vor 46410, nicht danach. */
const glzOrdnung = (glz: string) => glz.padEnd(5, "0");

/**
 * Baut die ganze Liste für ein Stichjahr. Ansatz des Jahres, dazu Ansatz und
 * Ergebnis des Vorjahres: der amtliche Plan zeigt das Vorvorjahr, weil das
 * Vorjahr bei der Aufstellung noch nicht abgerechnet ist — hier liegt es vor.
 */
export function gesamtliste(data: Data, jahr: number): Gesamtliste {
  const vorjahr = data.budget.meta.years.includes(jahr - 1) ? jahr - 1 : null;
  const zs = data.zwischenstand && data.zwischenstand.jahr === jahr ? data.zwischenstand : null;

  const ansatz = new Map<string, number>();
  const ansatzVor = new Map<string, number>();
  const ergebnisVor = new Map<string, number>();
  for (const f of data.budget.facts) {
    if (f.year === jahr && f.ansatz != null) ansatz.set(f.hhst_id, f.ansatz);
    if (vorjahr != null && f.year === vorjahr) {
      if (f.ansatz != null) ansatzVor.set(f.hhst_id, f.ansatz);
      if (f.ergebnis != null) ergebnisVor.set(f.hhst_id, f.ergebnis);
    }
  }

  const summen = {
    verwaltung: { einnahmen: 0, ausgaben: 0 },
    vermoegen: { einnahmen: 0, ausgaben: 0 },
  };

  // Einrichtungen sammeln, dann in Bereiche und Einzelpläne hängen.
  const nachGlz = new Map<string, Posten[]>();
  for (const p of Object.values(data.budget.posten)) {
    const liste = nachGlz.get(p.glz);
    if (liste) liste.push(p);
    else nachGlz.set(p.glz, [p]);
  }

  const leer = (id: string, nummer: string, name: string): GesamtKnoten => ({
    id,
    nummer,
    name,
    einnahmen: 0,
    ausgaben: 0,
    investitionen: 0,
    kinder: [],
    zeilen: [],
  });

  const einzelplaene = new Map<string, GesamtKnoten>();
  const bereiche = new Map<string, GesamtKnoten>();

  for (const glz of [...nachGlz.keys()].sort((a, b) => glzOrdnung(a).localeCompare(glzOrdnung(b)))) {
    const posten = nachGlz.get(glz)!.sort((a, b) => a.grz.localeCompare(b.grz));
    const erste = posten[0];
    const ab = glz.slice(0, 2);
    const ep = erste.einzelplan;

    const knoten = leer(glz, glz, sauber(erste.glz_text) || glz);
    for (const p of posten) {
      const werte: GesamtZeile["werte"] = {
        ansatz: ansatz.get(p.hhst_id) ?? null,
      };
      if (vorjahr != null) {
        werte.ansatzVor = ansatzVor.get(p.hhst_id) ?? null;
        werte.ergebnisVor = ergebnisVor.get(p.hhst_id) ?? null;
      }
      const stich = zs?.werte[p.hhst_id];
      if (stich) {
        werte.gebucht = stich[0];
        werte.bezahlt = stich[1];
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
      else if (p.haushalt === "vermoegen") knoten.investitionen += betrag;
      else knoten.ausgaben += betrag;
      summen[p.haushalt][p.ea === "E" ? "einnahmen" : "ausgaben"] += betrag;
    }

    let bereich = bereiche.get(ab);
    if (!bereich) {
      bereich = leer(ab, `${ab}xx`, abschnittName(data.labels, ab));
      bereiche.set(ab, bereich);
      let plan = einzelplaene.get(ep);
      if (!plan) {
        plan = leer(ep, ep, erste.einzelplan_name);
        einzelplaene.set(ep, plan);
      }
      plan.kinder.push(bereich);
    }
    bereich.kinder.push(knoten);
  }

  // Summen von unten nach oben.
  for (const plan of einzelplaene.values()) {
    for (const bereich of plan.kinder) {
      for (const e of bereich.kinder) {
        bereich.einnahmen += e.einnahmen;
        bereich.ausgaben += e.ausgaben;
        bereich.investitionen += e.investitionen;
      }
      plan.einnahmen += bereich.einnahmen;
      plan.ausgaben += bereich.ausgaben;
      plan.investitionen += bereich.investitionen;
    }
  }

  return {
    einzelplaene: [...einzelplaene.values()].sort((a, b) => a.id.localeCompare(b.id)),
    summen,
    zwischenstand: zs ? { jahr: zs.jahr, stichtag: zs.stichtag } : null,
  };
}

/** Alle Zeilen der Liste, in der Reihenfolge, in der sie auf der Seite stehen. */
export function gesamtlisteZeilen(liste: Gesamtliste): GesamtZeile[] {
  const out: GesamtZeile[] = [];
  for (const plan of liste.einzelplaene) {
    for (const bereich of plan.kinder) {
      for (const einrichtung of bereich.kinder) out.push(...einrichtung.zeilen);
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
