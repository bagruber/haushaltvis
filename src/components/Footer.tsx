import { Link } from "react-router-dom";

export function Footer() {
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
          Haushalt der Stadt Moosburg an der Isar — bürgerschaftliches Transparenzprojekt,
          keine amtliche Veröffentlichung. Die Datenaufbereitung ist{" "}
          <Link to="/methodik" className="underline hover:text-ink">KI-gestützt</Link> und kann
          vereinzelt Fehler enthalten.
        </p>
        <p>
          Datengrundlage: Haushaltspläne (Kameralistik), Jahre 2016–2026. Werte des laufenden Jahres vorläufig.
        </p>
      </div>
    </footer>
  );
}
