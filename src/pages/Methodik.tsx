import { Term } from "@/components/Term";
import { usePageTitle } from "@/lib/title";
import { latestYear, useData } from "@/lib/data";
import { fmtDatum } from "@/lib/format";

export function Methodik() {
  usePageTitle("Methodik & Datengrundlage");
  const { data } = useData();
  const entwurf = data?.budget.meta.entwurf;
  const letztes = data ? latestYear(data.budget) : 2026;
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="headline text-3xl">Methodik & Datengrundlage</h1>

      <div className="rounded-xl border border-gold-500/50 bg-gold-100/60 p-4 text-sm">
        <p className="font-semibold text-ink">Hinweis: teilweise KI-unterstützt</p>
        <p className="mt-1 text-ink-soft">
          KI hat <b>teilweise unterstützt</b>, und zwar bei den Erklärungstexten, der
          thematischen Zuordnung, dem Glossar und den Suchwörtern, unter denen die Suche
          Haushaltsstellen zusätzlich findet. Trotz sorgfältiger Prüfung können dort
          vereinzelt Fehler enthalten sein.
        </p>
        <p className="mt-2 text-ink-soft">
          Die Haushaltsdaten selbst hat keine KI bearbeitet. Python-Skripte lesen den Export
          der Stadt ein und bringen ihn in die Form, die diese Seite anzeigt; die Beträge der
          einzelnen Haushaltsstellen übernehmen sie dabei unverändert.
        </p>
        <p className="mt-2 text-ink-soft">
          Diese Seite ist ein bürgerschaftliches Transparenzprojekt und{" "}
          <b>keine amtliche Veröffentlichung</b>. Maßgeblich ist allein der offizielle
          Haushaltsplan der Stadt Moosburg a. d. Isar.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Woher die Daten stammen</h2>
        <p className="text-ink-soft">
          Grundlage sind die <Term name="kameralistik">kameralen</Term> Haushaltspläne der
          Stadt Moosburg. Erfasst sind die Jahre 2016–{letztes}, jeweils mit{" "}
          <Term name="ansatz">Ansatz</Term> (Plan) und, soweit vorhanden,{" "}
          <Term name="ergebnis">Ergebnis</Term> (Ist). Für das laufende Jahr gibt es nur den Plan.
        </p>
        {entwurf && (
          <p className="text-ink-soft">
            Dazu kommt {entwurf.jahr} als <b>Entwurf</b>: der Arbeitsplan der Kämmerei, Stand{" "}
            {fmtDatum(entwurf.stand)}. Er ist noch nicht beschlossen und überall als Entwurf
            gekennzeichnet. Wo die Kämmerei dort einen Ansatz erläutert, steht die Erläuterung
            wörtlich bei der Haushaltsstelle. Ausgelassen sind Vermerke, die ohne Vorwissen
            missverständlich wären, interne Arbeitsnotizen und Angaben zu Personen. Statt der
            Namen von Firmen und Fachsoftware steht in eckigen Klammern, was sie sind.
          </p>
        )}
        <p className="text-ink-soft">
          An den Beträgen ändert die Aufbereitung nichts. Nur Einrichtungen, die 2022/23 eine neue
          Gliederungsnummer bekamen, stehen unter der neuen Nummer; gibt es für ein Jahr beide,
          werden die Beträge dort addiert.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Die zwei Haushalte</h2>
        <p className="text-ink-soft">
          Buchhalterisch ist der Haushalt geteilt: der{" "}
          <Term name="verwaltungshaushalt">Verwaltungshaushalt</Term> (laufender Betrieb)
          und der <Term name="vermoegenshaushalt">Vermögenshaushalt</Term> (Investitionen).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Wie aggregiert wird</h2>
        <ul className="list-disc pl-5 text-ink-soft space-y-1">
          <li>
            <b>Vier Ebenen:</b> Gesamthaushalt → Einzelplan →{" "}
            <Term name="unterabschnitt">Unterabschnitt</Term> →{" "}
            <Term name="haushaltsstelle">Einzelposten</Term>.
          </li>
          <li>
            <b><Term name="interne-verrechnung">Interne Verrechnungen</Term></b> (Zuführungen
            zwischen den Haushalten, innere Verrechnungen, Rücklagen) sind in Übersichten
            ausgeblendet, da sie sonst doppelt zählen.
          </li>
          <li>
            <b>Themen sind eine zusätzliche Schicht (M:N):</b> Ein Posten kann mehreren
            Themen zugeordnet sein und zählt dann voll in jedem. Themen-Summen müssen daher
            nicht zur kameralen Gesamtsumme passen.
          </li>
          <li>
            <b>Investitionen</b> schwanken stark von Jahr zu Jahr und werden in Zeitverläufen
            gesondert behandelt (Balken statt Trendlinie).
          </li>
          <li>
            <b>Neu und nicht mehr vorhanden:</b> Eine Haushaltsstelle gibt es in einem Jahr, wenn
            sie dort eine Zeile hat, im Plan, im Entwurf oder in einem Zwischenstand. Fehlt die
            Zeile, gibt es sie nicht. Eine Stelle mit 0 € ist eine ganz normale Stelle.
          </li>
          <li>
            <b>Inflationsbereinigt</b> heißt: umgerechnet in die Preise eines Jahres, mit dem
            Verbraucherpreisindex im Jahresdurchschnitt. Für das laufende Jahr gibt es den noch
            nicht, dort zählt das Mittel der Monate bisher
            {entwurf && `, und der Entwurf ${entwurf.jahr} rechnet mit dem jüngsten Monat, also mit den Preisen von heute`}.
          </li>
          <li>
            <b>Pfeile in der Gesamtliste:</b> Sie vergleichen den Ansatz mit dem des Vorjahres,
            einmal in Euro, einmal nach Abzug der Teuerung und je Einwohner. Unter 2 % in beide
            Richtungen gilt als gleich geblieben. Die Teuerung ist der Verbraucherpreisindex zum
            Jahresbeginn, also der Dezember des Vorjahres; solange der fehlt, der jüngste Monat.
            Die Einwohnerzahl ist der Stand zum 31.12. des Vorjahres
            {entwurf && `, für ${entwurf.jahr} vorerst noch die von ${entwurf.jahr - 1}`}.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Weitere Informationen</h2>
        <p className="text-ink-soft">
          Verbindliche Auskünfte zum Haushalt gibt die Stadtkämmerei Moosburg a. d. Isar. Ein
          offener Datendownload ist für später geplant.
        </p>
      </section>
    </div>
  );
}
