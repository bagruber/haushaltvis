import type { Icon } from "@phosphor-icons/react";
import {
  Bank,
  Coins,
  Drop,
  Factory,
  GraduationCap,
  HandHeart,
  Heartbeat,
  MaskHappy,
  ShieldCheck,
  TrafficCone,
} from "@phosphor-icons/react";
import { EINZELPLAN_COLORS, tint } from "./colors";

/** Probe Formsprache, vorläufig (14.09.2026): ein Icon je Einzelplan. */
export const EINZELPLAN_ICONS: Record<string, Icon> = {
  "0": Bank,
  "1": ShieldCheck,
  "2": GraduationCap,
  "3": MaskHappy,
  "4": HandHeart,
  "5": Heartbeat,
  "6": TrafficCone,
  "7": Drop,
  "8": Factory,
  "9": Coins,
};

/**
 * Tones for a recurring category: a light surface for the Klecks and a dark
 * tint for icon and text. At -0.35 every Einzelplan and Kostenblock colour
 * reaches at least 4.5:1 on cream (tightest: Strom #d4a017 at 4.83:1).
 */
export function kategorieTon(farbe: string) {
  return { flaeche: tint(farbe, 0.78), text: tint(farbe, -0.35) };
}

export function einzelplanKategorie(ep: string) {
  return { farbe: EINZELPLAN_COLORS[ep] ?? "#8a8170", icon: EINZELPLAN_ICONS[ep] ?? Bank };
}
