import { fmtEur, fmtPct } from "./format";

/** Jahreszahl für Tabellen unter einem Diagramm: der Entwurf sagt, was er ist. */
export const jahrText = (y: number, entwurf: number | undefined) => (y === entwurf ? `${y} (Entwurf)` : String(y));

/**
 * Die Jahresachse eines Diagramms. Ist das letzte Jahr ein Entwurf, steht das
 * unter der Zahl, und die Zahl selbst bleibt stehen: Bei zwölf Jahren ließe
 * ECharts sonst gerade sie weg. Sonst jede zweite Zahl wie bisher, am Telefon
 * jede fünfte, vom Entwurf aus gezählt.
 */
export function jahresAchse(years: number[], entwurf: number | undefined, breit: boolean, extra: { boundaryGap?: boolean } = {}) {
  const e = entwurf == null ? -1 : years.indexOf(entwurf);
  return {
    type: "category" as const,
    data: years.map(String),
    ...extra,
    ...(e >= 0
      ? {
          axisLabel: {
            formatter: (v: string) => (v === String(entwurf) ? `${v}\n{e|Entwurf}` : v),
            rich: { e: { fontSize: 10, lineHeight: 15, color: "#8a8170" } },
            interval: breit ? (i: number) => i % 2 === 0 || i === e : (i: number) => (e - i) % 5 === 0,
            // Ohne Rand steht die letzte Zahl auf der Kante und würde halb abgeschnitten.
            ...(extra.boundaryGap === false ? { alignMaxLabel: "right" as const } : {}),
          },
        }
      : {}),
  };
}

function sankeyText(p: unknown, gesamt?: number): string {
  const i = p as { dataType: string; name?: string; value?: number; data?: { source?: string; target?: string } };
  const anteil = gesamt ? ` · ${fmtPct(i.value! / gesamt)}` : "";
  if (i.dataType === "edge") return `${i.data?.source} → ${i.data?.target}<br/><b>${fmtEur(i.value!)}</b>${anteil}`;
  return `<b>${i.name}</b><br/>${fmtEur(i.value!)}${anteil}`;
}

/** Tooltip formatter shared by all Sankey diagrams (edges show the flow, nodes the total). */
export function sankeyTooltip(p: unknown): string {
  return sankeyText(p);
}

/** Same, plus each amount as a share of the whole budget: millions read better as a share. */
export const sankeyTooltipMitAnteil = (gesamt: number) => (p: unknown) => sankeyText(p, gesamt);

/**
 * Balkenwerte, in denen der Balken des Entwurfsjahres schraffiert ist: Er
 * steht schon da, ist aber noch nicht beschlossen.
 */
export function entwurfBalken(werte: (number | null)[], years: number[], entwurf: number | undefined) {
  const e = entwurf == null ? -1 : years.indexOf(entwurf);
  return werte.map((v, i) =>
    i === e && v != null
      ? {
          value: v,
          itemStyle: {
            decal: { symbol: "rect", dashArrayX: [1, 0], dashArrayY: [2, 4], rotation: -Math.PI / 4, color: "rgba(250,247,242,0.55)" },
          },
        }
      : v,
  );
}
