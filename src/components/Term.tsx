import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { useData } from "@/lib/data";

/**
 * Inline glossary term: dotted-underlined text that reveals a short definition
 * on hover/focus, plus a link to the full glossary entry. Unknown ids render
 * their children plainly.
 */
export function Term({ name, children }: { name: string; children: React.ReactNode }) {
  const { data } = useData();
  const [open, setOpen] = useState(false);
  const id = useId();
  const entry = data?.glossar?.[name];
  if (!entry) return <>{children}</>;
  return (
    // Round 1: the faint dotted underline went unnoticed. A thicker gold
    // underline marks the term; a tap opens it too, not only hover or focus.
    <span
      className="relative cursor-help underline decoration-gold-600 decoration-dotted decoration-2 underline-offset-4"
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          // Keep focus on the term while the glossary link inside is clicked.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 bottom-full z-30 mb-1 w-64 rounded-lg border border-ink-line bg-white p-3 text-xs font-normal leading-snug text-ink-soft shadow-lift"
        >
          {entry.text}
          <Link to={`/glossar#${name}`} className="mt-1.5 flex items-center gap-1 text-red-600 hover:underline">
            Im Glossar nachschlagen <ArrowRight size={12} aria-hidden />
          </Link>
        </span>
      )}
    </span>
  );
}
