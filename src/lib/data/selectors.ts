import type { Budget, Data, Posten, EA, Haushalt, ThemeTag, BudgetEvent, EventScope, Context } from "./types";
import { abschnittName, groupLabel } from "./core";
import { shades, GOLD_BASE, ZUSCHUSS_RED, EINZELPLAN_COLORS } from "../colors";


export interface TreeNode {
  name: string;
  value: number;
  /** theme id, only set on top-level nodes (used for navigation) */
  id?: string;
  itemStyle?: { color: string };
  children?: TreeNode[];
}

/**
 * Expense hierarchy Theme → Abschnitt, as a true partition: each Posten counts
 * to its PRIMARY theme only (first tag), so the proportions are honest and don't
 * double-count multi-tagged Posten. Children are shades of the theme colour.
 * Shared by treemap/sunburst/circles.
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
    const theme = themes.assignment[f.hhst_id]?.[0]?.theme;
    if (!theme) continue;
    const ab = p.glz.slice(0, 2);
    if (!acc.has(theme)) acc.set(theme, new Map());
    const inner = acc.get(theme)!;
    inner.set(ab, (inner.get(ab) ?? 0) + f.ansatz);
  }
  const nodes: TreeNode[] = [];
  for (const [theme, inner] of acc) {
    const def = themes.themes[theme];
    const color = def?.color ?? "#999";
    const sorted = [...inner.entries()]
      .map(([ab, v]) => ({ name: abschnittName(data.labels, ab), value: Math.round(v) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    // Child shades are all offset from the base (never identical to the parent):
    // build n+1 shades starting lighter than the base and drop the base itself.
    const childShades = shades(color, sorted.length + 1, 0.14, 0.6).slice(1);
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

// ── Posten (Haushaltsstelle) selectors ──────────────────────────────────────

/** Ansatz/Ergebnis per year for a single Posten (Haushaltsstelle). */
export function postenSeries(data: Data, hhst: string): YearSeries {
  const years = data.budget.meta.years;
  const a = new Map<number, number>();
  const e = new Map<number, number>();
  const provisional = new Set<number>();
  for (const f of data.budget.facts) {
    if (f.hhst_id !== hhst) continue;
    if (f.ansatz != null) a.set(f.year, f.ansatz);
    if (f.ergebnis != null) {
      e.set(f.year, f.ergebnis);
      if (f.provisional) provisional.add(f.year);
    }
  }
  return {
    years,
    ansatz: years.map((y) => (a.has(y) ? a.get(y)! : null)),
    ergebnis: years.map((y) => (e.has(y) ? e.get(y)! : null)),
    provisional,
  };
}

export interface Crumb {
  aufgabenbereich: string;
  bereich: string;
  untergruppe: string;
  einrichtung: string;
}

/** Human-readable path (Aufgabenbereich → Bereich → Einrichtung) for a Posten. */
export function postenCrumb(data: Data, p: Posten): Crumb {
  return {
    aufgabenbereich: `Einzelplan ${p.einzelplan} – ${p.einzelplan_name}`,
    bereich: abschnittName(data.labels, p.glz.slice(0, 2)),
    untergruppe: groupLabel(data.labels, p.glz),
    einrichtung: (p.glz_text ?? p.glz).replace(/\s+/g, " ").trim(),
  };
}

export interface Mover {
  hhst_id: string;
  label: string;
  context: string;
  from: number;
  to: number;
  delta: number;
}

/**
 * Biggest year-over-year Ansatz changes per Posten (highlights "Das fällt auf").
 * Internal/technical lines are excluded.
 */
