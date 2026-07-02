import { useEffect, useState } from "react";
import type { Budget, Data, Fact, Labels, Posten, Themes, BudgetEvent, Context } from "./types";

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

export function loadData(): Promise<Data> {
  if (!cache) {
    cache = Promise.all([
      required<Budget>("data/budget.json"),
      required<Themes>("data/themes.json"),
      fetch(`${base}data/events.json`)
        .then((r) => (r.ok ? (r.json() as Promise<{ events: BudgetEvent[] }>) : { events: [] }))
        .catch(() => ({ events: [] })),
      fetch(`${base}data/labels.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Labels>) : {}))
        .catch(() => ({}) as Labels),
      fetch(`${base}data/context.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Context>) : {}))
        .catch(() => ({}) as Context),
      fetch(`${base}data/einleitungen.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
        .catch(() => ({}) as Record<string, string>),
      fetch(`${base}data/glossar.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
        .catch(() => ({}) as Record<string, string>),
    ]).then(([budget, themes, ev, labels, context, einleitungen, glossar]) => ({
      budget,
      themes,
      events: ev.events ?? [],
      labels,
      context,
      einleitungen,
      glossar,
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
