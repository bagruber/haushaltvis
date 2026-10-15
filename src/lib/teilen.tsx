import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { TimelineMode } from "@/components/Timeline";

/** True while the app routes through the hash (VITE_ROUTER=hash, portable build). */
export const hashModus = () => import.meta.env.VITE_ROUTER === "hash";

/**
 * Link to one section of a page: the section's own path plus the query the
 * reader currently has (Stichjahr, Diagramm-Schalter).
 *
 * Browser mode: the app can be mounted in a sub-folder (/haushaltvis/,
 * /haushaltvis/v2/), so the section path hangs below `basis`. Hash mode: the
 * whole app lives behind `#`, and everything before it belongs to the mount
 * point and must stay untouched.
 */
export function teilUrl(
  href: string,
  pfad: string,
  { hash = hashModus(), basis = import.meta.env.BASE_URL }: { hash?: boolean; basis?: string } = {},
): string {
  const url = new URL(href);
  if (hash) {
    const query = url.hash.split("?")[1] ?? "";
    url.hash = `#${pfad}${query ? `?${query}` : ""}`;
    return url.toString();
  }
  url.pathname = `${basis.replace(/\/$/, "")}${pfad}`;
  url.hash = "";
  return url.toString();
}

/**
 * Address-safe identifier for a section whose data key is a name, not a code
 * (the Einnahmen groups: "Schlüsselzuweisungen & Finanzausgleich"). Umlauts
 * are spelled out so the identifier survives file systems and copy-paste.
 */
export function kennung(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Sichtbare Serien im Link ────────────────────────────────────────────────

/**
 * Die Serien eines Timeline-Diagramms, in der Reihenfolge, die überall gilt:
 * Tooltip, Legende und Tabelle zeigen sie in genau dieser Folge.
 */
export const SERIEN = ["ist", "plan", "gebucht", "bezahlt", "brutto", "invest"] as const;
export type SerieKey = (typeof SERIEN)[number];

/**
 * Welche Serien sichtbar sind. `?aus=` listet die ausgeblendeten — alle Serien
 * sind also an, bis jemand sie abwählt. Die Investitionen sind der umgekehrte
 * Fall: sie sind aus, bis `?ansicht=invest` sie einschaltet. Dieses Wort gab es
 * schon als Schalter, und alte Links sollen gültig bleiben.
 */
export function useSerien() {
  const { mode, setMode, aus, setAus } = useContext(AnsichtCtx);
  const an = (key: string) => (key === "invest" ? !!mode.showInvest : !aus.has(key as SerieKey));
  const setAn = (key: string, wert: boolean) => {
    if (key === "invest") {
      setMode((m) => ({ ...m, showInvest: wert }));
      return;
    }
    const naechste = new Set(aus);
    if (wert) naechste.delete(key as SerieKey);
    else naechste.add(key as SerieKey);
    setAus(naechste);
  };
  return { aus, an, setAn };
}

/** `?aus=` → die ausgeblendeten Serien. Unbekannte Wörter werden ignoriert. */
export function ausLesen(wert: string | null): Set<SerieKey> {
  const genannt = new Set((wert ?? "").split(",").filter(Boolean));
  return new Set(SERIEN.filter((k) => genannt.has(k)));
}

export function ausSchreiben(aus: Set<SerieKey>): string | null {
  const wort = SERIEN.filter((k) => aus.has(k)).join(",");
  return wort || null;
}

// ── Ansichts-Schalter im Link ───────────────────────────────────────────────

/** `?ansicht=` → the timeline switches. Unknown words are ignored. */
export function ansichtLesen(wert: string | null): TimelineMode {
  const an = new Set((wert ?? "").split(",").filter(Boolean));
  const mode: TimelineMode = {};
  if (an.has("invest")) mode.showInvest = true;
  if (an.has("real")) mode.real = true;
  if (an.has("kopf")) mode.perCapita = true;
  if (an.has("netto")) mode.netto = true;
  return mode;
}

/** The switches that are on, in the order of the checkbox row; null when none is. */
export function ansichtSchreiben(mode: TimelineMode): string | null {
  const an = [
    mode.real && "real",
    mode.perCapita && "kopf",
    mode.netto && "netto",
    mode.showInvest && "invest",
  ].filter(Boolean);
  return an.length ? an.join(",") : null;
}

// ── Die Ansicht, über Seitenwechsel hinweg ──────────────────────────────────

interface AnsichtState {
  mode: TimelineMode;
  setMode: (fn: (m: TimelineMode) => TimelineMode) => void;
  aus: Set<SerieKey>;
  setAus: (s: Set<SerieKey>) => void;
}

const AnsichtCtx = createContext<AnsichtState>({
  mode: {},
  setMode: () => {},
  aus: new Set(),
  setAus: () => {},
});

/**
 * Schalter und Legendenauswahl halten, wie `YearProvider` das Stichjahr hält:
 * im Kontext, nicht an der Adresse der aktuellen Seite. Sonst ist die Auswahl
 * beim Klick auf einen Posten weg, weil der Link ohne Query gebaut ist.
 *
 * Was auf einer Seite nicht passt — verrechnet ohne Einnahmen, Investitionen
 * ohne Vermögenshaushalt — bleibt gespeichert, wird dort aber weder angewendet
 * noch angezeigt. Zurück auf einer passenden Seite ist es wieder da.
 */
export function AnsichtProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TimelineMode>({});
  const [aus, setAus] = useState<Set<SerieKey>>(() => new Set());
  const setMode = (fn: (m: TimelineMode) => TimelineMode) => setModeState((m) => fn(m));
  return <AnsichtCtx.Provider value={{ mode, setMode, aus, setAus }}>{children}</AnsichtCtx.Provider>;
}

