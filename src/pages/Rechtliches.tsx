import { Link } from "react-router-dom";
import { usePageTitle } from "@/lib/title";

// Rechtsseiten. Platzhalter in [eckigen Klammern] vor Veröffentlichung als
// "offizielles" Angebot ausfüllen; bis dahin gilt das Projekt als privates,
// nicht-kommerzielles Transparenzprojekt.

export function Impressum() {
  usePageTitle("Impressum");
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Impressum</h1>
      <section className="space-y-1 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Angaben gemäß § 5 DDG</h2>
        <p>
          Benedict Gruber
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ] Moosburg a. d. Isar
        </p>
        <p>
          Kontakt: über{" "}
          <a
            href="https://github.com/bagruber/haushaltvis/issues"
            className="underline hover:text-ink"
            rel="noreferrer"
          >
            GitHub-Issues
          </a>{" "}
          oder [E-Mail-Adresse]
        </p>
      </section>
      <section className="space-y-1 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Inhaltliche Verantwortung</h2>
        <p>
          Dieses Angebot ist ein privates, nicht-kommerzielles Transparenzprojekt und{" "}
          <b>keine amtliche Veröffentlichung</b> der Stadt Moosburg a. d. Isar. Maßgeblich ist
          allein der offizielle Haushaltsplan der Stadt. Details zur Datenaufbereitung auf der{" "}
          <Link to="/methodik" className="underline hover:text-ink">Methodik-Seite</Link>.
        </p>
      </section>
    </div>
  );
}

export function Datenschutz() {
  usePageTitle("Datenschutz");
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Datenschutzerklärung</h1>
      <section className="space-y-2 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Kurzfassung</h2>
        <p>
          Diese Website erhebt <b>keine personenbezogenen Daten</b>: kein Tracking, keine
          Cookies, keine Analyse-Dienste, keine Kontaktformulare. Alle Inhalte (auch die
          Schriften) werden von diesem Server selbst ausgeliefert; es werden keine Inhalte von
          Drittanbietern nachgeladen. Eingaben im Rechner „Wofür zahle ich?" werden
          ausschließlich lokal im Browser verarbeitet und nicht übertragen.
        </p>
      </section>
      <section className="space-y-2 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Hosting</h2>
        <p>
          Die Seite wird derzeit als statische Website über <b>GitHub Pages</b> (GitHub, Inc.,
          USA) ausgeliefert. GitHub verarbeitet beim Abruf technisch notwendige Verbindungsdaten
          (insbesondere die IP-Adresse) in Server-Logs; Details in der{" "}
          <a
            href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
            className="underline hover:text-ink"
            rel="noreferrer"
          >
            Datenschutzerklärung von GitHub
          </a>
          . Der Betreiber dieser Seite hat auf diese Logs keinen Zugriff und führt keine eigene
          Protokollierung durch.
        </p>
      </section>
      <section className="space-y-2 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Verantwortlicher & Rechte</h2>
        <p>
          Verantwortlich ist der im <Link to="/impressum" className="underline hover:text-ink">Impressum</Link>{" "}
          genannte Betreiber. Da keine personenbezogenen Daten erhoben oder gespeichert werden,
          laufen Auskunfts-, Berichtigungs- und Löschansprüche (Art. 15–17 DSGVO) in der Praxis
          leer — bei Fragen genügt eine formlose Nachricht.
        </p>
      </section>
    </div>
  );
}

export function Barrierefreiheit() {
  usePageTitle("Barrierefreiheit");
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Erklärung zur Barrierefreiheit</h1>
      <p className="text-ink-soft">
        Diese Erklärung erfolgt freiwillig: Als privates Projekt unterliegt die Seite nicht der
        BayBITV — sie orientiert sich aber bewusst an deren Anforderungen (WCAG 2.1 AA /
        EN 301 549), damit einer späteren Übernahme durch die Stadt nichts im Weg steht.
      </p>
      <section className="space-y-2 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Was bereits umgesetzt ist</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Vollständige Bedienbarkeit per Tastatur, sichtbarer Fokus, Sprunglink zum Inhalt.</li>
          <li>Zu jedem Diagramm gibt es die Zahlen als aufklappbare Tabelle („Daten als Tabelle").</li>
          <li>Reduzierte Animationen, wenn das Betriebssystem dies wünscht (prefers-reduced-motion).</li>
          <li>Fachbegriffe sind mit Glossar-Erklärungen hinterlegt; Farben werden nie als einziges Unterscheidungsmerkmal genutzt (Beschriftung + Betrag stehen daneben).</li>
        </ul>
      </section>
      <section className="space-y-2 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Bekannte Einschränkungen</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Die interaktiven Diagramme (Canvas) sind für Screenreader nur eingeschränkt
            erfahrbar; die Tabellen-Alternative enthält jedoch dieselben Zahlen.
          </li>
          <li>Eine Fassung in Leichter Sprache existiert noch nicht.</li>
        </ul>
      </section>
      <section className="space-y-2 text-ink-soft">
        <h2 className="font-display text-xl font-bold text-ink">Barriere melden</h2>
        <p>
          Hinweise auf Barrieren gerne als{" "}
          <a
            href="https://github.com/bagruber/haushaltvis/issues"
            className="underline hover:text-ink"
            rel="noreferrer"
          >
            GitHub-Issue
          </a>
          {" "}— sie werden zeitnah behoben.
        </p>
      </section>
    </div>
  );
}
