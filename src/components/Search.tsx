import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData, searchIndex, searchRank } from "@/lib/data";

export function Search() {
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
    navigate(route);
  };

  return (
    <div className="relative">
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls="such-ergebnisse"
        aria-autocomplete="list"
        aria-activedescendant={showList ? `such-option-${active}` : undefined}
        value={q}
        placeholder="Suchen…"
        aria-label="Suche nach Themen, Einzelplänen und Einrichtungen"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 120); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % results.length); }
          if (e.key === "ArrowUp" && results.length) { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
          if (e.key === "Enter" && results[active]) go(results[active].route);
          if (e.key === "Escape") { setQ(""); setOpen(false); setActive(0); }
        }}
        className="w-36 sm:w-48 rounded-md border border-ink-line bg-white px-3 py-1.5 text-sm focus:w-56 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
      />
      {showList && (
        <ul
          id="such-ergebnisse"
          role="listbox"
          aria-label="Suchergebnisse"
          className="absolute right-0 top-full z-30 mt-1 w-72 max-h-80 overflow-auto rounded-lg border border-ink-line bg-white py-1 shadow-lift"
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
                "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm " +
                (i === active ? "bg-cream-dark" : "")
              }
            >
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 text-xs text-ink-muted">{r.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
