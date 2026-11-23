// Zwei Regeln der kameralen Systematik, die App und Kartenskript beide
// brauchen: welche Einnahmeart eine Haushaltsstelle hat und welche Buchungen
// rein technisch sind.
//
// Reines JavaScript, weil scripts/karten.mjs unter Node laeuft und keine
// .ts-Datei aus src/ laden kann. Importiert von lib/data/selectors.ts —
// eine Quelle, kein Abschreiben.

/**
 * Einnahmeart einer Haushaltsstelle, feiner als die Hauptgruppe: die grossen
 * Steuern stehen einzeln, damit „Gewerbesteuer" ein eigener Posten in der
 * Darstellung ist und nicht in „Steuern" verschwindet.
 *
 * @param {import("./data/types").Posten} p
 * @returns {string}
 */
export function incomeCategory(p) {
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

/**
 * Interne beziehungsweise technische Buchungen, die in einer Geldfluss-
 * Darstellung doppelt zaehlen wuerden: Verschiebungen zwischen den beiden
 * Haushalten, innere Verrechnungen, Ruecklagen, kalkulatorische Kosten und
 * Abschlussbuchungen.
 *
 * @param {import("./data/types").Posten} p
 * @returns {boolean}
 */
export function isInternal(p) {
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