export function topMovers(data: Data, fromYear: number, toYear: number, limit = 8): Mover[] {
  const prev = new Map<string, number>();
  const cur = new Map<string, number>();
  for (const f of data.budget.facts) {
    if (f.ansatz == null) continue;
    if (f.year === fromYear) prev.set(f.hhst_id, f.ansatz);
    if (f.year === toYear) cur.set(f.hhst_id, f.ansatz);
  }
  const out: Mover[] = [];
  for (const id of new Set([...prev.keys(), ...cur.keys()])) {
    const p = data.budget.posten[id];
    if (!p || isInternal(p)) continue;
    const a = prev.get(id) ?? 0;
    const c = cur.get(id) ?? 0;
    const delta = c - a;
    if (Math.abs(delta) < 50000) continue;
    out.push({
      hhst_id: id,
      label: (p.grz_text ?? id).replace(/\s+/g, " ").trim(),
      context: (p.glz_text ?? "").replace(/\s+/g, " ").trim(),
      from: a,
      to: c,
      delta,
    });
  }
  return out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, limit);
}

// ── Einrichtung (Gliederung) selectors ──────────────────────────────────────

/** All Posten (Haushaltsstellen) belonging to one Gliederung (Einrichtung). */
export function einrichtungPosten(data: Data, glz: string): Posten[] {
  return Object.values(data.budget.posten)
    .filter((p) => p.glz === glz)
    .sort((a, b) => (a.ea === b.ea ? a.grz.localeCompare(b.grz) : a.ea === "A" ? -1 : 1));
}

/** Aggregated Ansatz/Ergebnis per year for one Einrichtung, filtered by E/A and Haushalt. */
export function einrichtungSeries(data: Data, glz: string, ea: EA, haushalt?: Haushalt): YearSeries {
  return aggSeries(data, (p) => p.glz === glz && p.ea === ea && (!haushalt || p.haushalt === haushalt));
}

/** Aggregated Ansatz/Ergebnis per year for one Bereich (2-digit Abschnitt). */
export function bereichSeries(data: Data, ab: string, ea: EA, haushalt?: Haushalt): YearSeries {
  return aggSeries(data, (p) => p.glz.slice(0, 2) === ab && p.ea === ea && (!haushalt || p.haushalt === haushalt));
}

/** Shared aggregation: sum Ansatz/Ergebnis per year over Posten matching `pred`. */
function aggSeries(data: Data, pred: (p: Posten) => boolean): YearSeries {
  const years = data.budget.meta.years;
  const a = new Map<number, number>();
  const e = new Map<number, number>();
  const provisional = new Set<number>();
  for (const f of data.budget.facts) {
    const p = data.budget.posten[f.hhst_id];
    if (!p || !pred(p)) continue;
    if (f.ansatz != null) a.set(f.year, (a.get(f.year) ?? 0) + f.ansatz);
    if (f.ergebnis != null) {
      e.set(f.year, (e.get(f.year) ?? 0) + f.ergebnis);
      if (f.provisional) provisional.add(f.year);
    }
  }
  return {
    years,
    ansatz: years.map((y) => (a.has(y) ? Math.round(a.get(y)!) : null)),
    ergebnis: years.map((y) => (e.has(y) ? Math.round(e.get(y)!) : null)),
    provisional,
  };
}

export interface EinrichtungInfo {
  glz: string;
  label: string;
  crumb: Crumb;
  themes: ThemeTag[];
  hasVermoegen: boolean;
}

/** Identity (label, breadcrumb, themes) for an Einrichtung, or null if unknown. */
export function einrichtungInfo(data: Data, glz: string): EinrichtungInfo | null {
  const posten = einrichtungPosten(data, glz);
  if (!posten.length) return null;
  const rep = posten.find((p) => p.glz_text) ?? posten[0];
  return {
    glz,
    label: (rep.glz_text ?? glz).replace(/\s+/g, " ").trim(),
    crumb: postenCrumb(data, rep),
    themes: data.themes.assignment[posten[0].hhst_id] ?? [],
    hasVermoegen: posten.some((p) => p.haushalt === "vermoegen"),
  };
}

// ── Theme-scoped Sankey (Verwaltungshaushalt) ───────────────────────────────

