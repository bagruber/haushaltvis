import { useEffect, useState } from "react";
import { shades, GOLD_BASE, ZUSCHUSS_RED } from "./colors";

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

export interface Data {
  budget: Budget;
  themes: Themes;
  events: BudgetEvent[];
  labels: Labels;
  context: Context;
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
      fetch(`${base}data/labels.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Labels>) : {}))
        .catch(() => ({}) as Labels),
      fetch(`${base}data/context.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Context>) : {}))
        .catch(() => ({}) as Context),
    ]).then(([budget, themes, ev, labels, context]) => ({
      budget,
      themes,
      events: ev.events ?? [],
      labels,
      context,
    }));
  }
  return cache;
}

/** Label for a 3-digit Unterabschnitt group, falling back to Abschnitt name. */
export function groupLabel(labels: Labels, glz: string): string {
  return (
    labels.unterabschnitt?.[glz.slice(0, 3)] ??
    labels.abschnitt?.[glz.slice(0, 2)] ??
    glz.slice(0, 3)
  );
}

export function abschnittName(labels: Labels, ab: string): string {
  return labels.abschnitt?.[ab] ?? ab;
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
  /** theme id, only set on top-level nodes (used for navigation) */
  id?: string;
  itemStyle?: { color: string };
  children?: TreeNode[];
}

/**
 * Weighted expense hierarchy: Theme → Abschnitt. Each Posten's Ansatz for `year`
 * is split across its themes by weight, so totals never double-count. Children
 * are coloured as shades of the theme colour. Shared by treemap/sunburst/circles.
 */
