import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowSquareOut,
  BookOpen,
  CaretDown,
  Envelope,
  FlowArrow,
  House,
  Info,
  MagnifyingGlass,
  Scroll,
  SquaresFour,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Search } from "./Search";
import { Rose, Stripe } from "./ui";

const links = [
  { to: "/", label: "Überblick", icon: House, end: true },
  { to: "/erkunden", label: "Erkunden", icon: FlowArrow },
  { to: "/themen", label: "Themen", icon: SquaresFour },
  { to: "/wofuer-zahle-ich", label: "Wofür zahle ich?", icon: Wallet },
];

// Active state is ink, not red: in a finance UI red reads as "deficit",
// so it stays reserved for the brand wordmark and true warning cues.
// (Probe Formsprache: the proposal shows red here; the Haushalt rule wins.)
function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center whitespace-nowrap border-b-2 pt-0.5 transition-colors",
    isActive ? "border-ink font-semibold text-ink" : "border-transparent text-ink-soft hover:text-ink",
  );
}

/**
 * One row: stripe on the top edge, wordmark, navigation, search, "Über das
 * Projekt". Below lg the navigation moves to the tab bar at the bottom.
 */
export function Header() {
  const [suche, setSuche] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setSuche(false), [pathname]);

  return (
    // No backdrop-blur: it would turn the header into the containing block of
    // the fixed "Über das Projekt" sheet on mobile.
    <header className="sticky top-0 z-40 border-b border-ink-line bg-cream">
      <Stripe />
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <Rose className="h-6 w-6 bg-red-700" />
          <span className="font-display text-xl">
            <span className="font-semibold text-red-600">Haushalt</span> Moosburg
          </span>
        </Link>

        <nav aria-label="Hauptnavigation" className="ml-auto hidden h-full items-stretch gap-5 text-[15px] lg:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <span aria-hidden className="hidden h-7 w-px bg-ink-line lg:block" />
        <div className="hidden lg:block">
          <Search />
        </div>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-cream-dark hover:text-ink lg:hidden"
            aria-label={suche ? "Suche schließen" : "Suche öffnen"}
            aria-expanded={suche}
            aria-controls="suche-mobil"
            onClick={() => setSuche((s) => !s)}
          >
            {suche ? <X size={22} aria-hidden /> : <MagnifyingGlass size={22} aria-hidden />}
          </button>
          <UeberDasProjekt />
        </div>
      </div>

      {suche && (
        <div id="suche-mobil" className="border-t border-ink-line px-5 py-3 lg:hidden">
          <Search mobil onNavigate={() => setSuche(false)} />
        </div>
      )}
    </header>
  );
}

/** Bottom tab bar below lg: the four main destinations, icon plus label. */
export function TabLeiste() {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-line bg-white px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn("flex flex-col items-center gap-1 text-center text-xs leading-tight", isActive ? "font-semibold text-ink" : "text-ink-soft")
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn("grid h-[30px] w-14 place-items-center rounded-full", isActive && "bg-cream-dark")}>
                <Icon size={22} aria-hidden />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const PROJEKT_LINKS = [
  { to: "/info", label: "Über das Projekt", icon: Info },
  { to: "/methodik", label: "Methodik und Daten", icon: Scroll },
  { to: "/glossar", label: "Glossar", icon: BookOpen },
  { to: "/impressum", label: "Impressum und Kontakt", icon: Envelope },
];

/**
 * Disclosure, not a menu: button with aria-expanded, Esc and a click outside
 * close it, focus returns to the button. Desktop: panel under the button.
 * Mobile: sheet from the bottom.
 */
function UeberDasProjekt() {
  const [offen, setOffen] = useState(false);
  const knopf = useRef<HTMLButtonElement>(null);
  const bereich = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { pathname } = useLocation();
  useEffect(() => setOffen(false), [pathname]);

  useEffect(() => {
    if (!offen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOffen(false);
        knopf.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!bereich.current?.contains(e.target as Node)) setOffen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [offen]);

  return (
    <div ref={bereich} className="relative">
      <button
        ref={knopf}
        type="button"
        aria-expanded={offen}
        aria-controls={panelId}
        onClick={() => setOffen((o) => !o)}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-[15px] text-ink-soft hover:bg-cream-dark hover:text-ink"
      >
        <Info size={22} aria-hidden className="lg:hidden" />
        <Info size={18} aria-hidden className="hidden lg:block" />
        <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">Über das Projekt</span>
        <CaretDown size={14} aria-hidden className={cn("hidden transition-transform lg:block", offen && "rotate-180")} />
      </button>

      {offen && (
        <>
          <div aria-hidden className="fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={() => setOffen(false)} />
          <div
            id={panelId}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-lg border border-ink-line bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lift lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-0 lg:top-full lg:mt-2 lg:w-96 lg:rounded-lg lg:pb-5"
          >
            <p className="font-display text-lg font-semibold">Haushalt Moosburg</p>
            <p className="mt-1 text-sm text-ink-soft">
              Der Haushalt der Stadt Moosburg an der Isar, verständlich aufbereitet bis zur einzelnen Haushaltsstelle.
            </p>
            <p className="mt-3 rounded-md bg-cream-dark px-3 py-2 text-sm text-ink-soft">
              Privates Projekt, kein Auftritt der Stadt. Verbindlich ist der offizielle Haushaltsplan.
            </p>
            <ul className="mt-3 text-[15px]">
              {PROJEKT_LINKS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-cream-dark">
                    <Icon size={18} aria-hidden className="text-ink-muted" />
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/bagruber/haushaltvis/issues"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-cream-dark"
                >
                  <ArrowSquareOut size={18} aria-hidden className="text-ink-muted" />
                  Fehler melden
                </a>
              </li>
            </ul>
            <p className="mt-2 flex flex-wrap gap-x-4 px-2 text-sm text-ink-muted">
              <Link to="/barrierefreiheit" className="hover:text-ink">Barrierefreiheit</Link>
              <Link to="/datenschutz" className="hover:text-ink">Datenschutz</Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
