import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData, searchIndex, searchRank } from "@/lib/data";

export function Search() {
  const { data } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);

  const index = useMemo(() => (data ? searchIndex(data) : []), [data]);
  const results = useMemo(() => searchRank(index, q), [index, q]);

  const go = (route: string) => {
    setQ("");
    setOpen(false);
    navigate(route);
  };

  return (
    <div className="relative">
      <input
        type="search"
        value={q}
        placeholder="Suchen…"
        aria-label="Suche nach Themen, Einzelplänen und Einrichtungen"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = window.setTimeout(() => setOpen(false), 120); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0].route);
          if (e.key === "Escape") { setQ(""); setOpen(false); }
        }}
        className="w-36 sm:w-48 rounded-md border border-ink-line bg-white px-3 py-1.5 text-sm focus:w-56 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
      />
      {open && results.length > 0 && (
        <ul
          className="absolute right-0 top-full z-30 mt-1 w-72 max-h-80 overflow-auto rounded-lg border border-ink-line bg-white py-1 shadow-lift"
          onMouseDown={() => { if (blurTimer.current) window.clearTimeout(blurTimer.current); }}
        >
          {results.map((r) => (
            <li key={r.route + r.label}>
              <button
                onClick={() => go(r.route)}
                className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-cream-dark"
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-ink-muted">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