export interface SankeyNode {
  name: string;
  itemStyle?: { color: string };
  depth?: number;
  label?: { position?: "left" | "right" | "top" | "bottom" | "inside" };
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
  /** node name → navigation target (Einrichtung-Gliederung), for click-through */
  nav: Record<string, string>;
}

const ZUSCHUSS = "Zuschuss aus allg. Haushalt";
const MAX_LEAVES = 7; // per Bereich, before collapsing the tail into "Weitere"

/**
 * Verwaltungshaushalt money flow for one theme, one year:
 *   [income sources + Zuschuss] → [theme hub] → [Bereich] → [Einrichtung].
 * Income can't be attributed to individual Posten, so it pools at the hub; the
 * gap between earmarked income and expense is shown as "Zuschuss aus allg. Haushalt".
 * Expenses group by 2-digit Bereich (Abschnitt, well-labelled) with their
 * Einrichtungen (Gliederungen) as leaves — every branch reaches the leaf column,
 * so single-item Bereiche pull through and bands don't cross.
 */
export function themeSankey(data: Data, themeId: string, year: number): SankeyData {
  const { budget, themes, labels } = data;
  const def = themes.themes[themeId];
  const hub = def?.label ?? themeId;

  const income = new Map<string, number>();
  // 2-digit Bereich -> { total, leaves: glz -> {label, value} }
  const bereiche = new Map<string, { total: number; leaves: Map<string, { label: string; value: number }> }>();
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
      const ab = p.glz.slice(0, 2);
      const b = bereiche.get(ab) ?? { total: 0, leaves: new Map() };
      b.total += amt;
      const label = (p.glz_text ?? p.glz).replace(/\s+/g, " ").trim();
      const leaf = b.leaves.get(p.glz) ?? { label, value: 0 };
      leaf.value += amt;
      b.leaves.set(p.glz, leaf);
      bereiche.set(ab, b);
      totalEx += amt;
    }
  }

  // Bereich labels, disambiguating any that collide (e.g. 21 & 22 both "Schulen")
  const abs = [...bereiche.keys()];
  const rawLabel = new Map(abs.map((ab) => [ab, abschnittName(labels, ab)]));
  const labelCount = new Map<string, number>();
  for (const l of rawLabel.values()) labelCount.set(l, (labelCount.get(l) ?? 0) + 1);
  const bereichName = new Map(
    abs.map((ab) => {
      const l = rawLabel.get(ab)!;
      return [ab, (labelCount.get(l) ?? 0) > 1 ? `${l} (${ab})` : l];
    }),
  );

  const totalIn = [...income.values()].reduce((s, v) => s + v, 0);
  const zuschuss = Math.max(0, totalEx - totalIn);

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nav: Record<string, string> = {};
  const used = new Set<string>();
  const themeColor = def?.color ?? "#999";
  const addNode = (name: string, color: string, depth: number): string => {
    let n = name;
    while (used.has(n)) n += " ";
    used.add(n);
    nodes.push({ name: n, itemStyle: { color }, depth });
    return n;
  };

  // Income and Zuschuss share the left column (depth 0) so the red cross-subsidy
  // band doesn't cross the income column; it's set apart by colour + top position.
  const incomeEntries = [...income.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const goldShades = shades(GOLD_BASE, incomeEntries.length);
  if (zuschuss > 0) {
    links.push({ source: addNode(ZUSCHUSS, ZUSCHUSS_RED, 0), target: hub, value: Math.round(zuschuss) });
  }
  incomeEntries.forEach(([src, v], i) => {
    links.push({ source: addNode(src, goldShades[i], 0), target: hub, value: Math.round(v) });
  });
  addNode(hub, themeColor, 1);

  // hub → Bereich (depth 2) → Einrichtung (depth 3). Each Bereich a shade of the
  // theme colour; its Einrichtungen are lighter tints and link to their detail page.
  const bereichEntries = [...bereiche.entries()].sort((a, b) => b[1].total - a[1].total);
  const bereichShades = shades(themeColor, bereichEntries.length);
  bereichEntries.forEach(([ab, b], bi) => {
    const bColor = bereichShades[bi];
    const bName = addNode(bereichName.get(ab)!, bColor, 2);
    links.push({ source: hub, target: bName, value: Math.round(b.total) });

    const sorted = [...b.leaves.entries()].sort((a, c) => c[1].value - a[1].value);
    const head = sorted.slice(0, MAX_LEAVES);
    const tail = sorted.slice(MAX_LEAVES);
    const leafShades = shades(bColor, head.length + (tail.length ? 1 : 0), 0.1, 0.55);
    head.forEach(([glz, leaf], li) => {
      if (leaf.value <= 0) return;
      const lName = addNode(leaf.label, leafShades[li], 3);
      nav[lName] = glz;
      links.push({ source: bName, target: lName, value: Math.round(leaf.value) });
    });
    const rest = tail.reduce((s, [, l]) => s + l.value, 0);
    if (rest > 0) {
      links.push({
        source: bName,
        target: addNode(`Weitere (${tail.length})`, leafShades[head.length], 3),
        value: Math.round(rest),
      });
    }
  });

  return { nodes, links, income: totalIn, zuschuss, total: totalEx, nav };
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

// ── Kameral exploratory tree (Schiene A) ────────────────────────────────────

const EINZELPLAN_ORDER = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function einzelplanName(data: Data, ep: string): string {
  for (const p of Object.values(data.budget.posten)) if (p.einzelplan === ep) return p.einzelplan_name;
  return `Einzelplan ${ep}`;
}

export interface KameralTree {
  nodes: SankeyNode[];
  links: SankeyLink[];
  nav: Record<string, string>; // node name → Einzelplan id
  total: number;
}

/**
 * Pure expense tree for the exploratory view: Gesamtausgaben → Einzelplan →
 * Bereich. A strict tree (every Bereich has exactly one Einzelplan parent), so
 * the Sankey is planar — no crossing streams. Income is shown on its own pages.
 */
export function kameralExpenseTree(
  data: Data,
  year: number,
  haushalt?: Haushalt,
  capPerEp = 6,
): KameralTree {
  const eps = new Map<string, { total: number; name: string; bereiche: Map<string, number> }>();
  let total = 0;
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.ea !== "A") continue;
    if (haushalt && p.haushalt !== haushalt) continue;
    const e = eps.get(p.einzelplan) ?? { total: 0, name: p.einzelplan_name, bereiche: new Map() };
    e.total += f.ansatz;
    e.bereiche.set(p.glz.slice(0, 2), (e.bereiche.get(p.glz.slice(0, 2)) ?? 0) + f.ansatz);
    eps.set(p.einzelplan, e);
    total += f.ansatz;
  }

  const ROOT = "Gesamtausgaben";
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nav: Record<string, string> = {};
  const used = new Set<string>();
  const addNode = (name: string, color: string, depth: number): string => {
    let n = name;
    while (used.has(n)) n += " ";
    used.add(n);
    nodes.push({ name: n, itemStyle: { color }, depth });
    return n;
  };

  addNode(ROOT, "#a8a193", 0);
  for (const ep of EINZELPLAN_ORDER) {
    const e = eps.get(ep);
    if (!e || e.total <= 0) continue;
    const color = EINZELPLAN_COLORS[ep] ?? "#999";
    const epName = addNode(`${ep} · ${e.name}`, color, 1);
    nav[epName] = ep;
    links.push({ source: ROOT, target: epName, value: Math.round(e.total) });

    const sorted = [...e.bereiche.entries()].sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, capPerEp);
    const tail = sorted.slice(capPerEp);
    const bShades = shades(color, head.length + (tail.length ? 1 : 0), 0.08, 0.55);
    head.forEach(([ab, v], i) => {
      if (v <= 0) return;
      links.push({ source: epName, target: addNode(abschnittName(data.labels, ab), bShades[i], 2), value: Math.round(v) });
    });
    const rest = tail.reduce((s, [, v]) => s + v, 0);
    if (rest > 0) {
      links.push({ source: epName, target: addNode(`Weitere Bereiche (${tail.length})`, bShades[head.length], 2), value: Math.round(rest) });
    }
  }
  return { nodes, links, nav, total };
}

