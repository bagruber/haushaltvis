import type { Icon } from "@phosphor-icons/react";
import { Buildings, Desktop, Drop, HandCoins, Lightning, Users } from "@phosphor-icons/react";

// Fixed display order, colour and icon per aggregator (keys from
// etl/aggregatoren.yaml). Not on the Querschnitte page: the search shows the
// cost blocks too, and name, colour and icon are maintained in one place.
export const ORDER = ["personal", "zuschuesse", "gebaeude", "it", "strom", "wasser"] as const;

export const COLOR: Record<string, string> = {
  personal: "#2f6f8f",
  zuschuesse: "#6b3e7a",
  gebaeude: "#c26a2c",
  it: "#0a9e4c",
  strom: "#d4a017",
  wasser: "#3a8fb7",
};

export const ICON: Record<string, Icon> = {
  personal: Users,
  zuschuesse: HandCoins,
  gebaeude: Buildings,
  it: Desktop,
  strom: Lightning,
  wasser: Drop,
};
