import { useSyncExternalStore } from "react";

const BREIT = "(min-width: 640px)";

/** Chart notes need room; below 640 px there is none, so charts leave them out. */
export function useBreit() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(BREIT);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(BREIT).matches,
  );
}

/**
 * Handwritten note in a chart, pointing at one data point: x is the category
 * (year), y the value. EChart draws the text in the free margin above the plot
 * and a curved arrow down to the point. At most one per chart.
 */
export interface Notiz {
  text: string;
  x: string;
  y: number;
  /**
   * `bogen` (Standard): Text im freien Rand über der Grafik, geschwungener
   * Pfeil hinunter zum Punkt — für Notizen zu einem Ereignis, das irgendwo in
   * der Fläche liegt. `kurz`: Text direkt neben dem Punkt, gerader Strich —
   * für eine Marke am Rand, die keinen weiten Weg braucht.
   */
  form?: "bogen" | "kurz";
  /**
   * Namen der Serien, zu denen die Notiz gehört. Wird eine andere Serie
   * hervorgehoben, verblasst die Notiz mit ihrer Linie; ist keine ihrer Serien
   * sichtbar, wird sie gar nicht gezeichnet. Ohne das Feld bleibt sie immer da.
   */
  serien?: string[];
  /**
   * Nur für `kurz`: Punkte, auf die der Text nicht fallen darf (die Rauten des
   * Vorjahres liegen genau dort, wo er sonst stünde). Der Text weicht dann
   * nach oben oder unten aus.
   */
  meiden?: { x: string; y: number }[];
}

/**
 * Index of the most extreme value inside a window of years, so a note about a
 * dated event sits on the data point where the event actually shows.
 */
export function extremImFenster(
  years: number[],
  values: (number | null)[],
  fenster: number[],
  richtung: "min" | "max",
): number | null {
  let best: number | null = null;
  for (const y of fenster) {
    const i = years.indexOf(y);
    const v = i >= 0 ? values[i] : null;
    if (v == null) continue;
    if (best == null || (richtung === "min" ? v < values[best]! : v > values[best]!)) best = i;
  }
  return best;
}
