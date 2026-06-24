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

export interface Data {
  budget: Budget;
  themes: Themes;
}

// ── Loader (cached) ─────────────────────────────────────────────────────────
const base = import.meta.env.BASE_URL;
let cache: Promise<Data> | null = null;

export function loadData(): Promise<Data> {
  if (!cache) {
    cache = Promise.all([
      fetch(`${base}data/budget.json`).then((r) => r.json() as Promise<Budget>),
      fetch(`${base}data/themes.json`).then((r) => r.json() as Promise<Themes>),
    ]).then(([budget, themes]) => ({ budget, themes }));
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
