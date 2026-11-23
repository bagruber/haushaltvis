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

Die drei FTP-Secrets braucht dieses Repo eigens, GitHub gibt sie nicht heraus:

```bash
gh secret set FTP_HOST     --repo bagruber/haushaltvis --body "ftp.moosburg.eu"
gh secret set FTP_USER     --repo bagruber/haushaltvis --body "<Benutzer wie in den anderen Repos>"
gh secret set FTP_PASSWORD --repo bagruber/haushaltvis   # fragt interaktiv
```

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
  Danach überträgt die Action nur Geändertes.

## Freigabe

1. `noindex` in `index.html` nur für die Bürgerversion entfernen.
2. Auf der Portalseite verlinken, in `sitemap.xml` und `llms.txt` eintragen.
3. Den Deploy-Workflow auf Push nach `main` stellen.
