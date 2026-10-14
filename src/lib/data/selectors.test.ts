// Konsistenz-Tests über den echten Datenbestand (public/data): jede hier
// geprüfte Invariante ist eine Zahl, die Bürger auf der Website sehen.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Budget, Data, Themes, Zwischenstand } from "./types";
import { factsOfYear, factsOfHhst, postenOfGlz, latestYear } from "./core";
import {
  bereichSeries,
  einrichtungSeries,
  totals,
  expenseShareByPrimaryTheme,
  themeSankey,
  kameralBothSidesTree,
  adjustSeries,
  incomeCategory,
  isInternal,
  investmentsAll,
  postenSeries,
  searchIndex,
  searchRank,
  type YearSeries,
} from "./selectors";
import { fmtEur, fmtEurShort, fmtEurFine } from "../format";
import { doppelte } from "../nummern";
import { extremImFenster } from "../notiz";

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(__dirname, `../../../public/data/${name}`), "utf8")) as T;

/** Löschbare Datei: ihr Fehlen ist ein vorgesehener Zustand, kein Testfehler. */
const readOptional = <T>(name: string): T | null => {
  try {
    return read<T>(name);
  } catch {
    return null;
  }
};

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
  aggregatoren: read("aggregatoren.json"),
  zwischenstand: readOptional<Zwischenstand>("zwischenstand.json"),
};
/** Wie die App ohne Stichtagsdatei aussieht — der Rückweg ist ein Löschen. */
const ohneZwischenstand: Data = { ...data, zwischenstand: null };
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

  const index = searchIndex(data);
  it("Alltagswort findet den Amtsbegriff (Müll → Abfall)", () => {
    const hits = searchRank(index, "Müll");
    expect(hits.some((h) => /abfall/i.test(h.label))).toBe(true);
  });
  it("Gliederungsnummer findet zuerst die Einrichtung", () => {
    const glz = Object.values(budget.posten).find((p) => p.glz_text)!.glz;
    expect(searchRank(index, glz)[0].route).toBe(`/einrichtung/${glz}`);
  });
  it("volle Haushaltsstelle findet genau diesen Posten", () => {
    const p = Object.values(budget.posten).find((x) => !isInternal(x))!;
    expect(searchRank(index, p.hhst_id)[0].route).toBe(`/posten/${p.hhst_id}`);
  });
  it("gleichnamige Posten sind in der Trefferliste unterscheidbar", () => {
    const seen = new Set<string>();
    for (const it of index) {
      const key = `${it.label}|${it.sub}`;
      expect(seen.has(key), `doppelt: ${key}`).toBe(false);
      seen.add(key);
    }
  });
  it("zweistellige Nummer findet zuerst den Bereich, nicht seine Posten", () => {
    expect(searchRank(index, "21")[0].route).toBe("/bereich/21");
  });
  it("Seiten der App sind zu finden", () => {
    expect(searchRank(index, "querschnitt")[0].route).toBe("/erkunden/querschnitte");
  });
  it("der Kostenblock steht vor jedem Einzelposten", () => {
    const hits = searchRank(index, "strom");
    const block = hits.findIndex((h) => h.route === "/erkunden/querschnitte/strom");
    const posten = hits.findIndex((h) => h.route.startsWith("/posten/"));
    expect(block).toBeGreaterThanOrEqual(0);
    expect(posten === -1 || block < posten).toBe(true);
  });
  it("jeder Bereich mit Posten steht genau einmal im Index", () => {
    const erwartet = new Set(Object.values(budget.posten).map((p) => p.glz.slice(0, 2)));
    const imIndex = index.filter((it) => it.route.startsWith("/bereich/")).map((it) => it.route.slice(9));
    expect(imIndex.sort()).toEqual([...erwartet].sort());
    expect(new Set(imIndex).size).toBe(imIndex.length);
  });
  it("jede Ebene des Haushalts traegt das Icon ihres Einzelplans", () => {
    for (const art of ["/einzelplan/", "/bereich/", "/einrichtung/", "/posten/"]) {
      const treffer = index.find((it) => it.route.startsWith(art))!;
      expect(treffer.icon, art).toBeTruthy();
      expect(treffer.farbe, art).toMatch(/^#/);
      expect(treffer.nummer, art).toBeTruthy();
    }
  });
  it("Seiten bleiben farblos, damit farbig 'Teil des Haushalts' heisst", () => {
    for (const it of index.filter((x) => x.sub.startsWith("Seite"))) {
      expect(it.farbe, it.label).toBeUndefined();
      expect(it.icon, it.label).toBeTruthy();
    }
  });
});

