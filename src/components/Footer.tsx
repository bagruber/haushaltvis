import { Link } from "react-router-dom";
import { latestYear, useData } from "@/lib/data";
import { fmtDatum } from "@/lib/format";

export function Footer() {
  const { data } = useData();
  const b = data?.budget;
  const e = b?.meta.entwurf;
  return (
    <footer className="border-t border-ink-line mt-16">
      <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-ink-muted space-y-2">
        <nav className="flex flex-wrap gap-4">
          <Link to="/info" className="hover:text-ink">Über das Projekt</Link>
          <Link to="/methodik" className="hover:text-ink">Methodik & Daten</Link>
          <Link to="/glossar" className="hover:text-ink">Glossar</Link>
          <Link to="/barrierefreiheit" className="hover:text-ink">Barrierefreiheit</Link>
          <Link to="/impressum" className="hover:text-ink">Impressum</Link>
          <Link to="/datenschutz" className="hover:text-ink">Datenschutz</Link>
        </nav>
        <p>
          Haushalt der Stadt Moosburg an der Isar: bürgerschaftliches Transparenzprojekt,
          keine amtliche Veröffentlichung. Bei Erklärungstexten, Themenzuordnung und Glossar hat{" "}
          <Link to="/methodik" className="underline hover:text-ink">teilweise KI unterstützt</Link>; die
          Beträge stammen unverändert aus den Haushaltsdaten der Stadt.
        </p>
        <p>
          Datengrundlage: Haushaltspläne (Kameralistik), Jahre {b ? `${b.meta.years[0]}–${latestYear(b)}` : "ab 2016"}. Für
          das laufende Jahr nur der Plan.
          {e && ` Dazu ${e.jahr} als Entwurf aus dem Arbeitsplan der Kämmerei, Stand ${fmtDatum(e.stand)}.`}
        </p>
      </div>
    </footer>
  );
}
