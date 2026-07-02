// Small shared UI primitives, previously duplicated across pages.

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-line bg-white px-5 py-4 shadow-soft">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-ink">{value}</div>
      {hint && <div className="text-xs text-ink-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-line bg-white p-4 shadow-soft">
      <h3 className="font-display text-lg font-bold">{title}</h3>
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
 * Segmented control: one of a small set of mutually exclusive options.
 * Semantically a radiogroup (roving tabindex, arrow keys move the selection).
 * Selected state is ink, not red — red stays reserved for brand + deficit cues.
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
      className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5 text-sm"
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
          className={
            "px-3 py-1 rounded-md transition-colors " +
            (value === k ? "bg-ink text-cream" : "text-ink-soft hover:text-ink")
          }
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