export interface EinrichtungAmount {
  glz: string;
  label: string;
  value: number;
  themes: string[];
}

export interface BereichSection {
  code: string;
  label: string;
  total: number;
  einrichtungen: EinrichtungAmount[];
}

/** For one Einzelplan: its Bereiche, each with Einrichtungen and theme hints. */
export function einzelplanSections(
  data: Data,
  ep: string,
  year: number,
  haushalt?: Haushalt,
): BereichSection[] {
  const bereiche = new Map<string, Map<string, { label: string; value: number }>>();
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.ea !== "A" || p.einzelplan !== ep) continue;
    if (haushalt && p.haushalt !== haushalt) continue;
    const ab = p.glz.slice(0, 2);
    if (!bereiche.has(ab)) bereiche.set(ab, new Map());
    const inner = bereiche.get(ab)!;
    const cur = inner.get(p.glz) ?? { label: (p.glz_text ?? p.glz).replace(/\s+/g, " ").trim(), value: 0 };
    cur.value += f.ansatz;
    inner.set(p.glz, cur);
  }
  const themeOf = (glz: string): string[] => {
    const hh = Object.values(data.budget.posten).find((p) => p.glz === glz);
    if (!hh) return [];
    return (data.themes.assignment[hh.hhst_id] ?? []).map((t) => t.theme);
  };
  return [...bereiche.entries()]
    .map(([code, inner]) => {
      const einrichtungen = [...inner.entries()]
        .map(([glz, x]) => ({ glz, label: x.label, value: Math.round(x.value), themes: themeOf(glz) }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value);
      return {
        code,
        label: abschnittName(data.labels, code),
        total: einrichtungen.reduce((s, e) => s + e.value, 0),
        einrichtungen,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

// ── Both-sides exploratory tree + income page (Schiene A) ────────────────────

/**
 * Top-level money picture: Gesamthaushalt → {Einnahmen, Ausgaben} → {Einnahme-
 * arten | Einzelpläne}. Two subtrees off one root → planar (no bowtie crossing).
 * Internal transfers are excluded so the picture isn't double-counted.
 */
export function kameralBothSidesTree(data: Data, year: number): KameralTree {
  const eps = new Map<string, { total: number; name: string }>();
  const inc = new Map<string, number>();
  let totEx = 0;
  let totIn = 0;
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || isInternal(p)) continue;
    if (p.ea === "A") {
      const e = eps.get(p.einzelplan) ?? { total: 0, name: p.einzelplan_name };
      e.total += f.ansatz;
      eps.set(p.einzelplan, e);
      totEx += f.ansatz;
    } else {
      const c = incomeCategory(p);
      inc.set(c, (inc.get(c) ?? 0) + f.ansatz);
      totIn += f.ansatz;
    }
  }

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nav: Record<string, string> = {};
  const used = new Set<string>();
  const add = (name: string, color: string, depth: number, labelPos?: "left" | "right"): string => {
    let n = name;
    while (used.has(n)) n += " ";
    used.add(n);
    nodes.push({ name: n, itemStyle: { color }, depth, ...(labelPos ? { label: { position: labelPos } } : {}) });
    return n;
  };

  // Bidirectional: Einnahmearten (left, depth 0) → Haushalt (center, depth 1)
  // → Einzelpläne (right, depth 2). A residual balances the two sides so the
  // central node reads cleanly (deficit covered by reserves, or surplus saved).
  const hub = add(`Haushalt ${year}`, "#a8a193", 1);

  const incEntries = [...inc.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const goldShades = shades(GOLD_BASE, incEntries.length);
  incEntries.forEach(([cat, v], i) => {
    const n = add(cat, goldShades[i], 0, "left");
    nav[n] = "/einnahmen";
    links.push({ source: n, target: hub, value: Math.round(v) });
  });
  if (totEx > totIn) {
    const n = add("Rücklagen / Finanzierung", "#b39f7a", 0, "left");
    nav[n] = "/einnahmen";
    links.push({ source: n, target: hub, value: Math.round(totEx - totIn) });
  }

  for (const ep of EINZELPLAN_ORDER) {
    const e = eps.get(ep);
    if (!e || e.total <= 0) continue;
    const n = add(`${ep} · ${e.name}`, EINZELPLAN_COLORS[ep] ?? "#999", 2);
    nav[n] = `/einzelplan/${ep}`;
    links.push({ source: hub, target: n, value: Math.round(e.total) });
  }
  if (totIn > totEx) {
    const n = add("Rücklagenzuführung / Tilgung", "#7d756a", 2);
    links.push({ source: hub, target: n, value: Math.round(totIn - totEx) });
  }

  return { nodes, links, nav, total: Math.max(totIn, totEx) };
}

export interface IncomeGroup {
  key: string;
  label: string;
  value: number;
  posten: NamedAmount[];
}

/** Einnahmen grouped into laien categories, each with its biggest Posten. */
export function incomeByCategory(data: Data, year: number, hideInternal = true): IncomeGroup[] {
  const groups = new Map<string, { value: number; posten: Map<string, { label: string; value: number }> }>();
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.ea !== "E") continue;
    if (hideInternal && isInternal(p)) continue;
    const cat = incomeCategory(p);
    const g = groups.get(cat) ?? { value: 0, posten: new Map() };
    g.value += f.ansatz;
    const label = [p.grz_text, p.glz_text ? `(${p.glz_text.replace(/\s+/g, " ").trim()})` : ""].filter(Boolean).join(" ");
    const cur = g.posten.get(f.hhst_id) ?? { label: label || f.hhst_id, value: 0 };
    cur.value += f.ansatz;
    g.posten.set(f.hhst_id, cur);
    groups.set(cat, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      label: key,
      value: Math.round(g.value),
      posten: [...g.posten.entries()]
        .map(([hhst, x]) => ({ key: hhst, label: x.label, value: Math.round(x.value) }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value),
    }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value);
}

// ── Investitionen (Vermögenshaushalt), global ───────────────────────────────

export interface InvestmentX extends Investment {
  einzelplan: string;
}

export interface InvestmentsAll {
  items: InvestmentX[];
  totalInvest: number;
  totalFoerder: number;
}

/**
 * All real investments (Vermögenshaushalt, HG 9) per Einrichtung with their
 * earmarked income/Förderung (HG 3, excluding general financing & internal
 * transfers) and the net own contribution. Not theme-scoped.
 */
export function investmentsAll(data: Data, year: number): InvestmentsAll {
  const invest = new Map<string, number>();
  const foerder = new Map<string, number>();
  const label = new Map<string, string>();
  const ep = new Map<string, string>();

  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.haushalt !== "vermoegen") continue;
    if (isInternal(p) || isFinancing(p)) continue;
    if (p.grz[0] === "9") invest.set(p.glz, (invest.get(p.glz) ?? 0) + f.ansatz);
    else if (p.grz[0] === "3") foerder.set(p.glz, (foerder.get(p.glz) ?? 0) + f.ansatz);
    if (p.glz_text && !label.has(p.glz)) label.set(p.glz, p.glz_text.replace(/\s+/g, " ").trim());
    if (!ep.has(p.glz)) ep.set(p.glz, p.einzelplan);
  }

  const items = [...invest.entries()]
    .map(([glz, a]) => {
      const fo = foerder.get(glz) ?? 0;
      return {
        glz,
        label: label.get(glz) ?? glz,
        einzelplan: ep.get(glz) ?? glz[0],
        invest: Math.round(a),
        foerderung: Math.round(fo),
        netto: Math.round(a - fo),
      };
    })
    .filter((x) => x.invest > 0)
    .sort((a, b) => b.invest - a.invest);

  return {
    items,
    totalInvest: items.reduce((s, x) => s + x.invest, 0),
    totalFoerder: items.reduce((s, x) => s + x.foerderung, 0),
  };
}