// Ohne die Datei gibt es nichts zu prüfen — genau das ist der Rückweg.
describe.skipIf(!data.zwischenstand)("Zwischenstand (Stichtag des laufenden Jahres)", () => {
  const zs = data.zwischenstand!;

  it("der Stichtag liegt im Jahr, das nur einen Plan hat", () => {
    expect(zs.jahr).toBe(latestYear(budget));
    expect(zs.stichtag.startsWith(String(zs.jahr))).toBe(true);
    for (const f of budget.facts.filter((x) => x.year === zs.jahr)) {
      expect(f.ergebnis, `${f.hhst_id} hat ein Ergebnis im laufenden Jahr`).toBe(null);
    }
  });

  it("jede Stichtagszahl verweist auf einen bekannten Posten", () => {
    for (const hhst of Object.keys(zs.werte)) {
      expect(budget.posten[hhst], `unbekannte Haushaltsstelle ${hhst}`).toBeTruthy();
    }
  });

  it("die Einrichtung summiert genau ihre Posten", () => {
    const glz = Object.values(budget.posten).find(
      (p) => p.ea === "A" && p.haushalt === "verwaltung" && zs.werte[p.hhst_id]?.[0] > 0,
    )!.glz;
    const s = einrichtungSeries(data, glz, "A", "verwaltung");
    let soll = 0;
    let ist = 0;
    for (const p of Object.values(budget.posten)) {
      if (p.glz !== glz || p.ea !== "A" || p.haushalt !== "verwaltung") continue;
      soll += zs.werte[p.hhst_id]?.[0] ?? 0;
      ist += zs.werte[p.hhst_id]?.[1] ?? 0;
    }
    expect(s.zwischen!.soll).toBeCloseTo(soll, 2);
    expect(s.zwischen!.ist).toBeCloseTo(ist, 2);
  });

  it("der Bereich ist die Summe seiner Einrichtungen", () => {
    const ab = "46";
    const glzs = [...new Set(Object.values(budget.posten).filter((p) => p.glz.startsWith(ab)).map((p) => p.glz))];
    const teile = glzs.map((g) => einrichtungSeries(data, g, "A", "verwaltung").zwischen?.soll ?? 0);
    const ganz = bereichSeries(data, ab, "A", "verwaltung").zwischen!;
    expect(ganz.soll).toBeCloseTo(teile.reduce((x, y) => x + y, 0), 2);
  });

  // Im Ganzen ist bezahlt weniger als gebucht. Beim einzelnen Posten gilt das
  // NICHT: 19 von 2742 liegen darüber, weil Geld auch ohne vorherige Anordnung
  // fließt (Bankgebühren im Abbuchungsverfahren, Gebühren an der Kasse). Die
  // Darstellung darf sich also nicht auf die Reihenfolge der beiden Marken
  // verlassen.
  it("im Ganzen ist bezahlt weniger als gebucht, beim einzelnen Posten nicht zwingend", () => {
    const summe = Object.values(zs.werte).reduce(
      (s, [soll, ist]) => ({ soll: s.soll + soll, ist: s.ist + ist }),
      { soll: 0, ist: 0 },
    );
    expect(summe.ist).toBeLessThan(summe.soll);
    expect(Object.values(zs.werte).some(([soll, ist]) => ist > soll)).toBe(true);
  });

  it("je Einwohner und inflationsbereinigt rechnen die Marken mit", () => {
    const s = bereichSeries(data, "46", "A", "verwaltung");
    const pop = read<{ population: Record<string, number> }>("context.json").population[String(zs.jahr)];
    const kopf = adjustSeries(s, data.context, { perCapita: true }, zs.jahr);
    expect(kopf.zwischen!.soll).toBeCloseTo(s.zwischen!.soll / pop, 6);
  });

  it("ohne Datendatei ist die Marke weg, nicht null oder 0", () => {
    expect(bereichSeries(ohneZwischenstand, "46", "A", "verwaltung").zwischen).toBeUndefined();
    expect(postenSeries(ohneZwischenstand, Object.keys(zs.werte)[0]).zwischen).toBeUndefined();
  });

  it("der Stichtag gilt fuer alle Marken derselben Datei", () => {
    const s = bereichSeries(data, "46", "A", "verwaltung").zwischen!;
    expect(s.stichtag).toBe(zs.stichtag);
    expect(s.jahr).toBe(zs.jahr);
  });
});

describe("extremImFenster (Notizen im Diagramm)", () => {
  const years = [2019, 2020, 2021, 2022];
  it("findet Tief- und Höchstwert nur innerhalb des Fensters, Lücken zählen nicht", () => {
    expect(extremImFenster(years, [5, 3, null, 1], [2020, 2021], "min")).toBe(1);
    expect(extremImFenster(years, [5, 3, 4, 9], [2020, 2021], "max")).toBe(2);
    expect(extremImFenster(years, [5, null, null, 1], [2020, 2021], "min")).toBeNull();
  });
});

describe("doppelte (Nummern-Check)", () => {
  it("findet Bezeichnungen, die in einer Liste mehrfach vorkommen", () => {
    expect([...doppelte(["a", "b", "a", "c", "b", "a"])].sort()).toEqual(["a", "b"]);
    expect(doppelte(["a", "b"]).size).toBe(0);
  });
  it("die echten Daten haben gleichnamige Posten innerhalb einer Einrichtung", () => {
    // Genau diese Fälle bekommen ihre Nummer auch ohne Schalter angezeigt.
    const byGlz = new Map<string, string[]>();
    for (const p of Object.values(budget.posten)) {
      if (p.ea !== "A") continue;
      byGlz.set(p.glz, [...(byGlz.get(p.glz) ?? []), p.grz_text ?? p.grz]);
    }
    const betroffen = [...byGlz.values()].filter((labels) => doppelte(labels).size > 0);
    expect(betroffen.length).toBeGreaterThan(0);
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
