import { Link } from "react-router-dom";
import { ArrowRight, FlowArrow, SquaresFour, Wrench } from "@phosphor-icons/react";
import { usePageTitle } from "@/lib/title";
import { Klecks, RoseStatus, SeitenKopf } from "@/components/ui";
import { GOLD_BASE } from "@/lib/colors";

/**
 * Placeholder while the thematic view is unreleased: the M:N assignment of
 * Haushaltsstellen to Themen is a working draft and not authorised by the city,
 * so no thematic figures are shown anywhere in the public app.
 */
export function Themen() {
  usePageTitle("Themen");
  return (
    <div className="max-w-2xl space-y-8">
      <SeitenKopf titel="Themen" script="bald">
        <RoseStatus>In Vorbereitung</RoseStatus>
      </SeitenKopf>

      <div className="space-y-3 rounded-lg border border-gold-200 bg-gold-100 p-5">
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
          {([
            ["/erkunden", "Geldfluss", "Einnahmen und Ausgaben des Gesamthaushalts, bis zur einzelnen Haushaltsstelle.", FlowArrow],
            ["/erkunden/investitionen", "Investitionen", "Vorhaben des Vermögenshaushalts mit Förderung und Eigenanteil.", Wrench],
            ["/erkunden/querschnitte", "Querschnitte", "Kostenblöcke wie Personal, Bauen oder Energie über den ganzen Haushalt hinweg.", SquaresFour],
          ] as const).map(([to, title, text, icon], i) => (
            <li key={to}>
              <Link
                to={to}
                className="group grid grid-cols-[38px_1fr_18px] items-center gap-3 border-b border-ink-line py-3 hover:border-ink-soft transition-colors"
              >
                <Klecks farbe={GOLD_BASE} icon={icon} dicht variante={i} />
                <span>
                  <span className="block font-semibold group-hover:text-red-600 transition-colors">{title}</span>
                  <span className="block text-sm text-ink-muted">{text}</span>
                </span>
                <ArrowRight size={18} aria-hidden className="text-ink-muted group-hover:text-ink transition-colors" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
