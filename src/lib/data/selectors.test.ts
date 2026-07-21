// Konsistenz-Tests über den echten Datenbestand (public/data): jede hier
// geprüfte Invariante ist eine Zahl, die Bürger auf der Website sehen.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Budget, Data, Themes } from "./types";
import { factsOfYear, factsOfHhst, postenOfGlz, latestYear } from "./core";
import {
  totals,
  expenseShareByPrimaryTheme,
  themeSankey,
  kameralBothSidesTree,
  adjustSeries,
  incomeCategory,
  isInternal,
  investmentsAll,
  postenSeries,
  searchRank,
  type YearSeries,
} from "./selectors";
import { fmtEur, fmtEurShort, fmtEurFine } from "../format";

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(__dirname, `../../../public/data/${name}`), "utf8")) as T;

const budget = read<Budget>("budget.json");
const themes = read<Themes>("themes.json");
const data: Data = {
  budget,
  themes,
  events: [],
  labels: read("labels.json"),
  context: read("context.json"),
  einleitungen: {},
  glossar: {},
  aggregatoren: {},
};
const year = latestYear(budget);

describe("Datenintegrität", () => {
  it("jede Buchung verweist auf einen bekannten Posten", () => {
    const missing = budget.facts.filter((f) => !budget.posten[f.hhst_id]);
    expect(missing).toHaveLength(0);
  });

  it("jede Themen-Zuordnung verweist auf ein definiertes Thema", () => {
    const known = new Set(Object.keys(themes.themes));
    for (const tags of Object.values(themes.assignment)) {
      for (const t of tags) expect(known.has(t.theme), `unbekanntes Thema ${t.theme}`).toBe(true);
    }
  });
});

describe("Indexe (factsOfYear / factsOfHhst / postenOfGlz)", () => {
  it("factsOfYear partitioniert alle Buchungen exakt", () => {
    const total = budget.meta.years.reduce((s, y) => s + factsOfYear(budget, y).length, 0);
    expect(total).toBe(budget.facts.length);
  });

  it("factsOfHhst stimmt mit dem linearen Filter überein", () => {
    const sample = budget.facts[0].hhst_id;
    const linear = budget.facts.filter((f) => f.hhst_id === sample);
    expect(factsOfHhst(budget, sample)).toEqual(linear);
  });

  it("postenOfGlz liefert alle Posten einer Gliederung", () => {
    const p = Object.values(budget.posten)[0];
    const linear = Object.values(budget.posten).filter((x) => x.glz === p.glz);
    expect(postenOfGlz(budget, p.glz)).toHaveLength(linear.length);
  });
});

describe("totals", () => {
  it("entspricht der direkten Summe über alle Ansätze des Jahres", () => {
    const t = totals(budget, year);
    let e = 0;
    let a = 0;
    for (const f of budget.facts) {
      if (f.year !== year || f.ansatz == null) continue;
      if (budget.posten[f.hhst_id]?.ea === "E") e += f.ansatz;
      else a += f.ansatz;
    }
    expect(t.einnahmen).toBeCloseTo(e, 5);
    expect(t.ausgaben).toBeCloseTo(a, 5);
    expect(t.ausgaben).toBeGreaterThan(0);
  });
});

describe("expenseShareByPrimaryTheme (Wofür zahle ich?)", () => {
  it("ist eine echte Partition: Anteile summieren zu 100 %", () => {
    const shares = expenseShareByPrimaryTheme(data, year);
    const sum = shares.reduce((s, x) => s + x.share, 0);
    expect(sum).toBeGreaterThan(0.999);
    expect(sum).toBeLessThan(1.001);
  });

  it("Bereichs-Beträge eines Themas summieren zum Themen-Betrag", () => {
    for (const s of expenseShareByPrimaryTheme(data, year)) {
      const childSum = s.children.reduce((x, c) => x + c.amount, 0);
      // Rundung: ±1 € pro Kind
      expect(Math.abs(childSum - s.amount)).toBeLessThanOrEqual(s.children.length);
    }
  });
});

describe("themeSankey", () => {
  const themeIds = Object.keys(themes.themes);

  it("Einnahmen + Zuschuss decken die Ausgaben (keine Lücke im Diagramm)", () => {
    for (const id of themeIds) {
      const s = themeSankey(data, id, year);
      expect(s.income + s.zuschuss).toBeGreaterThanOrEqual(s.total - 1);
    }
  });

  it("alle Links verweisen auf existierende Knoten, Navigation auf echte Gliederungen", () => {
    for (const id of themeIds) {
      const s = themeSankey(data, id, year);
      const names = new Set(s.nodes.map((n) => n.name));
      for (const l of s.links) {
        expect(names.has(l.source)).toBe(true);
        expect(names.has(l.target)).toBe(true);
        expect(l.value).toBeGreaterThanOrEqual(0);
      }
      for (const glz of Object.values(s.nav)) {
        expect(postenOfGlz(budget, glz).length).toBeGreaterThan(0);
      }
    }
  });
});

