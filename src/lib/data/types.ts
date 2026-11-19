// ── Types mirroring the ETL output (see etl/*.py) ───────────────────────────
export type Haushalt = "verwaltung" | "vermoegen";
export type EA = "E" | "A";

export interface Posten {
  hhst_id: string;
  einzelplan: string;
  einzelplan_name: string;
  glz: string;
  grz: string;
  glz_text: string | null;
  grz_text: string | null;
  kontotext: string | null;
  ea: EA;
  haushalt: Haushalt;
}

export interface Fact {
  hhst_id: string;
  year: number;
  ansatz: number | null;
  ergebnis: number | null;
  provisional: boolean;
}

export interface Budget {
  meta: {
    years: number[];
    sources: Record<string, string>;
    note?: string;
    /** Set by the loader when data/entwurf.json supplies a draft year (see core.ts). */
    entwurf?: EntwurfStand;
  };
  posten: Record<string, Posten>;
  facts: Fact[];
}

/** Which year is a draft, and how current it is. */
export interface EntwurfStand {
  jahr: number;
  /** ISO date of the Arbeitsplan, e.g. "2026-11-13" */
  stand: string;
  quelle: string;
}

/**
 * data/entwurf.json (etl/entwurf.py): the Kämmerei's Arbeitsplan for the
 * coming year. Optional; without it the year does not exist in the app.
 */
export interface EntwurfDatei extends EntwurfStand {
  /** Ansatz per Haushaltsstelle, one entry for every row of the Arbeitsplan */
  ansatz: Record<string, number>;
  /** Haushaltsstellen budget.json does not know yet */
  posten: Record<string, Posten>;
  /** first year of the Finanzplan */
  finanzplan: { jahr: number; ansatz: Record<string, number> };
}

/**
 * data/erlaeuterungen.json (etl/erlaeuterungen.py): was die Kämmerei im
 * Arbeitsplan zu einem Ansatz notiert hat, so weit gesichtet. `text` steht
 * wörtlich und nur, wo es gezeigt werden soll; `such` sind Suchwörter, unter
 * denen die Stelle gefunden wird. Optional; ohne Datei beides weg.
 */
export interface Erlaeuterungen {
  jahr: number;
  stand: string;
  quelle: string;
  stellen: Record<string, { text?: string[]; such?: string[] }>;
}

export interface ThemeDef {
  label: string;
  color: string;
  description: string;
}

export interface ThemeTag {
  theme: string;
  weight: number;
}

export interface Themes {
  themes: Record<string, ThemeDef>;
  assignment: Record<string, ThemeTag[]>;
}

export type EventScope = "theme" | "abschnitt" | "hhst";

export interface BudgetEvent {
  scope: EventScope;
  id: string; // theme id, 2-digit Abschnitt, or hhst_id
  year: number;
  title: string;
  text?: string;
}

export interface Labels {
  abschnitt?: Record<string, string>;
  unterabschnitt?: Record<string, string>;
}

export interface Context {
  population?: Record<string, number>;
  cpi?: Record<string, number>;
  /** monthly price index, keyed "2025-12", for Ansatz-to-Ansatz changes */
  vpi_monat?: Record<string, number>;
}

/**
 * Vollzug eines Jahres zu einem Stichtag (etl/zwischenstand.py), je
 * Haushaltsstelle [Soll, Ist] — gebucht und bezahlt. Die Datei trägt mehrere
 * Jahre zum selben Stichtag, damit sich das laufende Jahr mit dem Vorjahr
 * vergleichen lässt. Eigene Datei: fehlt sie, sind die Marken in der App weg.
 */
export interface Zwischenstand {
  jahr: number;
  /** ISO-Datum des Stichtags, z. B. "2026-10-01" */
  stichtag: string;
  quelle: string;
  werte: Record<string, [number, number]>;
}

export interface GlossarEntry {
  title: string;
  text: string;
}

/** A cross-cutting cost block (etl/aggregatoren.yaml → aggregatoren.json). */
export interface Aggregator {
  title: string;
  /** "struktur" = exact from Gruppierungsplan, "stichwort" = keyword heuristic */
  art: "struktur" | "stichwort" | string;
  kriterium: string;
  beschreibung: string;
  /** member Haushaltsstellen (for the auditable drilldown) */
  hhst: string[];
  /** per-year sums, keyed by year string */
  reihe: Record<string, { ansatz: number; ergebnis: number; prov: boolean }>;
}

export interface Data {
  budget: Budget;
  themes: Themes;
  events: BudgetEvent[];
  labels: Labels;
  context: Context;
  /** editorial intro texts, keyed e.g. "ep:2" (Einzelplan) or "ab:21" (Bereich) */
  einleitungen: Record<string, string>;
  /** glossary term id → { title, text } */
  glossar: Record<string, GlossarEntry>;
  /** cross-cutting cost blocks, keyed by aggregator id */
  aggregatoren: Record<string, Aggregator>;
  /** Vollzug zum Stichtag, nach Jahr und Stichtag aufsteigend — leer, solange es keinen gibt */
  zwischenstand: Zwischenstand[];
  /** Finanzplan des Jahres nach dem Entwurf, nur mit data/entwurf.json */
  finanzplan?: { jahr: number; ansatz: Record<string, number> };
  /** Erläuterungen der Kämmerei zum Entwurf, nur mit data/erlaeuterungen.json */
  erlaeuterungen?: Erlaeuterungen;
}