// ── Income-category time series + stacked investments ───────────────────────

/** Ansatz/Ergebnis per year for one income category (e.g. "Gewerbesteuer"). */
export function incomeCategorySeries(data: Data, category: string): YearSeries {
  return aggSeries(data, (p) => p.ea === "E" && !isInternal(p) && incomeCategory(p) === category);
}

export interface StackSeries {
  name: string;
  color: string;
  data: number[];
}
export interface InvestmentStacked {
  years: number[];
  series: StackSeries[];
}

/**
 * Investment (Vermögenshaushalt, HG 9) per year, stacked by Thema. The biggest
 * single Vorhaben get their own shade of the theme colour; the rest of each
 * theme is pooled into "Sonstige <Thema>". Multi-themed Vorhaben use their first
 * (primary) theme so the stack stays a true partition of the total.
 */
export function investmentStacked(data: Data, topN = 12): InvestmentStacked {
  const years = data.budget.meta.years;
  const themeOfGlz = new Map<string, string>();
  const items = new Map<string, { label: string; theme: string; year: Map<number, number>; total: number }>();

  for (const f of data.budget.facts) {
    if (f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.haushalt !== "vermoegen" || isInternal(p) || isFinancing(p) || p.grz[0] !== "9") continue;
    if (!themeOfGlz.has(p.glz)) themeOfGlz.set(p.glz, data.themes.assignment[p.hhst_id]?.[0]?.theme ?? "verwaltung_finanzen");
    const it = items.get(p.glz) ?? { label: (p.glz_text ?? p.glz).replace(/\s+/g, " ").trim(), theme: themeOfGlz.get(p.glz)!, year: new Map(), total: 0 };
    it.year.set(f.year, (it.year.get(f.year) ?? 0) + f.ansatz);
    it.total += f.ansatz;
    items.set(p.glz, it);
  }

  const all = [...items.values()].filter((i) => i.total > 0).sort((a, b) => b.total - a.total);
  const top = all.slice(0, topN);
  const rest = all.slice(topN);

  // group: theme → { tops, restYear, total }
  type Item = (typeof all)[number];
  interface ThemeGroup { tops: Item[]; restYear: Map<number, number>; total: number }
  const byTheme = new Map<string, ThemeGroup>();
  const group = (theme: string): ThemeGroup => {
    let g = byTheme.get(theme);
    if (!g) { g = { tops: [], restYear: new Map(), total: 0 }; byTheme.set(theme, g); }
    return g;
  };
  for (const it of top) {
    const g = group(it.theme);
    g.tops.push(it);
    g.total += it.total;
  }
  for (const it of rest) {
    const g = group(it.theme);
    for (const [y, v] of it.year) g.restYear.set(y, (g.restYear.get(y) ?? 0) + v);
    g.total += it.total;
  }

  const series: StackSeries[] = [];
  const themesSorted = [...byTheme.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [theme, g] of themesSorted) {
    const base = data.themes.themes[theme]?.color ?? "#999";
    const label = data.themes.themes[theme]?.label ?? theme;
    const n = g.tops.length + (g.restYear.size ? 1 : 0);
    const sh = shades(base, n, -0.1, 0.55);
    let i = 0;
    for (const it of g.tops) {
      series.push({ name: it.label, color: sh[i++], data: years.map((y) => Math.round(it.year.get(y) ?? 0)) });
    }
    if (g.restYear.size) {
      series.push({ name: `Sonstige · ${label}`, color: sh[i], data: years.map((y) => Math.round(g.restYear.get(y) ?? 0)) });
    }
  }
  return { years, series };
}

