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