export function expenseTreemap(data: Data, year: number, haushalt?: Haushalt): TreeNode[] {
  const { budget, themes } = data;
  // theme -> abschnitt -> amount
  const acc = new Map<string, Map<string, number>>();
  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== "A") continue;
    if (haushalt && p.haushalt !== haushalt) continue;
    const tags = themes.assignment[f.hhst_id] ?? [];
    const ab = p.glz.slice(0, 2);
    for (const { theme, weight } of tags) {
      if (!acc.has(theme)) acc.set(theme, new Map());
      const inner = acc.get(theme)!;
      inner.set(ab, (inner.get(ab) ?? 0) + f.ansatz * weight);
    }
  }
  const nodes: TreeNode[] = [];
  for (const [theme, inner] of acc) {
    const def = themes.themes[theme];
    const color = def?.color ?? "#999";
    const sorted = [...inner.entries()]
      .map(([ab, v]) => ({ name: abschnittName(data.labels, ab), value: Math.round(v) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    const childShades = shades(color, sorted.length, 0.0, 0.55);
    const children: TreeNode[] = sorted.map((c, i) => ({
      ...c,
      id: theme, // leaves carry their theme id so a click can navigate
      itemStyle: { color: childShades[i] },
    }));
    const total = children.reduce((s, c) => s + c.value, 0);
    if (total <= 0) continue;
    nodes.push({
      name: def?.label ?? theme,
      id: theme,
      value: total,
      itemStyle: { color },
      children,
    });
  }
  return nodes.sort((a, b) => b.value - a.value);
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
export function themeYearSeries(
  data: Data,
  themeId: string,
  ea: EA,
  haushalt?: Haushalt,
): YearSeries {
  const { budget, themes } = data;
  const years = budget.meta.years;
  const aMap = new Map<number, number>();
  const eMap = new Map<number, number>();
  const provisional = new Set<number>();
  for (const f of budget.facts) {
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== ea) continue;
    if (haushalt && p.haushalt !== haushalt) continue;
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

export interface TimeMode {
  perCapita?: boolean;
  real?: boolean;
}

/**
 * Re-express a YearSeries in real terms (deflated to `baseYear` € via CPI)
 * and/or per inhabitant. Missing context for a year yields null (gap).
 */
export function adjustSeries(
  series: YearSeries,
  ctx: Context,
  mode: TimeMode,
  baseYear: number,
): YearSeries {
  const cpiBase = ctx.cpi?.[String(baseYear)];
  const adj = (v: number | null, year: number): number | null => {
    if (v == null) return null;
    let x = v;
    if (mode.real && ctx.cpi && cpiBase) {
      const c = ctx.cpi[String(year)];
      if (!c) return null;
      x = (x * cpiBase) / c;
    }
    if (mode.perCapita) {
      const pop = ctx.population?.[String(year)];
      if (!pop) return null;
      x = x / pop;
    }
    return x;
  };
  return {
    years: series.years,
    ansatz: series.years.map((y, i) => adj(series.ansatz[i], y)),
    ergebnis: series.years.map((y, i) => adj(series.ergebnis[i], y)),
    provisional: series.provisional,
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
  return [...acc.entries()]
    .map(([ab, v]) => ({ key: ab, label: abschnittName(data.labels, ab), value: Math.round(v) }))
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
  haushalt?: Haushalt,
): NamedAmount[] {
  const { budget, themes } = data;
  const out: NamedAmount[] = [];
  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.ea !== ea) continue;
    if (haushalt && p.haushalt !== haushalt) continue;
    const tag = themes.assignment[f.hhst_id]?.find((t) => t.theme === themeId);
    if (!tag) continue;
    const label = [p.grz_text, p.kontotext].filter(Boolean).join(" – ") || p.hhst_id;
    const context = p.glz_text ? ` (${p.glz_text.replace(/\s+/g, " ").trim()})` : "";
    out.push({ key: f.hhst_id, label: label + context, value: Math.round(f.ansatz * tag.weight) });
  }
  return out.sort((a, b) => b.value - a.value).slice(0, limit);
}

// ── Sankey: income sources → Haushalt → expense themes ──────────────────────

/**
 * Internal / technical bookings that would double-count in a cash-flow Sankey:
 * transfers between the two Haushalte, internal cost allocations, reserves,
 * calculatory costs and year-end balancing entries.
 */
export function isInternal(p: Posten): boolean {
  const t = `${p.grz_text ?? ""} ${p.kontotext ?? ""}`.toLowerCase();
  return (
    t.includes("innere verrechnung") ||
    t.includes("kalkulatorisch") ||
    t.includes("zuführung") ||
    t.includes("deckungsreserve") ||
    t.includes("rücklage") ||
    t.includes("abschlusstechni") ||
    t.includes("fehlbetrag") ||
    t.includes("überschuss") ||
    t.includes("haushaltstechnische verrechnung")
  );
}

/**
 * Laien-friendly income category for one Posten, finer than Hauptgruppe:
 * splits the big taxes (Gewerbesteuer, Einkommensteuer-Anteil, …) apart.
 */
export function incomeCategory(p: Posten): string {
  const g = p.grz;
  if (p.haushalt === "vermoegen") {
    if (g.startsWith("34")) return "Vermögensveräußerung";
    if (g.startsWith("36")) return "Investitionszuschüsse";
    if (g.startsWith("377") || g.startsWith("378")) return "Kreditaufnahmen";
    return "Sonstige Investitionseinnahmen";
  }
  // Verwaltungshaushalt income (Hauptgruppen 0, 1, 2)
  // Steuern & allgemeine Zuweisungen (HG 0)
  if (g === "0030") return "Gewerbesteuer";
  if (g === "0000" || g === "0010" || g === "0020") return "Grundsteuer";
  if (g === "0100" || g === "0615") return "Einkommensteuer-Anteil";
  if (g === "0120") return "Umsatzsteuer-Anteil";
  if (g.startsWith("04") || g === "0611") return "Schlüsselzuweisungen & Finanzausgleich";
  if (g[0] === "0") return "Sonstige Steuern & Zuweisungen";
  // Einnahmen aus Verwaltung & Betrieb (HG 1) — aufgedröselt
  if (g === "1111") return "Abwassergebühren";
  if (g === "1171") return "Wassergebühren";
  if (g === "1194" || g === "1195") return "Kita-Beiträge & -Entgelte";
  if (g.startsWith("10")) return "Verwaltungsgebühren";
  if (g.startsWith("11")) return "Sonstige Benutzungsgebühren";
  if (g.startsWith("14")) return "Mieten & Pachten";
  if (g.startsWith("16")) return "Erstattungen";
  if (g.startsWith("17")) return "Zuweisungen & Zuschüsse (laufend)";
  if (g[0] === "1") return "Sonstige Entgelte";
  // Finanzeinnahmen (HG 2)
  if (g.startsWith("22")) return "Konzessionsabgaben";
  return "Zinsen & sonstige Einnahmen";
}

/** Einnahmen grouped into laien-friendly sources (E side, one year). */
export function incomeSources(
  data: Data,
  year: number,
  hideInternal = true,
  haushalt?: Haushalt,
): NamedAmount[] {
  const acc = new Map<string, number>();
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.ea !== "E") continue;
    if (haushalt && p.haushalt !== haushalt) continue;
    if (hideInternal && isInternal(p)) continue;
    const src = incomeCategory(p);
    acc.set(src, (acc.get(src) ?? 0) + f.ansatz);
  }
  return [...acc.entries()]
    .map(([key, value]) => ({ key, label: key, value: Math.round(value) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Weighted Ausgaben per theme (A side, one year). */
export function expenseThemes(
  data: Data,
  year: number,
  hideInternal = true,
  haushalt?: Haushalt,
): NamedAmount[] {
  const acc = new Map<string, number>();
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.ea !== "A") continue;
    if (haushalt && p.haushalt !== haushalt) continue;
    if (hideInternal && isInternal(p)) continue;
    for (const { theme, weight } of data.themes.assignment[f.hhst_id] ?? []) {
      acc.set(theme, (acc.get(theme) ?? 0) + f.ansatz * weight);
    }
  }
  return [...acc.entries()]
    .map(([key, value]) => ({ key, label: data.themes.themes[key]?.label ?? key, value: Math.round(value) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function eventsFor(data: Data, scope: EventScope, id: string): BudgetEvent[] {
  return data.events
    .filter((e) => e.scope === scope && e.id === id)
    .sort((a, b) => a.year - b.year);
}

// ── Theme-scoped Sankey (Verwaltungshaushalt) ───────────────────────────────

export interface SankeyNode {
  name: string;
  itemStyle?: { color: string };
  depth?: number;
}
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  income: number;
  zuschuss: number;
  total: number;
}

const ZUSCHUSS = "Zuschuss aus allg. Haushalt";
const MAX_LEAVES = 6; // per group, before collapsing the tail into "Weitere"

/**
 * Verwaltungshaushalt money flow for one theme, one year:
 *   [income sources + Zuschuss] → [theme hub] → [Unterabschnitt group] → [Posten].
 * Income can't be attributed to individual Posten, so it pools at the hub; the
 * gap between earmarked income and expense is shown as "Zuschuss aus allg. Haushalt".
 * Groups are keyed by 3-digit Unterabschnitt code (not label) so distinct groups
 * never merge; leaf columns are capped to keep the diagram readable.
 */
export function themeSankey(data: Data, themeId: string, year: number): SankeyData {
  const { budget, themes, labels } = data;
  const def = themes.themes[themeId];
  const hub = def?.label ?? themeId;

  const income = new Map<string, number>();
  // 3-digit code -> { total, leaves }
  const groups = new Map<string, { total: number; leaves: Map<string, number> }>();
  let totalEx = 0;

  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.haushalt !== "verwaltung") continue;
    const tag = themes.assignment[f.hhst_id]?.find((t) => t.theme === themeId);
    if (!tag) continue;
    const amt = f.ansatz * tag.weight;
    if (p.ea === "E") {
      if (isInternal(p)) continue;
      const src = incomeCategory(p);
      income.set(src, (income.get(src) ?? 0) + amt);
    } else {
      const code = p.glz.slice(0, 3);
      const leaf = (p.glz_text ?? p.hhst_id).replace(/\s+/g, " ").trim();
      const g = groups.get(code) ?? { total: 0, leaves: new Map() };
      g.total += amt;
      g.leaves.set(leaf, (g.leaves.get(leaf) ?? 0) + amt);
      groups.set(code, g);
      totalEx += amt;
    }
  }

  // Resolve group labels, disambiguating any that collide (shared abschnitt fallback)
  const codes = [...groups.keys()];
  const rawLabel = new Map(codes.map((c) => [c, groupLabel(labels, c)]));
  const labelCount = new Map<string, number>();
  for (const l of rawLabel.values()) labelCount.set(l, (labelCount.get(l) ?? 0) + 1);
  const groupName = new Map(
    codes.map((c) => {
      const l = rawLabel.get(c)!;
      return [c, (labelCount.get(l) ?? 0) > 1 ? `${l} (${c})` : l];
    }),
  );

  const totalIn = [...income.values()].reduce((s, v) => s + v, 0);
  const zuschuss = Math.max(0, totalEx - totalIn);

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const used = new Set<string>();
  const themeColor = def?.color ?? "#999";
  const addNode = (name: string, color: string, depth: number): string => {
    let n = name;
    while (used.has(n)) n += " ";
    used.add(n);
    nodes.push({ name: n, itemStyle: { color }, depth });
    return n;
  };

  // Depths: Zuschuss starts one column further left (0), income at 1, hub 2,
  // groups 3, leaves 4 — so the cross-subsidy reads as a distinct origin.
  const incomeEntries = [...income.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const goldShades = shades(GOLD_BASE, incomeEntries.length);
  if (zuschuss > 0) {
    links.push({ source: addNode(ZUSCHUSS, ZUSCHUSS_RED, 0), target: hub, value: Math.round(zuschuss) });
  }
  incomeEntries.forEach(([src, v], i) => {
    links.push({ source: addNode(src, goldShades[i], 1), target: hub, value: Math.round(v) });
  });
  addNode(hub, themeColor, 2);

  // hub → group → (leaves, capped). Each group a shade of the theme colour,
  // its leaves lighter tints of that shade.
  const groupEntries = [...groups.entries()].sort((a, b) => b[1].total - a[1].total);
  const groupShades = shades(themeColor, groupEntries.length);
  groupEntries.forEach(([code, g], gi) => {
    const gColor = groupShades[gi];
    const gName = addNode(groupName.get(code)!, gColor, 3);
    links.push({ source: hub, target: gName, value: Math.round(g.total) });
    if (g.leaves.size <= 1) return; // single item: group node already represents it

    const sorted = [...g.leaves.entries()].sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, MAX_LEAVES);
    const tail = sorted.slice(MAX_LEAVES);
    const leafShades = shades(gColor, head.length + (tail.length ? 1 : 0), 0.1, 0.55);
    head.forEach(([leaf, v], li) => {
      if (v <= 0) return;
      links.push({ source: gName, target: addNode(leaf, leafShades[li], 4), value: Math.round(v) });
    });
    const rest = tail.reduce((s, [, v]) => s + v, 0);
    if (rest > 0) {
      links.push({
        source: gName,
        target: addNode(`Weitere (${tail.length})`, leafShades[head.length], 4),
        value: Math.round(rest),
      });
    }
  });

  return { nodes, links, income: totalIn, zuschuss, total: totalEx };
}

// ── Net investments (Vermögenshaushalt) ─────────────────────────────────────

export interface Investment {
  glz: string;
  label: string;
  invest: number; // gross expense (HG 9)
  foerderung: number; // earmarked income (HG 3)
  netto: number;
}

function isFinancing(p: Posten): boolean {
  const t = `${p.grz_text ?? ""}`.toLowerCase();
  return (
    p.glz.startsWith("91") ||
    p.glz.startsWith("96") ||
    t.includes("kredit") ||
    t.includes("tilgung") ||
    t.includes("schuldendienst")
  );
}

/**
 * Per-investment net cost for one theme/year: gross expense (HG 9) minus the
 * earmarked funding booked at the same Gliederung (HG 3). Financing/transfer
 * bookings are excluded.
 */
export function investmentNet(data: Data, themeId: string, year: number, limit = 12): Investment[] {
  const { budget, themes } = data;
  const invest = new Map<string, number>();
  const foerder = new Map<string, number>();
  const label = new Map<string, string>();

  for (const f of budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = budget.posten[f.hhst_id];
    if (!p || p.haushalt !== "vermoegen") continue;
    if (isInternal(p) || isFinancing(p)) continue;
    const tag = themes.assignment[f.hhst_id]?.find((t) => t.theme === themeId);
    if (!tag) continue;
    const amt = f.ansatz * tag.weight;
    if (p.grz[0] === "9") invest.set(p.glz, (invest.get(p.glz) ?? 0) + amt);
    else if (p.grz[0] === "3") foerder.set(p.glz, (foerder.get(p.glz) ?? 0) + amt);
    if (p.glz_text && !label.has(p.glz)) label.set(p.glz, p.glz_text.replace(/\s+/g, " ").trim());
  }

  return [...invest.entries()]
    .map(([glz, a]) => {
      const f = foerder.get(glz) ?? 0;
      return {
        glz,
        label: label.get(glz) ?? glz,
        invest: Math.round(a),
        foerderung: Math.round(f),
        netto: Math.round(a - f),
      };
    })
    .filter((x) => x.invest > 0)
    .sort((a, b) => b.invest - a.invest)
    .slice(0, limit);
}
