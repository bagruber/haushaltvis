import { NavLink, Outlet } from "react-router-dom";
import { ListNumbers } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const tabs = [
  { to: "/erkunden", label: "Geldfluss", end: true },
  { to: "/erkunden/einnahmen", label: "Einnahmen" },
  { to: "/erkunden/investitionen", label: "Investitionen" },
  { to: "/erkunden/querschnitte", label: "Querschnitte" },
];

function tabClass({ isActive }: { isActive: boolean }) {
  return cn(
    "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors",
    isActive
      ? "bg-ink text-cream"
      : "bg-white border border-ink-line text-ink-soft hover:text-ink hover:border-ink-soft",
  );
}

/** Hub that groups the kameral views under one nav entry (nav slimming). */
export function ErkundenLayout() {
  return (
    <div className="space-y-6">
      <nav aria-label="Erkunden-Ansichten" className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 w-max">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={tabClass}>
              {t.label}
            </NavLink>
          ))}
          {/* Abgesetzt: die vier Reiter davor fassen zusammen und zeichnen,
              die Gesamtliste zeigt jede Haushaltsstelle als Tabelle. */}
          <span aria-hidden className="mx-1 w-px self-stretch bg-ink-line" />
          <NavLink to="/erkunden/gesamtliste" className={(s) => cn(tabClass(s), "inline-flex items-center gap-1.5")}>
            <ListNumbers size={16} aria-hidden />
            Gesamtliste
          </NavLink>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
