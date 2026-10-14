// Die Adresse eines geteilten Abschnitts: sie landet in Messengern und bleibt
// dort lange liegen, also wird jede Form hier festgehalten.
import { describe, it, expect } from "vitest";
import { ansichtLesen, ansichtSchreiben, kennung, teilUrl } from "./teilen";

describe("teilUrl", () => {
  const browser = { hash: false, basis: "/haushaltvis/" };

  it("ersetzt den Pfad unterhalb des Mount-Ordners", () => {
    expect(teilUrl("https://bagruber.github.io/haushaltvis/einzelplan/2", "/bereich/21", browser))
      .toBe("https://bagruber.github.io/haushaltvis/bereich/21");
  });

  it("nimmt die aktuellen Query-Parameter mit", () => {
    expect(teilUrl("https://x.de/haushaltvis/einzelplan/2?jahr=2025&ansicht=kopf", "/bereich/21", browser))
      .toBe("https://x.de/haushaltvis/bereich/21?jahr=2025&ansicht=kopf");
  });

  it("funktioniert in der Vorschau unter /v2/", () => {
    expect(teilUrl("https://x.de/haushaltvis/v2/erkunden/querschnitte", "/erkunden/querschnitte/strom", { hash: false, basis: "/haushaltvis/v2/" }))
      .toBe("https://x.de/haushaltvis/v2/erkunden/querschnitte/strom");
  });

  it("laesst einen alten Anker nicht stehen", () => {
    expect(teilUrl("https://x.de/haushaltvis/glossar#ansatz", "/glossar/soll", browser))
      .toBe("https://x.de/haushaltvis/glossar/soll");
  });

  it("schreibt im Hash-Modus hinter das #, der Mount-Pfad bleibt", () => {
    expect(teilUrl("file:///D:/demo/index.html#/einzelplan/2", "/bereich/21", { hash: true }))
      .toBe("file:///D:/demo/index.html#/bereich/21");
  });

  it("behaelt im Hash-Modus die Query hinter dem Pfad", () => {
    expect(teilUrl("https://x.de/demo/#/erkunden/querschnitte?jahr=2024", "/erkunden/querschnitte/strom", { hash: true }))
      .toBe("https://x.de/demo/#/erkunden/querschnitte/strom?jahr=2024");
  });
});

describe("ansicht (Diagramm-Schalter im Link)", () => {
  it("liest die Schalter einzeln", () => {
    expect(ansichtLesen("kopf")).toEqual({ perCapita: true });
    expect(ansichtLesen("invest,real,kopf,netto")).toEqual({
      showInvest: true, real: true, perCapita: true, netto: true,
    });
  });

  it("ohne Parameter ist alles aus", () => {
    expect(ansichtLesen(null)).toEqual({});
    expect(ansichtLesen("")).toEqual({});
  });

  it("ignoriert Unbekanntes statt zu raten", () => {
    expect(ansichtLesen("kopf,quatsch")).toEqual({ perCapita: true });
  });

  it("schreibt in der Reihenfolge der Schalterzeile", () => {
    expect(ansichtSchreiben({ netto: true, perCapita: true, showInvest: true })).toBe("invest,kopf,netto");
  });

  it("laesst den Parameter weg, wenn kein Schalter an ist", () => {
    expect(ansichtSchreiben({})).toBe(null);
  });

  it("ist in beiden Richtungen dasselbe", () => {
    for (const wert of ["invest", "real,netto", "invest,real,kopf,netto"]) {
      expect(ansichtSchreiben(ansichtLesen(wert))).toBe(wert);
    }
  });
});

describe("kennung (Einnahme-Gruppen im Pfad)", () => {
  it("schreibt Umlaute aus und laesst nur Pfad-Zeichen uebrig", () => {
    expect(kennung("Schlüsselzuweisungen & Finanzausgleich")).toBe("schluesselzuweisungen-finanzausgleich");
    expect(kennung("Mieten & Pachten")).toBe("mieten-pachten");
    expect(kennung("Kita-Beiträge & -Entgelte")).toBe("kita-beitraege-entgelte");
  });
});
