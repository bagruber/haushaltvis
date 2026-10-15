// Die Gesamtliste ist die Sicht, die mit dem amtlichen Plan vergleichbar sein
// muss. Jede Zahl hier ist eine, die jemand in der Sitzung nachrechnet.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Budget, Data, Themes, Zwischenstand } from "./types";
import { latestYear } from "./core";
import { gesamtliste, gesamtlisteCsv, gesamtlisteZeilen, type GesamtZeile } from "./gesamtliste";

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(__dirname, `../../../public/data/${name}`), "utf8")) as T;
const readOptional = <T>(name: string): T | null => {
  try {
    return read<T>(name);
  } catch {
    return null;
  }
};

const budget = read<Budget>("budget.json");
const data: Data = {
  budget,
  themes: read<Themes>("themes.json"),
  events: [],
  labels: read("labels.json"),
  context: read("context.json"),
  einleitungen: {},
  glossar: {},
  aggregatoren: {},
  zwischenstand: readOptional<Zwischenstand>("zwischenstand.json"),
};
const jahr = latestYear(budget);
const liste = gesamtliste(data, jahr);

describe("Gesamtliste", () => {
  it("der kamerale Haushaltsausgleich geht auf: Einnahmen = Ausgaben, je Haushalt", () => {
    expect(liste.summen.verwaltung.einnahmen).toBeCloseTo(liste.summen.verwaltung.ausgaben, 2);
    expect(liste.summen.vermoegen.einnahmen).toBeCloseTo(liste.summen.vermoegen.ausgaben, 2);
    expect(liste.summen.verwaltung.ausgaben).toBeGreaterThan(0);
  });

  it("die Summen sind die Summen der Zeilen, nicht nebenher gerechnet", () => {
    const zeilen = gesamtlisteZeilen(liste);
    const summe = { verwaltung: 0, vermoegen: 0 };
    for (const z of zeilen) if (z.ea === "A") summe[z.haushalt] += z.werte.ansatz ?? 0;
    expect(summe.verwaltung).toBeCloseTo(liste.summen.verwaltung.ausgaben, 2);
    expect(summe.vermoegen).toBeCloseTo(liste.summen.vermoegen.ausgaben, 2);
  });

  it("jede Haushaltsstelle steht genau einmal", () => {
    const zeilen = gesamtlisteZeilen(liste);
    expect(new Set(zeilen.map((z) => z.hhst)).size).toBe(zeilen.length);
    expect(zeilen.length).toBe(Object.keys(budget.posten).length);
  });

  it("die Reihenfolge ist streng aufsteigend: Einrichtungen, dann Haushaltsstellen", () => {
    const ordnung = (glz: string) => glz.padEnd(5, "0");
    for (const plan of liste.einzelplaene) {
      for (const bereich of plan.kinder) {
        const glzs = bereich.kinder.map((e) => e.id);
        expect([...glzs].sort((a, b) => ordnung(a).localeCompare(ordnung(b)))).toEqual(glzs);
        for (const e of bereich.kinder) {
          const hhsts = e.zeilen.map((z) => z.hhst);
          expect([...hhsts].sort()).toEqual(hhsts);
        }
      }
    }
  });

  it("die Ebenen tragen die Summen ihrer Kinder", () => {
    for (const plan of liste.einzelplaene) {
      const kinder = plan.kinder.reduce((s, b) => s + b.ausgaben, 0);
      expect(plan.ausgaben).toBeCloseTo(kinder, 2);
      for (const bereich of plan.kinder) {
        const enkel = bereich.kinder.reduce((s, e) => s + e.investitionen, 0);
        expect(bereich.investitionen).toBeCloseTo(enkel, 2);
      }
    }
  });

  it("die Gruppe folgt der ersten Ziffer der Gruppierung", () => {
    for (const z of gesamtlisteZeilen(liste)) {
      const hg = z.hhst.split(".")[1][0];
      const erwartet =
        hg <= "2" ? "Einnahmen · Verwaltungshaushalt"
        : hg === "3" ? "Einnahmen · Vermögenshaushalt"
        : hg === "9" ? "Ausgaben · Vermögenshaushalt (Investitionen)"
        : "Ausgaben · Verwaltungshaushalt";
      expect(z.gruppe, z.hhst).toBe(erwartet);
    }
  });

  it("ohne Vorjahr im Datenbestand fehlen dessen Spalten, statt leer dazustehen", () => {
    const frueh = gesamtliste(data, Math.min(...budget.meta.years));
    const erste = gesamtlisteZeilen(frueh)[0];
    expect("ansatzVor" in erste.werte).toBe(false);
    expect("ansatz" in erste.werte).toBe(true);
  });
});

describe("gesamtlisteCsv", () => {
  const zeilen: GesamtZeile[] = [
    {
      hhst: "0301.6322",
      name: "EDV-Kosten an Dritte",
      kontotext: "AKDB",
      ea: "A",
      haushalt: "verwaltung",
      intern: false,
      gruppe: "Ausgaben · Verwaltungshaushalt",
      werte: { ansatz: 80000, ansatzVor: 61079.56, ergebnisVor: null },
    },
    {
      hhst: "5701.1161",
      name: 'Badegebühren; u.ä. "Entgelte"',
      kontotext: null,
      ea: "E",
      haushalt: "verwaltung",
      intern: false,
      gruppe: "Einnahmen · Verwaltungshaushalt",
      werte: { ansatz: 100000, ansatzVor: 95000, ergebnisVor: 99123.45 },
    },
  ];
  const spalten = [
    { key: "ansatz", kopf: "Ansatz 2026" },
    { key: "ansatzVor", kopf: "Ansatz 2025" },
    { key: "ergebnisVor", kopf: "Ergebnis 2025" },
  ] as const;
  const csv = gesamtlisteCsv(zeilen, [...spalten]);
  const reihen = csv.split("\r\n");

  it("beginnt mit dem BOM, sonst zeigt Excel die Umlaute falsch", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("trennt mit Semikolon und schreibt die Spaltenköpfe", () => {
    expect(reihen[0]).toBe("﻿Haushaltsstelle;Bezeichnung;Art;Haushalt;Ansatz 2026;Ansatz 2025;Ergebnis 2025");
  });

  it("haelt die fuehrende Null der Haushaltsstelle", () => {
    expect(reihen[1].startsWith('="0301.6322";')).toBe(true);
  });

  it("schreibt Dezimalkomma und laesst Leeres leer", () => {
    expect(reihen[1]).toContain(";80000;61079,56;");
    expect(reihen[1].endsWith(";")).toBe(true);
  });

  it("setzt einen Namen mit Semikolon oder Anfuehrungszeichen in Anfuehrungszeichen", () => {
    expect(reihen[2]).toContain('"Badegebühren; u.ä. ""Entgelte"""');
  });

  it("gibt genau die uebergebenen Zeilen aus", () => {
    expect(reihen.filter(Boolean)).toHaveLength(3);
  });
});
