import type { Icon } from "@phosphor-icons/react";
import {
  BookOpen,
  Crane,
  Envelope,
  FlowArrow,
  House,
  Info,
  Lock,
  PersonArmsSpread,
  Scroll,
  SquaresFour,
  TrayArrowDown,
  TreeStructure,
  Wallet,
} from "@phosphor-icons/react";

export interface Seite {
  route: string;
  label: string;
  icon: Icon;
  /** Words that also find the page. They rank behind the label (Synonym-Malus). */
  stichworte?: string[];
}

/**
 * Every page of the app, once: name, icon and the words that find it. The
 * search lists pages alongside Einzelpläne and Posten, the header builds its
 * navigation from the same entries — so a renamed page is renamed in one place.
 *
 * Nicht in Header.tsx, obwohl die Navigation der naheliegende Ort wäre: der
 * Suchindex in lib/data/selectors.ts braucht die Liste, und über Header →
 * Search → lib/data wäre das ein Importzyklus.
 */
export const SEITEN: Seite[] = [
  { route: "/", label: "Überblick", icon: House, stichworte: ["Startseite", "Gesamthaushalt", "Wachstum"] },
  { route: "/erkunden", label: "Geldfluss", icon: FlowArrow, stichworte: ["Einzelpläne", "woher und wohin", "Baum"] },
  {
    route: "/erkunden/einnahmen",
    label: "Einnahmen",
    icon: TrayArrowDown,
    stichworte: ["Steuern", "Gebühren", "Zuweisungen", "woher das Geld kommt"],
  },
  {
    route: "/erkunden/investitionen",
    label: "Investitionen",
    icon: Crane,
    stichworte: ["Vorhaben", "Bauprojekte", "Förderung", "Eigenanteil"],
  },
  {
    route: "/erkunden/querschnitte",
    label: "Querschnitte",
    icon: TreeStructure,
    stichworte: ["Personal", "Strom", "Gebäude", "Wasser", "Kostenblöcke"],
  },
  { route: "/wofuer-zahle-ich", label: "Wofür zahle ich?", icon: Wallet, stichworte: ["Rechner", "Steuerbeitrag", "je Einwohner"] },
  { route: "/themen", label: "Themen", icon: SquaresFour, stichworte: ["Bildung", "Mobilität", "Soziales", "Umwelt"] },
  { route: "/methodik", label: "Methodik und Daten", icon: Scroll, stichworte: ["Quellen", "AKDB", "Kameralistik"] },
  { route: "/glossar", label: "Glossar", icon: BookOpen, stichworte: ["Fachbegriffe", "Ansatz", "Haushaltsstelle"] },
  { route: "/info", label: "Über das Projekt", icon: Info, stichworte: ["Hintergrund", "wer dahintersteht"] },
  { route: "/impressum", label: "Impressum", icon: Envelope, stichworte: ["Kontakt", "verantwortlich"] },
  { route: "/datenschutz", label: "Datenschutz", icon: Lock, stichworte: ["Cookies", "Tracking"] },
  { route: "/barrierefreiheit", label: "Barrierefreiheit", icon: PersonArmsSpread, stichworte: ["Screenreader", "Tastatur"] },
];

/** One page by its route. The routes are constants, so a miss is a typo. */
export function seite(route: string): Seite {
  const s = SEITEN.find((x) => x.route === route);
  if (!s) throw new Error(`Unbekannte Seite: ${route}`);
  return s;
}
