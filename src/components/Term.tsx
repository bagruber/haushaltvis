import { useState } from "react";
import { useData } from "@/lib/data";

/**
 * Inline glossary term: dotted-underlined text that reveals its definition on
 * hover/focus. Unknown ids just render their children plainly.
 */
export function Term({ name, children }: { name: string; children: React.ReactNode }) {
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const def = data?.glossar?.[name];
  if (!def) return <>{children}</>;
  return (
    <span
      className="relative cursor-help underline decoration-dotted decoration-ink-muted underline-offset-2"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 bottom-full z-30 mb-1 w-64 rounded-lg border border-ink-line bg-white p-3 text-xs font-normal leading-snug text-ink-soft shadow-lift"
        >
          {def}
        </span>
      )}
    </span>
  );
}
