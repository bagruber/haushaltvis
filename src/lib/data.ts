import { useEffect, useState } from "react";

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

export interface Data {
  budget: Budget;
  themes: Themes;
  events: BudgetEvent[];
}

// ── Loader (cached) ─────────────────────────────────────────────────────────
const base = import.meta.env.BASE_URL;
let cache: Promise<Data> | null = null;

export function loadData(): Promise<Data> {
  if (!cache) {
    cache = Promise.all([
      fetch(`${base}data/budget.json`).then((r) => r.json() as Promise<Budget>),
      fetch(`${base}data/themes.json`).then((r) => r.json() as Promise<Themes>),
      fetch(`${base}data/events.json`)
        .then((r) => (r.ok ? (r.json() as Promise<{ events: BudgetEvent[] }>) : { events: [] }))
        .catch(() => ({ events: [] })),
    ]).then(([budget, themes, ev]) => ({ budget, themes, events: ev.events ?? [] }));
  }
  return cache;
}

export function useData() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let alive = true;
    loadData().then(
      (d) => alive && setData(d),
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}

// ── Selectors ───────────────────────────────────────────────────────────────

/** Best available value for a fact: Ansatz preferred, else Ergebnis. */
export function value(f: Fact): number {
  return f.ansatz ?? f.ergebnis ?? 0;
}

/** Latest year that has any data. */
export function latestYear(b: Budget): number {
  return Math.max(...b.meta.years);
}

export interface TreeNode {
  name: string;
  value: number;
  itemStyle?: { color: string };
  children?: TreeNode[];
}

/**
 * Weighted expense treemap: Theme → Abschnitt. Each Posten's Ansatz for `year`
 * is split across its themes by weight, so totals never double-count.
 */
export function expenseTreemap(data: Data, year: number): TreeNode[] {
  const { budget, themes } = data;
  // theme -> abschnitt -> amount
  const acc = new Map<string, Map<string, number>>();
  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== "A") continue;
    const tags = themes.assignment[f.hhst_id] ?? [];
    const ab = p.glz.slice(0, 2);
    for (const { theme, weight } of tags) {
      if (!acc.has(theme)) acc.set(theme, new Map());
      const inner = acc.get(theme)!;
      inner.set(ab, (inner.get(ab) ?? 0) + f.ansatz * weight);
    }
  }
  // abschnitt label lookup (first Posten text)
  const abLabel = abschnittLabels(budget);
  const nodes: TreeNode[] = [];
  for (const [theme, inner] of acc) {
    const def = themes.themes[theme];
    const children = [...inner.entries()]
      .map(([ab, v]) => ({ name: abLabel.get(ab) ?? ab, value: Math.round(v) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = children.reduce((s, c) => s + c.value, 0);
    if (total <= 0) continue;
    nodes.push({
      name: def?.label ?? theme,
      value: total,
      itemStyle: { color: def?.color ?? "#999" },
      children,
    });
  }
  return nodes.sort((a, b) => b.value - a.value);
}

function abschnittLabels(b: Budget): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of Object.values(b.posten)) {
    const ab = p.glz.slice(0, 2);
    if (p.glz_text && !m.has(ab)) m.set(ab, p.glz_text.replace(/\s+/g, " ").trim());
  }
  return m;
}

export interface Totals {
  einnahmen: number;
  ausgaben: number;
}

/** Total Einnahmen / Ausgaben (Ansatz) for a year across both Haushalte. */
export function totals(b: Budget, year: number): Totals {
  let einnahmen = 0;
  let ausgaben = 0;
  for (const f of b.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = b.posten[f.hhst_id];
    if (!p) continue;
    if (p.ea === "E") einnahmen += f.ansatz;
    else ausgaben += f.ansatz;
  }
  return { einnahmen, ausgaben };
}

// ── Theme detail selectors ──────────────────────────────────────────────────

export interface YearSeries {
  years: number[];
  ansatz: (number | null)[];
  ergebnis: (number | null)[];
  /** years for which ergebnis is provisional Ist (e.g. 2024) */
  provisional: Set<number>;
}

/**
 * Weighted Ansatz/Ergebnis per year for one theme, filtered by E/A.
 * Each Posten contributes amount × theme-weight, so no double-counting.
 */
export function themeYearSeries(data: Data, themeId: string, ea: EA): YearSeries {
  const { budget, themes } = data;
  const years = budget.meta.years;
  const aMap = new Map<number, number>();
  const eMap = new Map<number, number>();
  const provisional = new Set<number>();
  for (const f of budget.facts) {
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== ea) continue;
    const tag = themes.assignment[f.hhst_id]?.find((t) => t.theme === themeId);
    if (!tag) continue;
    if (f.ansatz != null) aMap.set(f.year, (aMap.get(f.year) ?? 0) + f.ansatz * tag.weight);
    if (f.ergebnis != null) {
      eMap.set(f.year, (eMap.get(f.year) ?? 0) + f.ergebnis * tag.weight);
      if (f.provisional) provisional.add(f.year);
    }
  }
  return {
    years,
    ansatz: years.map((y) => (aMap.has(y) ? Math.round(aMap.get(y)!) : null)),
    ergebnis: years.map((y) => (eMap.has(y) ? Math.round(eMap.get(y)!) : null)),
    provisional,
  };
}

export interface NamedAmount {
  key: string;
  label: string;
  value: number;
}

/** Whether a theme has meaningful Einnahmen (to decide if the E/A toggle matters). */
export function themeHasEinnahmen(data: Data, themeId: string, year: number): boolean {
  return breakdownByAbschnitt(data, themeId, "E", year).reduce((s, x) => s + x.value, 0) > 0;
}

/** Weighted amounts per Abschnitt for a theme (one year, given E/A), sorted desc. */
export function breakdownByAbschnitt(
  data: Data,
  themeId: string,
  ea: EA,
  year: number,
): NamedAmount[] {
  const { budget, themes } = data;
  const acc = new Map<string, number>();
  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== ea) continue;
    const tag = themes.assignment[f.hhst_id]?.find((t) => t.theme === themeId);
    if (!tag) continue;
    const ab = p.glz.slice(0, 2);
    acc.set(ab, (acc.get(ab) ?? 0) + f.ansatz * tag.weight);
  }
  const labels = abschnittLabels(budget);
  return [...acc.entries()]
    .map(([ab, v]) => ({ key: ab, label: labels.get(ab) ?? ab, value: Math.round(v) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Top individual Posten for a theme (one year, given E/A) — drives the explanation text. */
export function topPosten(
  data: Data,
  themeId: string,
  ea: EA,
  year: number,
  limit = 8,
): NamedAmount[] {
  const { budget, themes } = data;
  const out: NamedAmount[] = [];
  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== ea) continue;
    const tag = themes.assignment[f.hhst_id]?.find((t) => t.theme === themeId);
    if (!tag) continue;
    const label = [p.grz_text, p.kontotext].filter(Boolean).join(" – ") || p.hhst_id;
    const context = p.glz_text ? ` (${p.glz_text.replace(/\s+/g, " ").trim()})` : "";
    out.push({ key: f.hhst_id, label: label + context, value: Math.round(f.ansatz * tag.weight) });
  }
  return out.sort((a, b) => b.value - a.value).slice(0, limit);
}

export function eventsFor(data: Data, scope: EventScope, id: string): BudgetEvent[] {
  return data.events
    .filter((e) => e.scope === scope && e.id === id)
    .sort((a, b) => a.year - b.year);
}
