import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useData, searchIndex, searchRank } from "@/lib/data";
import { cn } from "@/lib/cn";

/** One search field for header and mobile panel; fixed width, no jump on focus. */
export function Search({ mobil, onNavigate }: { mobil?: boolean; onNavigate?: () => void }) {
  const { data } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<number | undefined>(undefined);

  const index = useMemo(() => (data ? searchIndex(data) : []), [data]);
  const results = useMemo(() => searchRank(index, q), [index, q]);
  const showList = open && results.length > 0;

  const go = (route: string) => {
    setQ("");
    setOpen(false);
    setActive(0);
    onNavigate?.();
    navigate(route);
  };

  return (
    <div className="relative">
      <MagnifyingGlass
        size={18}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        role="combobox"
        autoFocus={mobil}
        aria-expanded={showList}
        aria-controls="such-ergebnisse"
        aria-autocomplete="list"
        aria-activedescendant={showList ? `such-option-${active}` : undefined}
        value={q}
        placeholder="Suchen…"
        aria-label="Suche nach Einzelplänen, Einrichtungen, Posten und Nummern"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 120); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % results.length); }
          if (e.key === "ArrowUp" && results.length) { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
          if (e.key === "Enter" && results[active]) go(results[active].route);
          if (e.key === "Escape") { setQ(""); setOpen(false); setActive(0); }
        }}
        className={cn(
          "rounded-lg border border-ink-line bg-white pl-9 pr-3 text-[15px] placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-red-500",
          mobil ? "h-12 w-full" : "h-10 w-56",
        )}
      />
      {showList && (
        <ul
          id="such-ergebnisse"
          role="listbox"
          aria-label="Suchergebnisse"
          className={cn(
            "absolute top-full z-30 mt-1 max-h-80 overflow-auto rounded-lg border border-ink-line bg-white py-1 shadow-lift",
            mobil ? "inset-x-0" : "right-0 w-80",
          )}
          onMouseDown={() => { if (blurTimer.current) window.clearTimeout(blurTimer.current); }}
        >
          {results.map((r, i) => (
            <li
              key={r.route + r.label}
              id={`such-option-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.route)}
              className={
                "cursor-pointer px-3 py-1.5 text-sm " +
                (i === active ? "bg-cream-dark" : "")
              }
            >
              <span className="block truncate">{r.label}</span>
              <span className="block truncate text-xs text-ink-muted">{r.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
