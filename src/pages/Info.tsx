import { usePageTitle } from "@/lib/title";

export function Info() {
  usePageTitle("Über das Projekt");
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Über dieses Projekt</h1>
      <p className="text-ink-soft">
        Diese Seite macht den Haushalt der Stadt Moosburg an der Isar sichtbar. Grundlage sind
        die kameralen Haushaltspläne. Buchhalterisch ist der Haushalt in zwei Teile getrennt:
        der <b>Verwaltungshaushalt</b> (das laufende Tagesgeschäft) und der{" "}
        <b>Vermögenshaushalt</b> (Investitionen). Hier werden beide Teile zu verständlichen
        Themen zusammengeführt.
      </p>
      <p className="text-ink-soft">
        Für jedes Jahr gibt es einen <b>Ansatz</b> (Plan) und — ein bis zwei Jahre später —
        ein <b>Ergebnis</b> (Ist). Die Werte für 2024 sind vorläufig.
      </p>

      <h2 className="font-display text-xl font-bold pt-2">Die Ebenen des Haushalts</h2>
      <p className="text-ink-soft">Von grob nach fein gliedert sich der Haushalt so:</p>
      <div className="overflow-x-auto rounded-lg border border-ink-line">
        <table className="w-full min-w-[26rem] text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Ebene</th>
              <th className="px-3 py-2 font-semibold">Fachbegriff</th>
              <th className="px-3 py-2 font-semibold">Beispiel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-line">
            {[
              ["Thema", "(eigene Einordnung)", "Bildung & Schulen"],
              ["Aufgabenbereich", "Einzelplan", "2 – Schulen"],
              ["Bereich", "Abschnitt", "Grundschulen"],
              ["Untergruppe", "Unterabschnitt", "Grund- & Mittelschulen"],
              ["Einrichtung", "Gliederung", "Anton-Vitzthum-Grundschule"],
              ["Posten", "Haushaltsstelle", "Beamtenbezüge"],
            ].map(([a, b, c]) => (
              <tr key={a}>
                <td className="px-3 py-2 font-medium">{a}</td>
                <td className="px-3 py-2 text-ink-soft">{b}</td>
                <td className="px-3 py-2 text-ink-soft">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-ink-soft text-sm">
        Ein <b>Thema</b> bündelt Posten aus beiden Haushalten über die kamerale Gliederung
        hinweg. Jeder <b>Posten</b> lässt sich über die Jahre verfolgen (Ansatz gegen Ergebnis).
      </p>

      <p className="text-ink-muted text-sm pt-2">
        Bürgerschaftliches Transparenzprojekt, keine amtliche Veröffentlichung. Bei
        Abweichungen gilt der offizielle Haushaltsplan der Stadt.
      </p>
    </div>
  );
}