export const useAnsicht = (): [TimelineMode, (fn: (m: TimelineMode) => TimelineMode) => void] => {
  const { mode, setMode } = useContext(AnsichtCtx);
  return [mode, setMode];
};

/** Ob überhaupt etwas vom Standard abweicht — nur dann gibt es ein Zurück. */
export function useAnsichtAbweichung(): [boolean, () => void] {
  const { mode, setMode, aus, setAus } = useContext(AnsichtCtx);
  const abweichend = ansichtSchreiben(mode) != null || aus.size > 0;
  return [
    abweichend,
    () => {
      setMode(() => ({}));
      setAus(new Set());
    },
  ];
}

/**
 * Spiegelt Schalter und Legendenauswahl in `?ansicht=` und `?aus=`, wie
 * `YearUrlSync` das Jahr. Der Kontext ist die Quelle, solange man blättert;
 * ein Wert, den wir nicht selbst geschrieben haben (frischer Link, Zurück-
 * Taste), gewinnt einmal.
 */
export function AnsichtUrlSync() {
  const { mode, setMode, aus, setAus } = useContext(AnsichtCtx);
  const [params, setParams] = useSearchParams();
  const geschrieben = useRef<{ ansicht: string | null; aus: string | null }>({ ansicht: null, aus: null });
  const pAnsicht = params.get("ansicht");
  const pAus = params.get("aus");

  useEffect(() => {
    const willAnsicht = ansichtSchreiben(mode);
    const willAus = ausSchreiben(aus);
    // Nur ein vorhandener Parameter gewinnt. Eine Seite ohne `?ansicht=` ist
    // kein Wunsch, die Ansicht zu loeschen — sonst ginge sie bei jedem Klick
    // auf einen Posten verloren, und genau das soll sie ja nicht.
    if (pAnsicht != null && pAnsicht !== willAnsicht && pAnsicht !== geschrieben.current.ansicht) {
      geschrieben.current.ansicht = pAnsicht;
      setMode(() => ansichtLesen(pAnsicht));
      return;
    }
    if (pAus != null && pAus !== willAus && pAus !== geschrieben.current.aus) {
      geschrieben.current.aus = pAus;
      setAus(ausLesen(pAus));
      return;
    }
    if (pAnsicht === willAnsicht && pAus === willAus) {
      geschrieben.current = { ansicht: pAnsicht, aus: pAus };
      return;
    }
    geschrieben.current = { ansicht: willAnsicht, aus: willAus };
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [schluessel, wert] of [["ansicht", willAnsicht], ["aus", willAus]] as const) {
          if (wert == null) next.delete(schluessel);
          else next.set(schluessel, wert);
        }
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [pAnsicht, pAus, mode, aus, setMode, setAus, setParams]);

  return null;
}

/**
 * Scroll to the section a deep link names. The sections only exist once the
 * data is there, so this waits for `bereit` and then runs once per address.
 */
export function useTeilScroll(teil: string | undefined, bereit: boolean) {
  const erledigt = useRef<string | null>(null);
  useEffect(() => {
    if (!teil || !bereit || erledigt.current === teil) return;
    const el = document.getElementById(teil);
    if (!el) return;
    erledigt.current = teil;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [teil, bereit]);
}
