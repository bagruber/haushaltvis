import { cn } from "@/lib/cn";

/**
 * Die Form, in der eine Serie im Diagramm steht. Die Legende zeichnet sie
 * nach, statt ein Allerweltskästchen zu zeigen: der gestrichelte Ansatz ist
 * gestrichelt, die Raute ist eine Raute.
 */
export type LegendenForm = "linie" | "gestrichelt" | "raute-hohl" | "raute-voll" | "linie-duenn" | "balken";

export interface LegendenEintrag {
  /** Serien-Kennung für den geteilten Link (ist, plan, gebucht …) */
  key: string;
  /** Name der Serie, wie ihn auch das Diagramm trägt */
  name: string;
  form: LegendenForm;
  farbe: string;
}

const AUS = "#a8a297";

/** Das Symbol der Serie, 26 × 14, damit die Raute nicht in die Breite gezogen wird. */
function Symbol({ form, farbe }: { form: LegendenForm; farbe: string }) {
  const raute = "M13 3.5 L18 7 L13 10.5 L8 7 Z";
  return (
    <svg viewBox="0 0 26 14" width="26" height="14" aria-hidden className="shrink-0">
      {form === "linie" && <line x1="1" y1="7" x2="25" y2="7" stroke={farbe} strokeWidth="3" strokeLinecap="round" />}
      {form === "linie-duenn" && <line x1="1" y1="7" x2="25" y2="7" stroke={farbe} strokeWidth="1.5" />}
      {form === "gestrichelt" && (
        <>
          <line x1="1" y1="7" x2="25" y2="7" stroke={farbe} strokeWidth="2" strokeDasharray="5 3" />
          <circle cx="13" cy="7" r="3.5" fill="#faf7f2" stroke={farbe} strokeWidth="2" />
        </>
      )}
      {form === "raute-hohl" && <path d={raute} fill="none" stroke={farbe} strokeWidth="2" />}
      {form === "raute-voll" && <path d={raute} fill={farbe} />}
      {form === "balken" && <rect x="9" y="2" width="8" height="10" fill={farbe} />}
    </svg>
  );
}

/**
 * Legende als Knopfreihe statt der eingebauten von ECharts: per Tastatur
 * erreichbar, mit den echten Symbolen, und was aus ist, sieht aus wie aus.
 *
 * Die Regel dahinter: hier steht, **was ich sehe**. Wie gerechnet wird, steht
 * in der Schalterzeile darunter.
 */
export function DiagrammLegende({ eintraege, an, setAn, onHervor }: {
  eintraege: LegendenEintrag[];
  an: (key: string) => boolean;
  setAn: (key: string, wert: boolean) => void;
  /** Name der hervorzuhebenden Serie, null beim Verlassen */
  onHervor?: (name: string | null) => void;
}) {
  if (eintraege.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="text-ink-muted">Zeigen</span>
      {eintraege.map((e) => {
        const sichtbar = an(e.key);
        return (
          <button
            key={e.key}
            type="button"
            aria-pressed={sichtbar}
            onClick={() => {
              setAn(e.key, !sichtbar);
              // Beim Ausblenden die Hervorhebung mitnehmen, sonst bleibt alles
              // andere blass, bis der Zeiger den Knopf verlaesst.
              if (sichtbar) onHervor?.(null);
            }}
            onMouseEnter={() => sichtbar && onHervor?.(e.name)}
            onMouseLeave={() => onHervor?.(null)}
            onFocus={() => sichtbar && onHervor?.(e.name)}
            onBlur={() => onHervor?.(null)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-cream-dark",
              sichtbar ? "text-ink-soft" : "text-ink-muted line-through decoration-ink-muted",
            )}
          >
            <Symbol form={e.form} farbe={sichtbar ? e.farbe : AUS} />
            {e.name}
          </button>
        );
      })}
    </div>
  );
}
