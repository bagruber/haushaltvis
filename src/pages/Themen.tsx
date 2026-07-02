import { Link } from "react-router-dom";
import { useData } from "@/lib/data";
import { usePageTitle } from "@/lib/title";

export function Themen() {
  usePageTitle("Themen");
  const { data } = useData();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Themen</h1>
      <p className="text-ink-soft max-w-2xl">
        Jeder Haushaltsposten ist einem oder mehreren Themen zugeordnet. Die Detail-Ansichten
        (Zeitverlauf von Ansatz &amp; Ergebnis, wichtige Ereignisse) folgen in Kürze.
      </p>
      {data && (
        <ul className="grid sm:grid-cols-2 gap-3">
          {Object.entries(data.themes.themes).map(([id, t]) => (
            <li key={id}>
              <Link
                to={`/themen/${id}`}
                className="block h-full rounded-lg border border-ink-line bg-white p-4 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: t.color }} />
                  <span className="font-semibold">{t.label}</span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{t.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