describe("kameralBothSidesTree (Erkunden)", () => {
  it("Knoten sind eindeutig und alle Links aufgelöst", () => {
    const t = kameralBothSidesTree(data, year);
    const names = t.nodes.map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
    const set = new Set(names);
    for (const l of t.links) {
      expect(set.has(l.source)).toBe(true);
      expect(set.has(l.target)).toBe(true);
    }
  });
});

describe("investmentsAll", () => {
  it("netto = brutto − Förderung, Summen konsistent", () => {
    const inv = investmentsAll(data, year);
    for (const i of inv.items) expect(i.netto).toBe(i.invest - i.foerderung);
    expect(inv.totalInvest).toBe(inv.items.reduce((s, i) => s + i.invest, 0));
  });
});

describe("postenSeries", () => {
  it("liefert je Jahr genau einen Wert (Arrays deckungsgleich mit meta.years)", () => {
    const s = postenSeries(data, budget.facts[0].hhst_id);
    expect(s.years).toEqual(budget.meta.years);
    expect(s.ansatz).toHaveLength(s.years.length);
    expect(s.ergebnis).toHaveLength(s.years.length);
  });
});

describe("adjustSeries", () => {
  const series: YearSeries = {
    years: [2020, 2021],
    ansatz: [100, 200],
    ergebnis: [null, 150],
    provisional: new Set(),
  };
  const ctx = { cpi: { "2020": 100, "2021": 110 }, population: { "2020": 10, "2021": 20 } };

  it("deflationiert auf das Basisjahr", () => {
    const r = adjustSeries(series, ctx, { real: true }, 2021);
    expect(r.ansatz[0]).toBeCloseTo(110);
    expect(r.ansatz[1]).toBeCloseTo(200);
  });

  it("teilt durch Einwohner und lässt Lücken als null", () => {
    const r = adjustSeries(series, ctx, { perCapita: true }, 2021);
    expect(r.ansatz).toEqual([10, 10]);
    expect(r.ergebnis[0]).toBeNull();
  });

  it("fehlender CPI eines Jahres ergibt null statt falscher Zahl", () => {
    const r = adjustSeries(series, { cpi: { "2021": 110 } }, { real: true }, 2021);
    expect(r.ansatz[0]).toBeNull();
  });
});

describe("incomeCategory / isInternal (Klassifikationsregeln)", () => {
  const posten = (over: Partial<Parameters<typeof incomeCategory>[0]>) => ({
    hhst_id: "x",
    einzelplan: "9",
    einzelplan_name: "",
    glz: "9000",
    grz: "0000",
    glz_text: null,
    grz_text: null,
    kontotext: null,
    ea: "E" as const,
    haushalt: "verwaltung" as const,
    ...over,
  });

  it("ordnet die großen Steuern korrekt zu", () => {
    expect(incomeCategory(posten({ grz: "0030" }))).toBe("Gewerbesteuer");
    expect(incomeCategory(posten({ grz: "0000" }))).toBe("Grundsteuer");
    expect(incomeCategory(posten({ grz: "0100" }))).toBe("Einkommensteuer-Anteil");
    expect(incomeCategory(posten({ grz: "1111" }))).toBe("Abwassergebühren");
    expect(incomeCategory(posten({ grz: "377", haushalt: "vermoegen" }))).toBe("Kreditaufnahmen");
  });

  it("erkennt interne Verrechnungen am Buchungstext", () => {
    expect(isInternal(posten({ grz_text: "Innere Verrechnung Bauhof" }))).toBe(true);
    expect(isInternal(posten({ kontotext: "Zuführung zum Vermögenshaushalt" }))).toBe(true);
    expect(isInternal(posten({ grz_text: "Personalausgaben" }))).toBe(false);
  });
});

describe("searchRank", () => {
  const items = [
    { label: "Bildung & Schulen", sub: "Thema", route: "/a" },
    { label: "Schulden", sub: "Thema", route: "/b" },
  ];
  it("Präfix-Treffer vor Substring-Treffern", () => {
    expect(searchRank(items, "schul")[0].route).toBe("/b");
  });
  it("leere Suche liefert nichts", () => {
    expect(searchRank(items, "  ")).toEqual([]);
  });
});

describe("format", () => {
  // fmtEur/fmtEurShort setzen bewusst geschützte Leerzeichen ( ), damit
  // Betrag und Einheit nie durch einen Zeilenumbruch getrennt werden.
  it("deutsche Zahlformate", () => {
    expect(fmtEur(1234567)).toBe("1.234.567 €");
    expect(fmtEurShort(1_200_000)).toBe("1,2 Mio. €");
    expect(fmtEurShort(340_000)).toBe("340 Tsd. €");
    expect(fmtEurFine(3.456)).toBe("3,46 €");
  });
});
