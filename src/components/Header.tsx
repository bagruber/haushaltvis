import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Search } from "./Search";

const links = [
  { to: "/", label: "Überblick", end: true },
  { to: "/erkunden", label: "Erkunden" },
  { to: "/einnahmen", label: "Einnahmen" },
  { to: "/investitionen", label: "Investitionen" },
  { to: "/themen", label: "Themen" },
  { to: "/wofuer-zahle-ich", label: "Wofür zahle ich?" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "px-3 py-1.5 rounded-md transition-colors",
    isActive ? "bg-red-600 text-cream" : "text-ink-soft hover:bg-cream-dark hover:text-ink",
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-ink-line bg-cream/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-baseline gap-2 shrink-0" onClick={() => setOpen(false)}>
          <span className="font-display text-xl font-bold text-red-600">Haushalt</span>
          <span className="font-display text-xl text-ink">Moosburg</span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">
          <Search />
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md border border-ink-line p-2"
          aria-label="Menü"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="block w-5 text-center text-lg leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-ink-line bg-cream px-5 py-3 space-y-2">
          <Search />
          <nav className="grid gap-1 text-sm">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
