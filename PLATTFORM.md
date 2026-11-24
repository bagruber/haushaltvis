# haushaltvis auf moosburg.eu

Die Bürgerversion liegt unter `moosburg.eu/haushalt/`. Übergreifendes zur
Domain steht im Repo `moosburg-eu` (BRIEFING.md, README.md).

## Stand

- Erste öffentliche Variante, seit 24.11.2026 online, **noch nicht freigegeben**: nirgends verlinkt,
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

Ein **eigenes FTP-Konto**, in hPanel auf den Ordner `haushalt` beschränkt, wie
es das Audit vom November 2026 empfiehlt und wie beim Klimaportal: Ein
fehlerhafter Workflow kommt dann nicht an `/api/`, die Config und die anderen
Projekte. Das Login beginnt im Ordner, deshalb `server-dir: ./`.

Davor steht der Schritt „Ziel prüfen“: Endet `FTP_USER` nicht auf `haushalt`
oder liegt das Login doch in der Domain-Wurzel, bricht der Deploy ab, bevor er
etwas überträgt. Anlass war der 23.11.2026: `./` war schon für ein eigenes
Konto gedacht, die Secrets waren aber die des gemeinsamen. Der Lauf legte in der Wurzel 64 leere Ordner an und wurde
abgebrochen, bevor er Portal, `api/` und `.htaccess` löschen konnte.

Konto anlegen: hPanel → Dateien → FTP-Konten → neues Konto, Verzeichnis
`haushalt`. Der vollständige Benutzername steht danach in der Liste, mit der
Kontonummer davor (`u…….haushalt`).

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
- **Upload mit lftp statt der FTP-Deploy-Action:** Hostinger trennt eine
  FTP-Verbindung nach 60 Minuten. Die Action legt jeden Ordner einzeln an, gut
  0,8 s pro Ordner, und speichert ihren Stand erst am Ende. Bei rund 4.700
  Ordnern (eine Vorschaukarte je Haushaltsstelle) riss der erste Deploy am
  23.11.2026 deshalb die Stunde, und jeder neue Versuch begann von vorn. `lftp`
  lädt über sechs Verbindungen hoch und überträgt jedes Mal alles
  (`--transfer-all`), weil Größe und Zeitstempel nicht zum Vergleich taugen:
  Eine geänderte Zahl gleicher Länge sähe sonst unverändert aus. Ein Deploy
  dauert so rund 22 Minuten (24.11.2026: 5.096 Dateien, 1.300 s). `--delete`
  entfernt, was der Build nicht mehr enthält; das Konto reicht nur bis
  `haushalt/`.

## Freigabe

1. `noindex` in `index.html` nur für die Bürgerversion entfernen.
2. Auf der Portalseite verlinken, in `sitemap.xml` und `llms.txt` eintragen.
3. Den Deploy-Workflow auf Push nach `main` stellen.
