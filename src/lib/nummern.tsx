import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Official numbers (Gliederung, Haushaltsstelle) on demand. The same Posten
 * name recurs across many Einrichtungen, so the number is the only unambiguous
 * reference. The choice follows the reader across pages and visits.
 */
const NummernCtx = createContext<{ zeigen: boolean; setZeigen: (v: boolean) => void }>({
  zeigen: false,
  setZeigen: () => {},
});

const SCHLUESSEL = "haushalt-nummern";

export function NummernProvider({ children }: { children: ReactNode }) {
  const [zeigen, setState] = useState(() => {
    try {
      return localStorage.getItem(SCHLUESSEL) === "1";
    } catch {
      return false;
    }
  });
  const setZeigen = (v: boolean) => {
    setState(v);
    try {
      localStorage.setItem(SCHLUESSEL, v ? "1" : "0");
    } catch {
      // private mode: the switch still works for this visit
    }
  };
  return <NummernCtx.Provider value={{ zeigen, setZeigen }}>{children}</NummernCtx.Provider>;
}

export const useNummern = () => useContext(NummernCtx);

/**
 * Labels that occur more than once in one list. Those rows show their number
 * even with the switch off, otherwise two rows would read identically.
 */
export function doppelte(labels: string[]): Set<string> {
  const seen = new Set<string>();
  const twice = new Set<string>();
  for (const l of labels) (seen.has(l) ? twice : seen).add(l);
  return twice;
}

export function NummernSchalter({ className }: { className?: string }) {
  const { zeigen, setZeigen } = useNummern();
  return (
    <label className={`flex cursor-pointer items-center gap-1.5 text-xs ${className ?? ""}`}>
      <input type="checkbox" checked={zeigen} onChange={(e) => setZeigen(e.target.checked)} />
      <span>Nummern zeigen</span>
    </label>
  );
}

/** Number in front of a list label: shown when switched on or when the label is ambiguous. */
export function Nummer({ wert, sichtbar }: { wert: string; sichtbar: boolean }) {
  if (!sichtbar) return null;
  return <span className="mr-2 shrink-0 text-xs text-ink-muted tabular-nums">{wert}</span>;
}
