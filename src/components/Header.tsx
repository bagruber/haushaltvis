import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const links = [
  { to: "/", label: "Überblick", end: true },
  { to: "/erkunden", label: "Erkunden" },
  { to: "/einnahmen", label: "Einnahmen" },
  { to: "/investitionen", label: "Investitionen" },
  { to: "/themen", label: "Themen" },
  { to: "/info", label: "Info" },
];

export function Header() {
  return (
    <header className="border-b border-ink-line bg-cream/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-red-600">Haushalt</span>
          <span className="font-display text-xl text-ink">Moosburg</span>
        </NavLink>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  isActive
                    ? "bg-red-600 text-cream"
                    : "text-ink-soft hover:bg-cream-dark hover:text-ink",
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