// ── Search index (real-name entities only) ──────────────────────────────────

export interface SearchItem {
  label: string;
  sub: string;
  route: string;
}

/** Searchable entities with everyday names: Themen, Einzelpläne, Einrichtungen. */
export function searchIndex(data: Data): SearchItem[] {
  const items: SearchItem[] = [];
  for (const [id, t] of Object.entries(data.themes.themes)) {
    items.push({ label: t.label, sub: "Thema", route: `/themen/${id}` });
  }
  const eps = new Map<string, string>();
  for (const p of Object.values(data.budget.posten)) if (!eps.has(p.einzelplan)) eps.set(p.einzelplan, p.einzelplan_name);
  for (const [ep, name] of [...eps].sort()) {
    items.push({ label: `${ep} · ${name}`, sub: "Einzelplan", route: `/einzelplan/${ep}` });
  }
  const seen = new Set<string>();
  for (const p of Object.values(data.budget.posten)) {
    if (p.glz_text && !seen.has(p.glz)) {
      seen.add(p.glz);
      items.push({ label: p.glz_text.replace(/\s+/g, " ").trim(), sub: "Einrichtung", route: `/einrichtung/${p.glz}` });
    }
  }
  return items;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Rank search items for a query: prefix matches first, then substring, shortest first. */
export function searchRank(items: SearchItem[], query: string, limit = 10): SearchItem[] {
  const q = norm(query.trim());
  if (!q) return [];
  const scored: { it: SearchItem; score: number }[] = [];
  for (const it of items) {
    const l = norm(it.label);
    const i = l.indexOf(q);
    if (i < 0) continue;
    scored.push({ it, score: (i === 0 ? 0 : 100) + i + l.length * 0.01 });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.it);
}

// ── "Wofür zahle ich?" — expense share by primary theme ─────────────────────

export interface ShareNode {
  label: string;
  amount: number;
  share: number;
}
export interface ThemeShare extends ShareNode {
  theme: string;
  color: string;
  /** one level deeper: Bereiche contributing to this theme (primary) */
  children: ShareNode[];
}

/**
 * Expense split as a true partition (each Posten counts to its PRIMARY theme
 * only), so the shares sum to 100%. Each theme carries its Bereiche one level
 * deeper. Internal transfers excluded. Drives the "Wofür zahle ich?" calculator.
 */
export function expenseShareByPrimaryTheme(data: Data, year: number): ThemeShare[] {
  const acc = new Map<string, { amount: number; bereiche: Map<string, number> }>();
  let total = 0;
  for (const f of data.budget.facts) {
    if (f.year !== year || f.ansatz == null) continue;
    const p = data.budget.posten[f.hhst_id];
    if (!p || p.ea !== "A" || isInternal(p)) continue;
    const primary = data.themes.assignment[f.hhst_id]?.[0]?.theme ?? "verwaltung_finanzen";
    const t = acc.get(primary) ?? { amount: 0, bereiche: new Map() };
    t.amount += f.ansatz;
    const ab = p.glz.slice(0, 2);
    t.bereiche.set(ab, (t.bereiche.get(ab) ?? 0) + f.ansatz);
    acc.set(primary, t);
    total += f.ansatz;
  }
  return [...acc.entries()]
    .map(([theme, t]) => ({
      theme,
      label: data.themes.themes[theme]?.label ?? theme,
      color: data.themes.themes[theme]?.color ?? "#999",
      amount: Math.round(t.amount),
      share: total ? t.amount / total : 0,
      children: [...t.bereiche.entries()]
        .map(([ab, v]) => ({ label: abschnittName(data.labels, ab), amount: Math.round(v), share: total ? v / total : 0 }))
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}
