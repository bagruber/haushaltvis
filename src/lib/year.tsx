import { createContext, useContext, useState, type ReactNode } from "react";
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
