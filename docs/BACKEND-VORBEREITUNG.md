# Backend-Vorbereitung GF-Jahreskalender 2027

Stand: `index.html` (eine Datei, keine Laufzeitabhängigkeit). Alle Änderungen sind zuerst dort umgesetzt. Das Backend folgt danach.
Prüfung: `node tests/check-index.js` (Playwright mit Chromium; 63 Prüfungen über `window.GFKAL`).

## Was die Datei jetzt für ein Backend mitbringt

| Baustein | Stand |
| --- | --- |
| Speicherschicht | `Store.load / save / clear` ist die einzige Stelle mit `localStorage`. Ein Backend ersetzt diese drei Funktionen (über `GFKAL.Store`). |
| Datenformat | JSON Version 4: `rules` einmal als Tabelle, Termine verweisen per `ruleId`. `time` und `color` sind abgeleitet und stehen nicht in der Datei. Version 3 (Regel je Termin) wird weiter gelesen. |
| Validierung | `validateData(obj)` prüft Datei vollständig vor jeder Änderung: Jahr, Pflichtfelder, Typ, `HH:MM`, Dauer 5–720, Tagesgrenze 24:00, Datum im Jahr, doppelte uid, Regelverweise. Fehlerhafte Dateien ändern den Bestand nicht. |
| Prüf-Engine | `checkPlausibility(dateKey, ctx)` arbeitet auf `{eventsData, RULES}` ohne DOM. Dieselbe Funktion kann serverseitig laufen. |
| Versionen | Jeder Termin trägt `version` und `updatedAt`. Bei jeder Änderung steigt `version`. Grundlage für `If-Match`. |
| Änderungsprotokoll | Einträge mit `ts`, `text`, `user` (heute `"lokal"`). |
| Rückgängig | Bis 50 Schritte über Schnappschüsse. Später ersetzt durch serverseitige Historie. |

## Datenmodell (Version 4)

```json
{
  "app": "GF Jahreskalender 2027 – Fokusmodus", "version": 4, "year": 2027, "exported": "ISO-8601",
  "rules": { "jf-jahndorf": { "id": "...", "baseId": "...", "label": "...", "allowedDays": ["Di"], "turnus": "alle 6-8 Wochen",
             "duration": 50, "fixedTime": "07:30 – 09:00", "altTimes": ["09:00 – 10:30"], "blockParts": [50,20,5], "totalDuration": 75,
             "notSplittable": true, "coupledAfter": "sk-wifi", "coupledMaxGapMin": 15, "couplingForbiddenWith": "...",
             "editable": true, "pendingClarification": false, "note": "..." } },
  "events": [ { "date": "2027-01-19", "uid": "ev12", "title": "...", "type": "JF|Steuerkreis|Gremium|Blocker|Projekt|Klausur",
                "start": "09:00", "duration": 50, "desc": "", "ort": "", "placeholder": false, "assumption": false,
                "blockKey": null, "seriesId": "jahndorf", "source": "generiert|manuell|import", "ruleId": "jahndorf",
                "version": 1, "deviation": true, "baseline": { "title": "", "start": "", "duration": 0 }, "updatedAt": "ISO-8601" } ],
  "changelog": [ { "ts": "ISO-8601", "text": "...", "user": "lokal" } ]
}
```

`deviation`, `baseline` und `updatedAt` stehen nur, wenn sie gesetzt sind. `baseline` hält die Vorgabe gesperrter Formate (`editable: false`).

## Entwurf API

| Endpunkt | Zweck |
| --- | --- |
| `GET /calendars/2027` | Feiertage, Konfiguration (`CONFIG`), Regeln |
| `GET /events?from&to&type&q` | Termine mit Filter und Suche |
| `POST /events` | Neuer Termin (Server vergibt die ID, prüft mit `validateData`) |
| `PATCH /events/{id}` mit `If-Match: <version>` | Ändern, Konflikt (409) bei fremder Änderung |
| `POST /events/{id}/move` | Verschieben, Block nur als Ganzes, Raster und Kernzeit wie `moveEvent(clampGrid)` |
| `PATCH /rules/{id}?scope=series\|single` | Regel ändern, ersetzt Kopie-Logik `cloneRule` |
| `GET /audit` | Verstöße, berechnet mit derselben Engine |
| `POST /import?dry_run=true` | Vorschau mit Fehlerliste und Diff, danach Übernahme |
| `GET /export.ics?placeholders=false` | Austauschformat |

Offen für das Backend: Anmeldung, Rollen (`readonly`, `edit-own`, `edit-all`, `admin`), Sperre gegen gleichzeitiges Überschreiben, Änderungsnachweis mit Vorher- und Nachher-Wert, UUID statt Zähler-uid, Content-Security-Policy (Skript liegt inline).

## Bewusst nicht umgesetzt

Kompakte Jahreszeile, druckfähiger Assistenzplan, TypeScript, Build auf eine Datei, PDF/Excel, Mandanten, Regeleditor. Diese stehen in der Roadmap des Sammelpapiers unter "Nach Entscheidung" oder "Sicht".

## Fachliche Punkte, die im Code Annahmen bleiben

Wochentag Wochengespräch (2. Donnerstag), Fokuszeit Montag (07:30–09:00, zweites Fenster 09:00–10:30 zulässig), Dienstagsverteilung, 50 gegen 75 Minuten, Platzhalter, Steuerungsgruppen (drei Serien, Rotation bis Klärung), LK ambulant/stationär (Turnus offen, Halbjahr als Platzhalter).
