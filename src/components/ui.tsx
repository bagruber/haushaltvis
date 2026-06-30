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

/** Segmented control: one of a small set of mutually exclusive options. */
export function SegmentedToggle<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-lg border border-ink-line bg-cream p-0.5 text-sm">
      {options.map(([k, lbl]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className={
            "px-3 py-1 rounded-md transition-colors " +
            (value === k ? "bg-red-600 text-cream" : "text-ink-soft hover:text-ink")
          }
        >
          {lbl}
        </button>
      ))}
    </div>
  );
}
