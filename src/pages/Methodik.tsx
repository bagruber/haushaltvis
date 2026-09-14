import { Term } from "@/components/Term";
import { usePageTitle } from "@/lib/title";

export function Methodik() {
  usePageTitle("Methodik & Datengrundlage");
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="headline text-3xl">Methodik & Datengrundlage</h1>

      <div className="rounded-xl border border-gold-500/50 bg-gold-100/60 p-4 text-sm">
        <p className="font-semibold text-ink">Hinweis: teilweise KI-unterstützt</p>
        <p className="mt-1 text-ink-soft">
          KI hat <b>teilweise unterstützt</b>, und zwar bei den Erklärungstexten, der
          thematischen Zuordnung und dem Glossar. Trotz sorgfältiger Prüfung können dort
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
          Stadt Moosburg. Erfasst sind die Jahre 2016–2026, jeweils mit{" "}
          <Term name="ansatz">Ansatz</Term> (Plan) und — soweit vorhanden —{" "}
          <Term name="ergebnis">Ergebnis</Term> (Ist). Für das laufende Jahr steht nur der Plan; sein Ergebnis wird erst im Jahresverlauf gebucht und daher nicht ausgewiesen.
        </p>
        <p className="text-ink-soft">
          Bei der Aufbereitung ändert sich an den Beträgen nichts. Eine Ausnahme betrifft nur die
          Zuordnung: Einrichtungen, die bei der Umstellung 2022/23 eine neue Gliederungsnummer
          bekamen, stehen unter der neuen Nummer. Liegen für ein Jahr beide Nummern vor, werden
          ihre Beträge dort zusammengezählt.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Die zwei Haushalte</h2>
        <p className="text-ink-soft">
          Buchhalterisch ist der Haushalt geteilt: der{" "}
          <Term name="verwaltungshaushalt">Verwaltungshaushalt</Term> (laufender Betrieb)
          und der <Term name="vermoegenshaushalt">Vermögenshaushalt</Term> (Investitionen).
          In der Themen-Sicht führen wir beide zusammen; in „Erkunden" bleiben sie der
          kameralen Struktur treu.
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
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold">Weitere Informationen</h2>
        <p className="text-ink-soft">
          Detailliertere oder amtlich verbindliche Auskünfte zum Haushalt können direkt bei
          der Stadt Moosburg a. d. Isar (Stadtkämmerei) angefragt werden. Ein offener
          Datendownload ist für eine spätere Ausbaustufe vorgesehen.
        </p>
      </section>
    </div>
  );
}
