import type { Icon } from "@phosphor-icons/react";
import { Buildings, Desktop, Drop, HandCoins, Lightning, Users } from "@phosphor-icons/react";

// Fixed display order, colour and icon per aggregator (keys from
// etl/aggregatoren.yaml). Not on the Querschnitte page: the search shows the
// cost blocks too, and name, colour and icon are maintained in one place.
export const ORDER = ["personal", "zuschuesse", "gebaeude", "it", "strom", "wasser"] as const;

export { KOSTENBLOCK_COLORS as COLOR } from "./marke.mjs";

export const ICON: Record<string, Icon> = {
  personal: Users,
  zuschuesse: HandCoins,
  gebaeude: Buildings,
  it: Desktop,
  strom: Lightning,
  wasser: Drop,
};
