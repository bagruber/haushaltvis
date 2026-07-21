import { useEffect, useState } from "react";
import type { Budget, Data, Fact, Labels, Posten, Themes, ThemeTag, BudgetEvent, Context } from "./types";

// ── Loader (cached) ─────────────────────────────────────────────────────────
const base = import.meta.env.BASE_URL;
let cache: Promise<Data> | null = null;

/** Required file: a missing/broken response is a real error, not an empty default. */
function required<T>(path: string): Promise<T> {
  return fetch(`${base}${path}`).then((r) => {
    if (!r.ok) throw new Error(`Datendatei ${path} konnte nicht geladen werden (HTTP ${r.status}).`);
    return r.json() as Promise<T>;
  });
}

/** Optional file: missing/broken → the provided empty default (never an error). */
function optional<T>(path: string, empty: T): Promise<T> {
  return fetch(`${base}${path}`).then((r) => (r.ok ? (r.json() as Promise<T>) : empty)).catch(() => empty);
}

/**
 * Export shape of the classification tool (/intern/zuordnung). Drop this file in
 * as data/zuordnung.json and the app adopts it at runtime — no build needed.
 */
export interface Zuordnung {
  unterabschnitt?: { verwaltung?: Record<string, string[]>; vermoegen?: Record<string, string[]> };
  posten?: Record<string, string[]>;
}

function zuordnungHasContent(z: Zuordnung): boolean {
  const ua = z.unterabschnitt ?? {};
  return Object.keys(ua.verwaltung ?? {}).length > 0 || Object.keys(ua.vermoegen ?? {}).length > 0 || Object.keys(z.posten ?? {}).length > 0;
}

/**
 * Resolve per-Posten themes from a swapped-in Zuordnung: each Posten gets the
 * union of its own (hhst) tags and its Unterabschnitt (glz) tags for its Haushalt.
 */
function resolveAssignment(budget: Budget, z: Zuordnung): Record<string, ThemeTag[]> {
  const ua = z.unterabschnitt ?? {};
  const posten = z.posten ?? {};
  const out: Record<string, ThemeTag[]> = {};
  for (const p of Object.values(budget.posten)) {
    const level = p.haushalt === "vermoegen" ? ua.vermoegen : ua.verwaltung;
    const set = new Set<string>([...(level?.[p.glz] ?? []), ...(posten[p.hhst_id] ?? [])]);
    if (set.size) out[p.hhst_id] = [...set].map((theme) => ({ theme, weight: 1 }));
  }
  return out;
}

export function loadData(): Promise<Data> {
  if (!cache) {
    cache = Promise.all([
      required<Budget>("data/budget.json"),
      required<Themes>("data/themes.json"),
      optional<{ events: BudgetEvent[] }>("data/events.json", { events: [] }),
      optional<Labels>("data/labels.json", {}),
      optional<Context>("data/context.json", {}),
      optional<Record<string, string>>("data/einleitungen.json", {}),
      optional<Record<string, import("./types").GlossarEntry>>("data/glossar.json", {}),
      optional<Record<string, import("./types").Aggregator>>("data/aggregatoren.json", {}),
      optional<Zuordnung>("data/zuordnung.json", {}),
    ]).then(([budget, themes, ev, labels, context, einleitungen, glossar, aggregatoren, zuordnung]) => {
      // A dropped-in Zuordnung (from the tool) wins over the baked assignment.
      const merged: Themes =
        zuordnungHasContent(zuordnung)
          ? { ...themes, assignment: resolveAssignment(budget, zuordnung) }
          : themes;
      return { budget, themes: merged, events: ev.events ?? [], labels, context, einleitungen, glossar, aggregatoren };
    });
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

// ── Indexes ─────────────────────────────────────────────────────────────────
// Selectors are called per render; a full scan over all facts each time adds up.
// Indexes are built once per Budget object and cached via WeakMap.

interface BudgetIndex {
  factsByYear: Map<number, Fact[]>;
  factsByHhst: Map<string, Fact[]>;
  postenByGlz: Map<string, Posten[]>;
}

const indexCache = new WeakMap<Budget, BudgetIndex>();

function getIndex(b: Budget): BudgetIndex {
  let idx = indexCache.get(b);
  if (!idx) {
    const factsByYear = new Map<number, Fact[]>();
    const factsByHhst = new Map<string, Fact[]>();
    for (const f of b.facts) {
      let byYear = factsByYear.get(f.year);
      if (!byYear) factsByYear.set(f.year, (byYear = []));
      byYear.push(f);
      let byHhst = factsByHhst.get(f.hhst_id);
      if (!byHhst) factsByHhst.set(f.hhst_id, (byHhst = []));
      byHhst.push(f);
    }
    const postenByGlz = new Map<string, Posten[]>();
    for (const p of Object.values(b.posten)) {
      let list = postenByGlz.get(p.glz);
      if (!list) postenByGlz.set(p.glz, (list = []));
      list.push(p);
    }
    idx = { factsByYear, factsByHhst, postenByGlz };
    indexCache.set(b, idx);
  }
  return idx;
}

const EMPTY_FACTS: readonly Fact[] = [];
const EMPTY_POSTEN: readonly Posten[] = [];

/** All facts of one year. */
export function factsOfYear(b: Budget, year: number): readonly Fact[] {
  return getIndex(b).factsByYear.get(year) ?? EMPTY_FACTS;
}

/** All facts of one Posten (Haushaltsstelle). */
export function factsOfHhst(b: Budget, hhst: string): readonly Fact[] {
  return getIndex(b).factsByHhst.get(hhst) ?? EMPTY_FACTS;
}

/** All Posten of one Gliederung (Einrichtung). */
export function postenOfGlz(b: Budget, glz: string): readonly Posten[] {
  return getIndex(b).postenByGlz.get(glz) ?? EMPTY_POSTEN;
}
