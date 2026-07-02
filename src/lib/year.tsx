import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Budget } from "./data";

interface YearState {
  /** explicitly selected year, or null = use latest */
  year: number | null;
  setYear: (y: number | null) => void;
}

const YearCtx = createContext<YearState>({ year: null, setYear: () => {} });

export function YearProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number | null>(null);
  return <YearCtx.Provider value={{ year, setYear }}>{children}</YearCtx.Provider>;
}

export const useYearCtx = () => useContext(YearCtx);

/** Selected year for snapshot views, falling back to the latest available year. */
export function useSnapshotYear(budget: Budget): number {
  const { year } = useYearCtx();
  return year ?? Math.max(...budget.meta.years);
}

/**
 * Keeps the Stichjahr shareable: mirrors the year context into `?jahr=` and
 * adopts the param on deep links / back navigation. The context stays the
 * source of truth while browsing; a `jahr` value we didn't write ourselves
 * (fresh link, history) wins once. Rendered once inside the Layout.
 */
export function YearUrlSync() {
  const { year, setYear } = useYearCtx();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastWritten = useRef<string | null>(null);
  const param = searchParams.get("jahr");

  useEffect(() => {
    const want = year == null ? null : String(year);
    if (param === want) {
      lastWritten.current = param;
      return;
    }
    if (param != null && param !== lastWritten.current) {
      const y = Number(param);
      if (Number.isInteger(y)) {
        setYear(y);
        lastWritten.current = param;
        return;
      }
    }
    lastWritten.current = want;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (want == null) next.delete("jahr");
        else next.set("jahr", want);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [param, year, setYear, setSearchParams]);

  return null;
}
