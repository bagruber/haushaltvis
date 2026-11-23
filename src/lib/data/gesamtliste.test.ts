// Die Gesamtliste ist die Sicht, die mit dem amtlichen Plan vergleichbar sein
// muss. Jede Zahl hier ist eine, die jemand in der Sitzung nachrechnet.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Budget, Context, Data, EntwurfDatei, Themes, Zwischenstand } from "./types";
import { latestYear, mitEntwurf } from "./core";
import {
  bereinigung,
  gesamtliste,
  gesamtlisteCsv,
  gesamtlisteZeilen,
  pfeile,
  SCHWELLE,
  type GesamtSpalte,
  type GesamtZeile,
} from "./gesamtliste";

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(__dirname, `../../../public/data/${name}`), "utf8")) as T;
const readOptional = <T>(name: string): T | null => {
  try {
    return read<T>(name);
  } catch {
    return null;
  }
};

const entwurf = readOptional<EntwurfDatei>("entwurf.json");
const budget = mitEntwurf(read<Budget>("budget.json"), entwurf);
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
  finanzplan: entwurf?.finanzplan,
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
          for (const key of ["ansatz", "ansatzVor", "ergebnisVor", "gebuchtVor", "bezahltVor", "gebucht", "bezahlt"] as const) {
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

  it("das Folgejahr ist der nächste Plan, sonst der Finanzplan, sonst leer", () => {
    const letztes = budget.meta.years.at(-1)!;
    const vorletztes = gesamtliste(data, letztes - 1);
    expect(vorletztes.nach).toBe("ansatz");
    const z = gesamtlisteZeilen(vorletztes).find((x) => x.werte.ansatzNach)!;
    expect(z.werte.ansatzNach).toBe(gesamtlisteZeilen(gesamtliste(data, letztes)).find((x) => x.hhst === z.hhst)!.werte.ansatz);
    const ganzHinten = gesamtliste(data, letztes);
    if (data.finanzplan) {
      expect(ganzHinten.nach).toBe("finanzplan");
      const f = gesamtlisteZeilen(ganzHinten).find((x) => x.werte.ansatzNach)!;
      expect(f.werte.ansatzNach).toBe(data.finanzplan.ansatz[f.hhst]);
    } else {
      expect(ganzHinten.nach).toBe(null);
      expect(gesamtlisteZeilen(ganzHinten).every((x) => x.werte.ansatzNach == null)).toBe(true);
    }
  });

  it("unter dem Ansatz steht das Ergebnis, sobald es eines gibt, sonst der jüngste Stand", () => {
    // Abgerechnet: das Ergebnis, auch wenn es zu dem Jahr einen Stand gab.
    const abgerechnet = gesamtliste(data, jahr);
    expect(abgerechnet.ist.vor).toEqual({ art: "ergebnis" });
    if (!data.zwischenstand.some((z) => z.jahr === jahr)) return;
    expect(abgerechnet.ist.jahr?.art).toBe("stand");
    // Das laufende Jahr als Vorjahr des Entwurfs: der jüngste Stand.
    const neuester = data.zwischenstand.filter((z) => z.jahr === jahr).at(-1)!;
    const l = gesamtliste(data, jahr + 1);
    expect(l.ist.vor).toEqual({ art: "stand", stichtag: neuester.stichtag });
    const hhst = Object.keys(neuester.werte).find((h) => neuester.werte[h][0] !== neuester.werte[h][1])!;
    const zeile = gesamtlisteZeilen(l).find((x) => x.hhst === hhst)!;
    expect(zeile.werte.gebuchtVor).toBe(neuester.werte[hhst][0]);
    expect(zeile.werte.bezahltVor).toBe(neuester.werte[hhst][1]);
    // Eine Stelle, die der Stand nicht kennt, hat dort nichts, nicht 0.
    const fremd = gesamtlisteZeilen(l).find((x) => !(x.hhst in neuester.werte))!;
    expect(fremd.werte.gebuchtVor).toBe(null);
  });

  it("ohne Vorjahr im Datenbestand fehlen dessen Spalten, statt leer dazustehen", () => {
    const frueh = gesamtliste(data, Math.min(...budget.meta.years));
    const erste = gesamtlisteZeilen(frueh)[0];
    expect("ansatzVor" in erste.werte).toBe(false);
    expect("ansatz" in erste.werte).toBe(true);
  });
});

