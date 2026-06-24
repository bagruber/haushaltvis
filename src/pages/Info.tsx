export function Info() {
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
      <p className="text-ink-muted text-sm">
        Bürgerschaftliches Transparenzprojekt, keine amtliche Veröffentlichung. Bei
        Abweichungen gilt der offizielle Haushaltsplan der Stadt.
      </p>
    </div>
  );
}
