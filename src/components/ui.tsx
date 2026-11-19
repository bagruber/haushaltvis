// Small shared UI primitives, previously duplicated across pages.
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Check, Copy, LinkSimple, ShareNetwork, X, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { geladeneDaten } from "@/lib/data";
import { kategorieTon } from "@/lib/kategorien";
import { KLECKS_DREHUNG, KLECKS_PFAD } from "@/lib/marke.mjs";
import { mitJahr, teilUrl } from "@/lib/teilen";
import { standardJahr, useYearCtx, zeigtJahr } from "@/lib/year";

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
 * Kleine Marke in einer Liste: die Stelle ist gegenüber dem Vorjahr neu oder
 * gibt es nicht mehr. Ohne Farbe, das Ausgrauen der Zeile trägt das Gewicht.
 */
export function WechselMarke({ wechsel, className }: { wechsel: "neu" | "weg" | null | undefined; className?: string }) {
  if (!wechsel) return null;
  return (
    <span className={cn("ml-2 inline-block rounded border border-ink-line px-1 text-[11px] leading-4 text-ink-soft no-underline", className)}>
      {wechsel === "neu" ? "neu" : "nicht mehr vorhanden"}
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
    // The script reaches well into the heading; the top margin keeps it clear
    // of whatever sits above.
    <Tag className={cn("headline relative", script && "mt-[0.85em]", className)}>
      {script && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -left-[0.05em] -top-[0.42em] origin-bottom-left -rotate-6 select-none whitespace-nowrap font-script text-[1.45em] font-normal leading-none text-gold-500/55",
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

/**
 * The share action. On touch devices the system share sheet, where the
 * messengers are. Elsewhere a dialog with the link to copy: desktop browsers
 * differ too much there, some have no share sheet at all, and Windows opens
 * one of its own. `ziel` is the app path the link opens; with `abschnitt` the
 * shared address is that section's instead of the current page's. Where the
 * page depends on the year, the link always carries the one shown.
 */
function useTeilen(ziel: string, abschnitt: boolean, titel?: string): [() => void, ReactNode] {
  const [link, setLink] = useState<{ url: string; title: string } | null>(null);
  const { year } = useYearCtx();
  const teilen = () => {
    let url = abschnitt ? teilUrl(window.location.href, ziel) : window.location.href;
    const daten = geladeneDaten();
    if (daten && zeigtJahr(ziel)) url = mitJahr(url, year ?? standardJahr(daten.budget, ziel));
    const title = titel ? `${titel} · ${document.title}` : document.title;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    setLink({ url, title });
  };
  const dialog = link && <TeilenDialog {...link} onClose={() => setLink(null)} />;
  return [teilen, dialog];
}

/**
 * Modal with the link in a field and a copy button. Native `<dialog>`: it
 * keeps focus inside, closes on Esc and returns focus to the share button.
 * Rendered into `body`, because the link icon sits inside headings.
 */
function TeilenDialog({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const feld = useRef<HTMLParagraphElement>(null);
  const knopf = useRef<HTMLButtonElement>(null);
  const [kopiert, setKopiert] = useState(false);
  const titelId = useId();

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    knopf.current?.focus();
  }, []);

  const kopieren = () =>
    navigator.clipboard.writeText(url).then(
      () => setKopiert(true),
      // Without clipboard access the link gets selected, ready for Ctrl+C.
      () => feld.current && window.getSelection()?.selectAllChildren(feld.current),
    );

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={titelId}
      onClose={onClose}
      onClick={(e) => {
        // The portal still bubbles through React to the button's ancestors.
        e.stopPropagation();
        // A click beside the box lands on the dialog itself, not its content.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[min(34rem,calc(100%-2rem))] rounded-lg border border-ink-line bg-white text-ink shadow-lift backdrop:bg-ink/20"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titelId} className="font-display text-lg font-semibold">Link teilen</h2>
            <p className="mt-1 text-sm text-ink-soft">{title}</p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Schließen"
            className="-m-1 shrink-0 rounded-md p-1 text-ink-muted transition-colors hover:bg-cream-dark hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2">
          {/* Whole and wrapped rather than a one-line field, which would cut
              off the end: the number and the chosen view. It wraps only after
              / ? &, so a number stays in one piece. One click selects it. */}
          <p
            ref={feld}
            className="min-h-10 min-w-0 flex-1 select-all rounded-lg border border-ink-line bg-cream px-3 py-2 text-sm [overflow-wrap:anywhere]"
          >
            {url.split(/(?<=[/?&])/).map((teil, i) => (
              <span key={i}>{teil}<wbr /></span>
            ))}
          </p>
          <button
            ref={knopf}
            type="button"
            onClick={kopieren}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-semibold text-cream transition-colors hover:bg-ink-soft"
          >
            {kopiert ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            <span aria-live="polite">{kopiert ? "Kopiert" : "Kopieren"}</span>
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

/**
 * Share the current page, or with `pfad` the one section the button sits on.
 * The URL already carries the Stichjahr, the view switches and calculator input.
 */
export function Teilen({ hell, label = "Teilen", className, pfad, titel }: {
  hell?: boolean;
  label?: string;
  className?: string;
  /** section address, e.g. "/bereich/21"; without it the current page is shared */
  pfad?: string;
  /** section heading, put in front of the page title */
  titel?: string;
}) {
  const { pathname } = useLocation();
  const [teilen, dialog] = useTeilen(pfad ?? pathname, pfad != null, titel);
  return (
    <>
      <button
        type="button"
        onClick={teilen}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors",
          hell ? "bg-cream/15 text-cream hover:bg-cream/25" : "bg-cream-dark text-ink hover:bg-ink-line",
          className,
        )}
      >
        <ShareNetwork size={16} aria-hidden />
        {label}
      </button>
      {dialog}
    </>
  );
}

/**
 * Link to this section, next to its heading. Icon only and always visible:
 * on touch there is no hover to reveal it.
 */
export function AbschnittLink({ pfad, titel, className }: { pfad: string; titel: string; className?: string }) {
  const [teilen, dialog] = useTeilen(pfad, true, titel);
  return (
    <>
      <button
        type="button"
        onClick={teilen}
        aria-label="Link zu diesem Abschnitt teilen"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md p-1 text-ink-muted transition-colors hover:bg-cream-dark hover:text-ink",
          className,
        )}
      >
        <LinkSimple size={16} aria-hidden />
      </button>
      {dialog}
    </>
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
