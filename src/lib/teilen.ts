import { useEffect, useMemo, useRef } from "react";
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
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useAnsicht();
  const roh = params.get("aus");
  const aus = useMemo(
    () => new Set((roh ?? "").split(",").filter((k) => (SERIEN as readonly string[]).includes(k)) as SerieKey[]),
    [roh],
  );
  const an = (key: string) => (key === "invest" ? !!mode.showInvest : !aus.has(key as SerieKey));
  const setAn = (key: string, wert: boolean) => {
    if (key === "invest") {
      setMode((m) => ({ ...m, showInvest: wert }));
      return;
    }
    const naechste = new Set(aus);
    if (wert) naechste.delete(key as SerieKey);
    else naechste.add(key as SerieKey);
    const wort = SERIEN.filter((k) => naechste.has(k)).join(",");
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (wort) next.set("aus", wort);
        else next.delete("aus");
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  return { aus, an, setAn };
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

/**
 * The timeline switches, kept in `?ansicht=` so a shared link shows the picture
 * the sender was looking at. Replaces the page-local useState: every flip
 * rewrites the URL in place (`replace`), so the back button leaves the page
 * instead of walking back through the switches.
 */
export function useAnsicht(): [TimelineMode, (fn: (m: TimelineMode) => TimelineMode) => void] {
  const [params, setParams] = useSearchParams();
  const roh = params.get("ansicht");
  // Stable object per parameter value: the charts memoise on `mode`.
  const mode = useMemo(() => ansichtLesen(roh), [roh]);
  const setMode = (fn: (m: TimelineMode) => TimelineMode) => {
    const wert = ansichtSchreiben(fn(mode));
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (wert == null) next.delete("ansicht");
        else next.set("ansicht", wert);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };
  return [mode, setMode];
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
