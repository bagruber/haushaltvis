# haushaltvis auf moosburg.eu

Die Bürgerversion liegt unter `moosburg.eu/haushalt/`. Übergreifendes zur
Domain steht im Repo `moosburg-eu` (BRIEFING.md, README.md).

## Stand

- Erste öffentliche Variante, **noch nicht freigegeben**: nirgends verlinkt,
  nicht in `sitemap.xml` oder `llms.txt` des Portals, `noindex` in `index.html`.
- Deploy nur von Hand: Actions → „Deploy auf moosburg.eu/haushalt/“ → Run
  workflow (`.github/workflows/moosburg-eu.yml`).

## Was die Bürgerversion weglässt

Entwurf und Finanzplan, unterjährige Zwischenstände (gebucht, bezahlt), den
Wortlaut der Erläuterungen der Kämmerei, die Gesamtliste und die internen
Seiten unter `/intern/`. Die Suchwörter, die aus den Erläuterungen abgeleitet
sind, bleiben. `scripts/buerger.mjs` schneidet die Daten und prüft den fertigen
Ordner gegen die vollen Daten in `public/data/`; findet es dort einen Text oder
eine Stelle, die nicht hingehört, bricht der Deploy ab.

Sieben Erläuterungen bestehen nur aus einem Wort, das zugleich Suchwort ist
(z. B. „Fundgeld“, „Türerneuerung“). Diese Wörter stehen als Suchwort in der
Bürgerversion.

## Einrichtung

Wie beim Klimaportal ein **eigenes FTP-Konto**, in hPanel (Dateien → FTP-Konten)
auf das Verzeichnis `haushalt` beschränkt. So empfiehlt es das Audit vom
November 2026: Ein fehlerhafter Workflow in diesem Repo kommt nicht an `/api/`,
die Config und die anderen Projekte. Weil das Login schon in `haushalt`
beginnt, steht im Workflow `server-dir: ./`. **Nie die Secrets des gemeinsamen
Kontos eintragen, ohne `server-dir` auf `haushalt/` zu stellen**, sonst hieße
`./` die Domain-Wurzel.

Die Secrets im eigenen Terminal setzen, nicht über einen Agenten; ohne Wert im
Befehl fragt `gh` verdeckt nach:

```bash
gh secret set FTP_HOST -R bagruber/haushaltvis      # srv1973.hstgr.io
gh secret set FTP_USER -R bagruber/haushaltvis
gh secret set FTP_PASSWORD -R bagruber/haushaltvis
```

`FTP_HOST` ist `srv1973.hstgr.io`, nicht `ftp.moosburg.eu`: Der Workflow prüft
das Zertifikat (`security: strict`), und das lautet auf `*.hstgr.io`.

Im Repo `moosburg-eu` steht `haushalt/**` in der `exclude`-Liste, damit der
Portal-Deploy den Ordner nicht anfasst.

## Was dabei bricht

- **CSP der Domain:** Skripte nur aus Dateien (`script-src 'self'`). Deshalb
  liegt die Weiterleitung, die GitHub Pages braucht, in `public/weiterleitung.js`
  und nicht inline in `index.html`.
- **Echte Pfade:** Der Workflow legt eine `.htaccess` mit SPA-Fallback ab.
  Adressen mit Vorschaukarte sind Ordner, der Server hängt dort einen
  Schrägstrich an; `weiterleitung.js` nimmt ihn beim Laden wieder ab.
- **Bot-Schutz von Hostinger:** Automatisierte Abrufe bekommen teils eine
  JavaScript-Challenge. Ob Messenger dann die Vorschaukarten lesen können, ist
  ungeprüft; falls nicht, lässt sich der Schutz im hPanel abschalten.
- **Erster Deploy:** rund 4.700 HTML-Dateien und 358 Bilder per FTP, das dauert.
  Danach überträgt die Action nur Geändertes. Bricht er beim ersten Ordner mit
  `ECONNRESET (data socket)` ab, fehlt noch die Statusdatei der Action; beim
  Klimaportal half ein Lauf mit `log-level: verbose`.

## Freigabe

1. `noindex` in `index.html` nur für die Bürgerversion entfernen.
2. Auf der Portalseite verlinken, in `sitemap.xml` und `llms.txt` eintragen.
3. Den Deploy-Workflow auf Push nach `main` stellen.
