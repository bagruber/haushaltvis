// Die paar Konstanten, die App und Kartenskript beide brauchen: Klecks,
// Farben, Farbtoene. Reines JavaScript ohne Pfad-Aliase, weil scripts/karten.mjs
// unter Node laeuft und die .ts-Dateien aus src/ nicht laden kann.
//
// Importiert von lib/colors.ts, lib/kategorien.ts, components/ui.tsx und
// scripts/karten.mjs — eine Quelle, kein Abschreiben.

/** Der eine Klecks-Pfad. Nachbarn entstehen durch Drehen, nie durch Neuzeichnen. */
export const KLECKS_PFAD =
  "M25 3.5c8.6.3 17.8 5.2 19.2 14.6 1.5 9.8-4 21.5-14.4 24.9C19.7 46.3 6.6 41.5 4.3 30.7 2 19.6 12.2 3 25 3.5z";

export const KLECKS_DREHUNG = [undefined, "rotate(70deg)", "rotate(150deg) scaleX(-1)"];

/**
 * Eine Farbe je Einzelplan (0–9).
 * @type {Record<string, string>}
 */
export const EINZELPLAN_COLORS = {
  "0": "#8a8170", // Allg. Verwaltung
  "1": "#c8102e", // Sicherheit
  "2": "#009ac7", // Schulen
  "3": "#6b3e7a", // Kultur
  "4": "#e91e8c", // Soziales
  "5": "#0a9e4c", // Gesundheit/Sport
  "6": "#3b3f9a", // Bau/Verkehr
  "7": "#18ada4", // Öff. Einrichtungen/Wirtschaft
  "8": "#b8964e", // Wirtschaftl. Unternehmen
  "9": "#1a1a1a", // Finanzwirtschaft
};

/**
 * Eine Farbe je Kostenblock (Schlüssel aus etl/aggregatoren.yaml).
 * @type {Record<string, string>}
 */
export const KOSTENBLOCK_COLORS = {
  personal: "#2f6f8f",
  zuschuesse: "#6b3e7a",
  gebaeude: "#c26a2c",
  it: "#0a9e4c",
  strom: "#d4a017",
  wasser: "#3a8fb7",
};

/**
 * Eine Farbe für alle Einnahmearten, in der Suche wie auf der Vorschaukarte:
 * Sie sagt „das ist eine Einnahmeart“, nicht welche.
 */
export const EINNAHMEART_COLOR = "#b8964e";

/** Plan ist gedämpft, damit er der Ist-Farbe nie Konkurrenz macht. */
export const PLAN_COLOR = "#8a7a5c";

/** @param {string} h @returns {number[]} */
function hexZuRgb(h) {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
}

/** @param {number[]} rgb @returns {string} */
function rgbZuHex(rgb) {
  return "#" + rgb.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}

/**
 * Aufhellen (t>0, gegen Weiss) oder abdunkeln (t<0, gegen Schwarz).
 * @param {string} hex
 * @param {number} t
 * @returns {string}
 */
export function tint(hex, t) {
  const ziel = t < 0 ? "#000000" : "#ffffff";
  const a = hexZuRgb(hex);
  const b = hexZuRgb(ziel);
  const anteil = Math.abs(t);
  return rgbZuHex(a.map((v, i) => v + (b[i] - v) * anteil));
}

/**
 * Töne einer wiederkehrenden Kategorie: eine helle Fläche für den Klecks und
 * ein dunkler Ton für Icon und Text. Bei -0.35 erreicht jede Einzelplan- und
 * Kostenblockfarbe mindestens 4,5:1 auf Creme (knappster Fall: Strom #d4a017
 * mit 4,83:1).
 *
 * @param {string} farbe
 * @returns {{ flaeche: string, text: string }}
 */
export function kategorieTon(farbe) {
  return { flaeche: tint(farbe, 0.78), text: tint(farbe, -0.35) };
}
