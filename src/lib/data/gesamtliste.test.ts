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
  zwischenstand: readOptional<{ staende: Zwischenstand[] }>("zwischenstand.json")?.staende ?? [],
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

  it("ordnet wie der amtliche Plan: erst A. Verwaltungs-, dann B. Vermögenshaushalt", () => {
    expect(liste.haushalte.map((h) => h.titel)).toEqual(["A. Verwaltungshaushalt", "B. Vermögenshaushalt"]);
    for (const h of liste.haushalte) {
      for (const z of h.einzelplaene.flatMap((p) => p.kinder.flatMap((b) => b.kinder.flatMap((e) => e.zeilen)))) {
        expect(z.haushalt, z.hhst).toBe(h.haushalt);
      }
    }
  });

  it("innerhalb eines Haushalts streng aufsteigend: Einzelpläne, Einrichtungen, Haushaltsstellen", () => {
    const ordnung = (glz: string) => glz.padEnd(5, "0");
    for (const h of liste.haushalte) {
      const eps = h.einzelplaene.map((p) => p.nummer);
      expect([...eps].sort()).toEqual(eps);
      for (const plan of h.einzelplaene) {
        for (const bereich of plan.kinder) {
          const glzs = bereich.kinder.map((e) => e.nummer);
          expect([...glzs].sort((a, b) => ordnung(a).localeCompare(ordnung(b)))).toEqual(glzs);
          for (const e of bereich.kinder) {
            const hhsts = e.zeilen.map((z) => z.hhst);
            expect([...hhsts].sort()).toEqual(hhsts);
          }
        }
      }
    }
  });

  it("je Einrichtung erst alle Einnahmen, dann alle Ausgaben", () => {
    for (const z of gesamtlisteZeilen(liste)) {
      const hg = z.hhst.split(".")[1][0];
      expect(z.gruppe, z.hhst).toBe(hg <= "3" ? "Einnahmen" : "Ausgaben");
    }
    for (const h of liste.haushalte) {
      for (const e of h.einzelplaene.flatMap((p) => p.kinder.flatMap((b) => b.kinder))) {
        const arten = e.zeilen.map((z) => z.ea).join("");
        expect(arten, e.id).toMatch(/^E*A*$/);
      }
    }
  });

  it("jede Sprungmarke gibt es nur einmal; die kurze gehört dem Verwaltungshaushalt", () => {
    const ids: string[] = [];
    for (const h of liste.haushalte) {
      for (const plan of h.einzelplaene) {
        ids.push(plan.id);
        for (const b of plan.kinder) {
          ids.push(b.id);
          for (const e of b.kinder) ids.push(e.id);
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    const vw = liste.haushalte[0];
    expect(vw.einzelplaene.every((p) => p.id === p.nummer)).toBe(true);
  });

  it("die Ebenen tragen die Summen ihrer Kinder", () => {
    for (const h of liste.haushalte) {
      for (const plan of h.einzelplaene) {
        const kinder = plan.kinder.reduce((s, b) => s + b.ausgaben, 0);
        expect(plan.ausgaben).toBeCloseTo(kinder, 2);
        for (const bereich of plan.kinder) {
          const enkel = bereich.kinder.reduce((s, e) => s + e.einnahmen, 0);
          expect(bereich.einnahmen).toBeCloseTo(enkel, 2);
        }
      }
    }
  });

  it("die Summenzeilen einer Einrichtung sind die Summen ihrer Zeilen, je Spalte", () => {
    for (const h of liste.haushalte) {
      for (const e of h.einzelplaene.flatMap((p) => p.kinder.flatMap((b) => b.kinder))) {
        for (const ea of ["E", "A"] as const) {
          const zeilen = e.zeilen.filter((z) => z.ea === ea);
          for (const key of ["ansatz", "ansatzVor", "ergebnisVor"] as const) {
            const erwartet = zeilen.reduce((s, z) => s + (z.werte[key] ?? 0), 0);
            expect(e.summe![ea][key] ?? 0, `${e.id} ${ea} ${key}`).toBeCloseTo(erwartet, 2);
          }
        }
      }
    }
  });

  it("deckt sich mit dem Haushaltsplanentwurf 2025, Unterabschnitt 0000 (Seite 8)", () => {
    const l2025 = gesamtliste(data, 2025);
    const ua = l2025.haushalte[0].einzelplaene[0].kinder[0].kinder.find((e) => e.nummer === "0000")!;
    expect(ua.summe!.E.ansatz).toBe(42000);
    expect(ua.summe!.A.ansatz).toBe(566500);
    expect(ua.summe!.E.ansatzVor).toBe(31000);
    expect(ua.summe!.A.ansatzVor).toBe(536700);
  });

  it("das Folgejahr ist leer, bis sein Plan in den Daten steht", () => {
    expect(gesamtlisteZeilen(liste).every((z) => z.werte.ansatzNach == null)).toBe(true);
    // Ein Jahr früher ist das Folgejahr das jüngste Jahr — dort steht ein Plan.
    const frueher = gesamtlisteZeilen(gesamtliste(data, jahr - 1));
    const z = frueher.find((x) => x.werte.ansatzNach)!;
    expect(z.werte.ansatzNach).toBe(gesamtlisteZeilen(liste).find((x) => x.hhst === z.hhst)!.werte.ansatz);
  });

  it.skipIf(data.zwischenstand.length < 2)("Stichtag zum Stichjahr und zum Vorjahr, je in eigenen Spalten", () => {
    expect(liste.zwischenstand.map((z) => z.jahr)).toEqual([jahr - 1, jahr]);
    const vor = data.zwischenstand.find((z) => z.jahr === jahr - 1)!;
    const hhst = Object.keys(vor.werte).find((h) => vor.werte[h][1] > 0)!;
    const z = gesamtlisteZeilen(liste).find((x) => x.hhst === hhst)!;
    expect(z.werte.bezahltVor).toBe(vor.werte[hhst][1]);
    expect(z.werte.gebuchtVor).toBe(vor.werte[hhst][0]);
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
      gruppe: "Ausgaben",
      werte: { ansatz: 80000, ansatzVor: 61079.56, ergebnisVor: null },
    },
    {
      hhst: "5701.1161",
      name: 'Badegebühren; u.ä. "Entgelte"',
      kontotext: null,
      ea: "E",
      haushalt: "verwaltung",
      intern: false,
      gruppe: "Einnahmen",
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
