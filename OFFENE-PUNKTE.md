# Offene Punkte

*Notiert am 26.08.2026 fuer spaetere Sitzungen. Erledigte Punkte bitte streichen,
nicht abhaken — die Datei soll kurz bleiben.*


## Formsprache-Probe (seit 14.09.2026, noch nicht begonnen)

Dieses Repo ist Pilot fuer die neue Formsprache der Moosburg-Projekte. Die
Entscheidungen dafuer sind **vorlaeufig**. Vor jeder Arbeit daran lesen:
`docs/briefing-formsprache-probe.md` (Briefing, Branch `probe/formsprache`, nie
auf `main`) und `../moosburg-design/docs/formsprache/ENTSCHEIDUNGEN.md`
(Protokoll). Offen und vor dem Einbau zu klaeren: Lizenz von Madelon Script,
Themenfarbe der Farbflaeche (Rot steht hier fuer Defizit), Null mit Schraegstrich
in Atkinson Hyperlegible Next.

## Toolchain-Stand

Dieses Repo laeuft seit dem 26.08.2026 auf **pnpm** (nicht npm) und auf der
projektweiten Hausbasis. **Die Zielversionen stehen nicht hier**, sondern in
`hausbasis/baseline.json` — eine Quelle statt einer Tabelle je Repo. Abgleich:

```bash
node ../hausbasis/check.mjs --kurz
```

Der Sinn ist Deduplizierung: alle Repos teilen sich einen pnpm-Store, der genau so
weit dedupliziert, wie die Versionen uebereinstimmen. Gemessen kostet ein Repo mit
abweichenden Versionen ~158 MB, ein Versions-Zwilling ~8 MB. **Einzelne Pakete
also nicht im Alleingang hochziehen** — das faellt allen anderen Repos zur Last.

## Warum `"types": ["node"]` in der tsconfig.app.json steht

`src/lib/data/selectors.test.ts` prueft den echten Datenbestand und liest dafuer
mit `node:fs` von der Platte. TypeScript 7 zieht `@types/*` nicht mehr
automatisch in jeden Scope; ohne den Eintrag bricht der Build mit TS2591
(*"Cannot find name 'node:fs'"*, dazu `__dirname`).

Der Eintrag ist also kein Versehen und auch nicht redundant zur
`tsconfig.node.json` — die deckt nur `vite.config.ts` ab.

## Warum `baseUrl` aus der tsconfig verschwunden ist

TypeScript 7 hat die Option entfernt (Fehler TS5102). Die Zeile
`"baseUrl": "."` wurde ersatzlos gestrichen — `paths` loest TS 7 relativ zur
tsconfig-Datei auf, die Eintraege stimmen unveraendert weiter. **Nicht
"reparieren", indem `baseUrl` wieder eingetragen wird.**

## Beim naechsten Paket-Update

Weder `pnpm install` noch `pnpm prune` raeumt die alte Version aus
`node_modules/.pnpm`. Nach einem Upgrade deshalb:

```bash
rm -rf node_modules && pnpm install
pnpm store prune
```

Ohne diesen Schritt bleibt der Speichergewinn auf dem Papier. In den beiden
Upgrade-Wellen am 26.08.2026 hat das zusammen ~1,2 GB freigegeben.
