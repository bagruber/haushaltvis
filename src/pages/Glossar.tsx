import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useData } from "@/lib/data";
import { usePageTitle } from "@/lib/title";
import { Loading } from "@/components/ui";

export function Glossar() {
  usePageTitle("Glossar");
  const { data } = useData();
  const { hash } = useLocation();

  const entries = data
    ? Object.entries(data.glossar).sort((a, b) => a[1].title.localeCompare(b[1].title, "de"))
    : [];

  // Jump to the anchored term when arriving via /glossar#id (also after data loads).
  useEffect(() => {
    if (!hash || !entries.length) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-gold-500");
      const t = setTimeout(() => el.classList.remove("ring-2", "ring-gold-500"), 1600);
      return () => clearTimeout(t);
    }
  }, [hash, entries.length]);

  if (!data) return <Loading />;

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold">Glossar</h1>
        <p className="text-ink-soft">
          Fachbegriffe der Kameralistik und kommunaler Haushalte — kurz und
          verständlich erklärt.
        </p>
      </header>

      <dl className="space-y-3">
        {entries.map(([id, e]) => (
          <div
            key={id}
            id={id}
            className="scroll-mt-28 rounded-lg border border-ink-line bg-white p-4 shadow-soft transition-shadow"
          >
            <dt className="font-display text-lg font-bold">{e.title}</dt>
            <dd className="mt-1 text-ink-soft">{e.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
