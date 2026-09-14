// Small shared UI primitives, previously duplicated across pages.
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { kategorieTon } from "@/lib/kategorien";

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-line bg-white px-5 py-4">
      <Kennzahl wert={value} label={hint ? `${label}, ${hint}` : label} className="text-2xl" />
    </div>
  );
}

/**
 * A key figure: the number first, its label below in sentence case. Lining,
 * fixed-width digits so neighbouring figures sit on one baseline.
 */
export function Kennzahl({ wert, label, className }: { wert: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div>
      <div className={cn("whitespace-nowrap font-display text-3xl font-semibold leading-tight lining-nums tabular-nums", className)}>
        {wert}
      </div>
      <div className="mt-1 text-sm text-ink-muted">{label}</div>
    </div>
  );
}

export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="font-display text-lg font-bold border-b border-ink-line pb-2">{title}</h3>
      {hint && <p className="text-xs text-ink-muted mb-2">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </section>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-ink-line bg-cream px-2.5 py-1 text-xs text-ink-soft">
      {children}
    </span>
  );
}

/**
 * Holds the place of the (unreleased) thematic tags. Deliberately colourless:
 * it marks a gap without implying a classification exists.
 */
export function ThemaPlatzhalter() {
  return (
    <Link
      to="/themen"
      title="Die thematische Zuordnung ist noch nicht freigegeben"
      className="inline-flex items-center rounded-md px-1 hover:text-ink"
    >
      <RoseStatus className="text-xs">Thema folgt</RoseStatus>
    </Link>
  );
}

/** CSS mask for a file under public/, so the drawing takes a token colour. */
function maske(datei: string, position: string): CSSProperties {
  const url = `url(${import.meta.env.BASE_URL}${datei})`;
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskPosition: position,
    WebkitMaskPosition: position,
  };
}

/** The Moosburg rose, coloured by its background class (e.g. bg-red-700). */
export function Rose({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block shrink-0", className)} style={maske("rose.svg", "center")} />;
}

/** Project status: rose plus word. The word always carries the meaning. */
export function RoseStatus({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-ink-soft", className)}>
      <Rose className="h-4 w-4 bg-gold-500" />
      {children}
    </span>
  );
}

/**
 * Pen drawing as a quiet ground, anchored bottom right. Hidden below sm: under
 * roughly 200 px the lines smear. Colour and opacity come from the className.
 */
export function SketchGround({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute hidden select-none sm:block", className)}
      style={maske("sketches/rathausB.svg", "right bottom")}
    />
  );
}

/** Rainbow stripe: brand signature of the Moosburg design system. */
export function Stripe({ className }: { className?: string }) {
  return (
    <div className={cn("rainbow-stripe", className)} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
    </div>
  );
}

const KLECKS_PFAD =
  "M25 3.5c8.6.3 17.8 5.2 19.2 14.6 1.5 9.8-4 21.5-14.4 24.9C19.7 46.3 6.6 41.5 4.3 30.7 2 19.6 12.2 3 25 3.5z";
// Neighbours vary by rotating the one path, never by drawing a new one.
const KLECKS_DREHUNG = [undefined, "rotate(70deg)", "rotate(150deg) scaleX(-1)"];

/** Colour blob with the category icon on it. Decorative; the text carries the meaning. */
export function Klecks({ farbe, icon: Icon, dicht, variante = 0 }: {
  farbe: string;
  icon: Icon;
  dicht?: boolean;
  variante?: number;
}) {
  const ton = kategorieTon(farbe);
  const size = dicht ? 38 : 46;
  return (
    <span aria-hidden className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size, color: ton.text }}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" style={{ transform: KLECKS_DREHUNG[variante % 3] }}>
        <path d={KLECKS_PFAD} fill={ton.flaeche} />
      </svg>
      <Icon size={dicht ? 18 : 22} className="relative" />
    </span>
  );
}

/** Category line: icon plus name in the category colour (or a className colour). */
export function KategorieZeile({ farbe, icon: Icon, children, className }: {
  farbe?: string;
  icon: Icon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", className)}
      style={farbe ? { color: kategorieTon(farbe).text } : undefined}
    >
      <Icon size={16} aria-hidden className="shrink-0" />
      {children}
    </span>
  );
}

/**
 * Heading with the script word large and translucent behind it. The script is
 * aria-hidden, so the heading's accessible name stays the heading text.
 */
export function SeitenTitel({ script, as: Tag = "h1", className, scriptClassName, children }: {
  script?: string;
  as?: "h1" | "h2";
  className?: string;
  scriptClassName?: string;
  children: ReactNode;
}) {
  return (
    // The top margin keeps the script clear of whatever sits above the heading.
    <Tag className={cn("headline relative", script && "mt-[1.15em]", className)}>
      {script && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -left-[0.05em] -top-[0.7em] origin-bottom-left -rotate-6 select-none whitespace-nowrap font-script text-[1.45em] font-normal leading-none text-gold-500/55",
            scriptClassName,
          )}
        >
          {script}
        </span>
      )}
      <span className="relative">{children}</span>
    </Tag>
  );
}

/**
 * Page head of the main pages. Mobile: title top left. From sm on: rose as
 * placeholder for the tool logo and the pen drawing cut off bottom right.
 */
export function SeitenKopf({ titel, script, className, children }: {
  titel: ReactNode;
  script: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative sm:pb-10 sm:pt-4">
      {/* Only the drawing is cut off; clipping the whole head would also clip the script's swash. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <SketchGround className="-bottom-12 -right-10 h-[420px] w-[480px] bg-gold-500 opacity-30" />
      </div>
      <Rose className="relative mb-2 hidden h-16 w-16 bg-red-700 sm:block" />
      <SeitenTitel script={script} className={cn("max-w-[18ch] text-4xl", className)}>
        {titel}
      </SeitenTitel>
      {children && <div className="relative mt-4 max-w-2xl space-y-3 text-ink-soft">{children}</div>}
    </header>
  );
}

/**
 * Segmented control: one of a small set of mutually exclusive options.
 * Semantically a radiogroup (roving tabindex, arrow keys move the selection).
 * Selected is a white segment with ink text: no red, which stays reserved for
 * brand and deficit cues.
 */
export function SegmentedToggle<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  label?: string;
}) {
  const move = (delta: number) => {
    const i = options.findIndex(([k]) => k === value);
    const next = options[(i + delta + options.length) % options.length];
    if (next) onChange(next[0]);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg bg-cream-dark p-[3px] text-sm"
    >
      {options.map(([k, lbl]) => (
        <button
          key={k}
          role="radio"
          aria-checked={value === k}
          tabIndex={value === k ? 0 : -1}
          onClick={() => onChange(k)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
          }}
          className={cn(
            "rounded-[8px] px-3.5 py-1.5 transition-colors",
            value === k ? "bg-white font-semibold text-ink shadow-[0_1px_3px_rgb(28_28_28/0.12)]" : "text-ink-soft hover:text-ink",
          )}
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}

/** Loading placeholder: announced to screen readers, pulsing blocks for everyone else. */
export function Loading({ height = 320 }: { height?: number }) {
  return (
    <div role="status" className="space-y-3" style={{ minHeight: height }}>
      <span className="sr-only">Lade Daten …</span>
      <div aria-hidden className="animate-pulse space-y-3">
        <div className="h-6 w-1/3 rounded-md bg-cream-dark" />
        <div className="rounded-xl bg-cream-dark" style={{ height: Math.max(120, height - 60) }} />
      </div>
    </div>
  );
}
