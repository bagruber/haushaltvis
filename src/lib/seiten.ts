import type { Icon } from "@phosphor-icons/react";
import {
  BookOpen,
  Crane,
  Envelope,
  FlowArrow,
  House,
  Info,
  ListNumbers,
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
  /** Where the page hangs in the menu — the Ort of a search hit. */
  ort?: string;
}

/** Die beiden Sammelstellen der Navigation. */
const ERKUNDEN = "Erkunden";
const PROJEKT = "Über das Projekt";

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
  { route: "/erkunden", label: "Geldfluss", icon: FlowArrow, stichworte: ["Einzelpläne", "woher und wohin", "Baum"], ort: ERKUNDEN },
  {
    route: "/erkunden/einnahmen",
    label: "Einnahmen",
    icon: TrayArrowDown,
    stichworte: ["Steuern", "Gebühren", "Zuweisungen", "woher das Geld kommt"],
    ort: ERKUNDEN,
  },
  {
    route: "/erkunden/investitionen",
    label: "Investitionen",
    icon: Crane,
    stichworte: ["Vorhaben", "Bauprojekte", "Förderung", "Eigenanteil"],
    ort: ERKUNDEN,
  },
  {
    route: "/erkunden/querschnitte",
    label: "Querschnitte",
    icon: TreeStructure,
    stichworte: ["Personal", "Strom", "Gebäude", "Wasser", "Kostenblöcke"],
    ort: ERKUNDEN,
  },
  {
    route: "/gesamtliste",
    label: "Gesamtliste",
    icon: ListNumbers,
    stichworte: ["alle Haushaltsstellen", "Tabelle", "Excel", "Liste"],
  },
  { route: "/wofuer-zahle-ich", label: "Wofür zahle ich?", icon: Wallet, stichworte: ["Rechner", "Steuerbeitrag", "je Einwohner"] },
  { route: "/themen", label: "Themen", icon: SquaresFour, stichworte: ["Bildung", "Mobilität", "Soziales", "Umwelt"] },
  { route: "/methodik", label: "Methodik und Daten", icon: Scroll, stichworte: ["Quellen", "AKDB", "Kameralistik"], ort: PROJEKT },
  { route: "/glossar", label: "Glossar", icon: BookOpen, stichworte: ["Fachbegriffe", "Ansatz", "Haushaltsstelle"], ort: PROJEKT },
  { route: "/info", label: "Über das Projekt", icon: Info, stichworte: ["Hintergrund", "wer dahintersteht"], ort: PROJEKT },
  { route: "/impressum", label: "Impressum", icon: Envelope, stichworte: ["Kontakt", "verantwortlich"], ort: PROJEKT },
  { route: "/datenschutz", label: "Datenschutz", icon: Lock, stichworte: ["Cookies", "Tracking"], ort: PROJEKT },
  { route: "/barrierefreiheit", label: "Barrierefreiheit", icon: PersonArmsSpread, stichworte: ["Screenreader", "Tastatur"], ort: PROJEKT },
];

/** One page by its route. The routes are constants, so a miss is a typo. */
export function seite(route: string): Seite {
  const s = SEITEN.find((x) => x.route === route);
  if (!s) throw new Error(`Unbekannte Seite: ${route}`);
  return s;
}
