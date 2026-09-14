import { useSyncExternalStore } from "react";
import type { MarkPointComponentOption } from "echarts";

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
 * Handwritten note in a chart: script text in gold-700 with a short gold-500
 * arrow pointing down at one data point. At most one per chart. EChart waits
 * for the script font, so the canvas does not fall back to a system face.
 */
export function notiz(text: string, coord: [string, number]): MarkPointComponentOption {
  const scriptFont = getComputedStyle(document.documentElement).getPropertyValue("--font-script");
  return {
    silent: true,
    symbol: "path://M4,0 L6,0 L6,10 L10,10 L5,16 L0,10 L4,10 Z",
    symbolSize: [9, 16],
    symbolOffset: [0, -12],
    itemStyle: { color: "#b8964e" },
    label: {
      show: true,
      position: "top",
      distance: 2,
      formatter: text,
      fontFamily: scriptFont,
      fontSize: 28,
      color: "#6e5a30",
      rotate: 4,
    },
    data: [{ name: text, coord }],
  };
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
