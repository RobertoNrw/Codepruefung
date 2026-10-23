# Jahreskalender 2027 in den Outlook-Kalender der Geschäftsführung bringen

Diese Anleitung braucht **keine** Freigabe der IT und keine Skripte. Sie nutzt die Datei `GF-Jahreskalender-2027-Outlook.ics`.

## Welche Datei wofür
| Datei | Zweck |
|---|---|
| `GF-Jahreskalender-2027-Outlook.ics` | **Zum Importieren.** Regelmäßige Reihen sind echte Serien (Wiederholung mit Ausnahmen), alles andere Einzeltermine. Jeder Termin trägt die Kategorie `GFK2027`. |
| `GF-Jahreskalender-2027-Assistenz.ics` | Zum Lernen und Nachbauen von Hand. Der erste Termin jeder Reihe enthält die komplette Serienanleitung. |
| `GF-Jahreskalender-2027.ics` | Alle 613 Termine einzeln, ohne Serien. |

Erzeugt werden die Dateien in der `index.html` über „Export ICS“.

## Schritt 1: Test-Kalender anlegen und importieren
1. In Outlook einen **neuen, leeren Kalender** anlegen, zum Beispiel „GFK2027 Test“. Nicht in den echten Kalender importieren.
2. `GF-Jahreskalender-2027-Outlook.ics` in diesen Kalender importieren.
   - Outlook im Web und neues Outlook: Kalender → „Kalender hinzufügen“ → „Aus Datei hochladen“ → Datei wählen → Ziel-Kalender „GFK2027 Test“ wählen.
   - Klassisches Outlook: Datei → Öffnen und exportieren → Importieren/Exportieren → „iCalendar- oder vCalendar-Datei (.vcs/.ics) importieren“.
3. Ergebnis prüfen (Schritt 2).

## Schritt 2: Prüfen
- Es sollen **178 Einträge** entstehen: 40 Serien, 7 Ausnahme-Instanzen und 131 Einzeltermine. Zusammen ergibt das alle 613 Termine.
- Stichproben: Wirtschaftsausschuss (jeden 4. Dienstag, 09:00–10:00, im Juli und Oktober kein Termin), Wochengespräch ohne GF (jeden Mittwoch 14:00–16:00), Fokuszeit Montag (09:00–10:30).
- Die Notiz jedes Eintrags erklärt Muster, Regel und Hintergrund. Bei Serien steht dort, an welchen Tagen sie entfallen (Urlaub, Feiertag, Klausur).
- Die Prüfung in der `index.html` zeigt 9 bekannte Befunde (Steuerungsgruppen laut Einladungen). Diese Termine stehen so in der Datei.

## Schritt 3: In den Kalender der Geschäftsführung übernehmen
Wenn der Test passt, importiert ihr dieselbe Datei in den echten Kalender. Dafür braucht die Assistenz Bearbeitungsrechte auf diesen Kalender.
- Jeder Termin hat eine feste Kennung. Ein zweiter Import in denselben Kalender aktualisiert in der Regel die vorhandenen Termine, statt sie zu verdoppeln. Trotzdem nicht mehrfach importieren, ohne vorher zu prüfen.
- Alternativ im Test-Kalender alle Einträge in der Listenansicht markieren und in den echten Kalender verschieben. Serien bleiben dabei erhalten.

## Schritt 4: Teams-Besprechungen ergänzen
Eine ICS-Datei kann keine Teams-Links erzeugen. Nur für die Reihen, die digital stattfinden sollen:
1. Serie im Kalender öffnen.
2. „Teams-Besprechung“ einschalten und **die gesamte Serie** speichern.

Bei Terminen, die in Präsenz stattfinden, ist nichts zu tun.

## Rückgängig machen
Alle importierten Termine tragen die Kategorie `GFK2027`. Im Kalender nach dieser Kategorie suchen, alle markieren und löschen. Das räumt den Import sauber auf.

## Was in der Datei bewusst nicht als Serie steht
- Platzhalter (noch nicht bestätigt) und Termine mit festen Daten laut Einladung, zum Beispiel die Steuerungsgruppen.
- Reihen im 6–8-Wochen-Takt (JF Personal, JF QM, JF Jahndorf) und die Steuerkreis-Tage, weil die Abstände wegen Urlaub, Feiertag und Klausur nicht gleich sind.
- Das sind Einzeltermine mit Kurzerklärung in der Notiz.

## Wenn etwas nicht stimmt
Termine immer in der `index.html` ändern und die Datei neu erzeugen, nicht in Outlook einzeln korrigieren. Dann stimmen Kalender, Matrix-Abgleich und Dateien überein.
