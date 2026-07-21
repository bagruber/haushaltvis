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
  meta: { years: number[]; sources: Record<string, string>; note?: string };
  posten: Record<string, Posten>;
  facts: Fact[];
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
}
