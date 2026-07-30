import { Link } from "react-router-dom";
import { usePageTitle } from "@/lib/title";

/**
 * Placeholder while the thematic view is unreleased: the M:N assignment of
 * Haushaltsstellen to Themen is a working draft and not authorised by the city,
 * so no thematic figures are shown anywhere in the public app.
 */
export function Themen() {
  usePageTitle("Themen");
  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="eyebrow text-ink-muted">In Vorbereitung</p>
        <h1 className="headline text-3xl">Themen</h1>
      </header>

      <div className="border-l-2 border-gold-500 pl-5 space-y-3">
        <p className="text-ink-soft">
          Diese Ansicht soll den Haushalt nach Lebensbereichen bündeln — Bildung, Mobilität,
          Kultur — statt nach kameralen Aktenzeichen. Ein Posten kann dabei zu mehreren Themen
          gehören.
        </p>
        <p className="text-ink-soft">
          Die dafür nötige Zuordnung der rund 4.300 Haushaltsstellen ist ein Entwurf und{" "}
          <b>von der Stadt Moosburg bislang nicht freigegeben</b>. Solange sie ungeprüft ist,
          zeigen wir keine thematischen Summen — auch nicht als Vorschau. Eine Fehlzuordnung
          wäre sonst nicht von einer belastbaren Zahl zu unterscheiden.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Was bis dahin verfügbar ist</h2>
        <p className="text-ink-soft">
          Die kameralen Ansichten beruhen unmittelbar auf den amtlichen Haushaltsdaten und sind
          uneingeschränkt nutzbar:
        </p>
        <ul>
          {[
            ["/erkunden", "Geldfluss", "Einnahmen und Ausgaben des Gesamthaushalts, bis zur einzelnen Haushaltsstelle."],
            ["/erkunden/investitionen", "Investitionen", "Vorhaben des Vermögenshaushalts mit Förderung und Eigenanteil."],
            ["/erkunden/querschnitte", "Querschnitte", "Kostenblöcke wie Personal, Bauen oder Energie über den ganzen Haushalt hinweg."],
          ].map(([to, title, text]) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex gap-3 border-b border-ink-line py-3 hover:border-ink-soft transition-colors"
              >
                <span className="text-ink-muted group-hover:text-red-600 transition-colors" aria-hidden>→</span>
                <span>
                  <span className="block font-semibold group-hover:text-red-600 transition-colors">{title}</span>
                  <span className="block text-sm text-ink-muted">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
