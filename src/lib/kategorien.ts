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
import { EINZELPLAN_COLORS, kategorieTon } from "./marke.mjs";

export { kategorieTon };

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

export function einzelplanKategorie(ep: string) {
  return { farbe: EINZELPLAN_COLORS[ep] ?? "#8a8170", icon: EINZELPLAN_ICONS[ep] ?? Bank };
}
