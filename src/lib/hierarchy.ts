// Canonical names for the budget hierarchy levels — one user-facing label per
// kameral level, so UI, URLs and code stay consistent. See also the table in
// the Info page and memory/hierarchy-naming.
//
//   Thema           cross-cutting theme layer (own dimension)        theme id
//   Aufgabenbereich Einzelplan          GLZ 1-stellig
//   Bereich         Abschnitt           GLZ 2-stellig
//   Untergruppe     Unterabschnitt      GLZ 3-stellig
//   Einrichtung     Gliederung          GLZ 4–5-stellig
//   Posten          Haushaltsstelle     GLZ.GRZ

export const LEVELS = {
  thema: "Thema",
  aufgabenbereich: "Aufgabenbereich",
  bereich: "Bereich",
  untergruppe: "Untergruppe",
  einrichtung: "Einrichtung",
  posten: "Posten",
} as const;

export type LevelKey = keyof typeof LEVELS;