describe("pfeile (Ansatz gegen Vorjahr)", () => {
  const ohne = null;
  const preisUndKopf = { preis: 1.031, einwohner: 1.0, preisVon: "Dezember 2025", preisBis: "Oktober 2026" };

  it("unter zwei Prozent in beide Richtungen ist gleich geblieben, ab zwei Prozent nicht", () => {
    expect(pfeile(101.99, 100, ohne)!.nominal.richtung).toBe("gleich");
    expect(pfeile(98.01, 100, ohne)!.nominal.richtung).toBe("gleich");
    expect(pfeile(100 * (1 + SCHWELLE), 100, ohne)!.nominal.richtung).toBe("auf");
    expect(pfeile(100 * (1 - SCHWELLE), 100, ohne)!.nominal.richtung).toBe("ab");
  });

  it("gibt den genauen Anteil mit, für den Hinweis beim Darüberfahren", () => {
    expect(pfeile(104200, 100000, ohne)!.nominal.anteil).toBeCloseTo(0.042, 10);
    expect(pfeile(0, 5000, ohne)!.nominal).toEqual({ richtung: "ab", anteil: -1 });
  });

  it("bereinigt rechnet Preise und Einwohner heraus", () => {
    // +3 % in Euro bei +3,1 % Preisen ist real ein leichtes Minus, unter der Schwelle.
    const p = pfeile(103000, 100000, preisUndKopf)!;
    expect(p.nominal.richtung).toBe("auf");
    expect(p.real!.anteil).toBeCloseTo(1.03 / 1.031 - 1, 10);
    expect(p.real!.richtung).toBe("gleich");
    const mehrLeute = pfeile(110000, 100000, { ...preisUndKopf, preis: 1.05, einwohner: 1.02 })!;
    expect(mehrLeute.real!.anteil).toBeCloseTo(1.1 / (1.05 * 1.02) - 1, 10);
    // Ohne Preis- oder Einwohnerzahl nur der eine Pfeil.
    expect(pfeile(103000, 100000, ohne)!.real).toBe(null);
  });

  it("von 0 € aus nach oben, ohne Prozentzahl", () => {
    expect(pfeile(5000, 0, preisUndKopf)).toEqual({
      nominal: { richtung: "auf", anteil: null },
      real: { richtung: "auf", anteil: null },
    });
  });

  it("keine Pfeile, wo ein Prozentwert nichts sagt", () => {
    expect(pfeile(0, 0, ohne)).toBe(null);
    expect(pfeile(null, 100, ohne)).toBe(null);
    expect(pfeile(100, undefined, ohne)).toBe(null);
    expect(pfeile(-50, 100, ohne)).toBe(null);
    expect(pfeile(100, -50, ohne)).toBe(null);
  });
});

describe("bereinigung (Preise zum Jahresbeginn, Einwohner)", () => {
  const ctx: Context = {
    population: { "2025": 20012, "2026": 20107, "2027": 20107 },
    vpi_monat: { "2024-12": 120.5, "2025-12": 122.7, "2026-10": 126.5 },
  };

  it("ein Ansatz gilt ab 1. Januar: Dezember gegen Dezember", () => {
    const b = bereinigung(ctx, 2026)!;
    expect(b.preis).toBeCloseTo(122.7 / 120.5, 10);
    expect(b.einwohner).toBeCloseTo(20107 / 20012, 10);
    expect([b.preisVon, b.preisBis]).toEqual(["Dezember 2024", "Dezember 2025"]);
  });

  it("fehlt der Dezember noch, zählt der jüngste Monat davor", () => {
    const b = bereinigung(ctx, 2027)!;
    expect(b.preis).toBeCloseTo(126.5 / 122.7, 10);
    expect(b.preisBis).toBe("Oktober 2026");
    expect(b.einwohner).toBe(1);
  });

  it("ohne Index für eines der beiden Jahre keine Bereinigung", () => {
    expect(bereinigung(ctx, 2025)).toBe(null);
    expect(bereinigung({ vpi_monat: ctx.vpi_monat }, 2026)).toBe(null);
  });

  it("die echten Kontextdaten reichen bis ins jüngste Jahr", () => {
    const letztes = budget.meta.years.at(-1)!;
    expect(bereinigung(data.context, letztes)).not.toBe(null);
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
      wechsel: null,
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
      wechsel: null,
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

  it("was in der Tabelle klein unter dem Ansatz steht, bekommt eine eigene Spalte", () => {
    const mitUnter: GesamtSpalte[] = [{ key: "ansatzVor", kopf: "Ansatz 2025", unter: { keys: ["ergebnisVor"], kopf: "" } }];
    const k = gesamtlisteCsv(zeilen, mitUnter).split("\r\n");
    expect(k[0]).toBe("﻿Haushaltsstelle;Bezeichnung;Art;Haushalt;Ansatz 2025;Ansatz 2025, Ergebnis");
    expect(k[2].endsWith(";95000;99123,45")).toBe(true);
  });
});
