# Promptfolge für den Copilot-Agenten: Kalender 2027 testen, prüfen, scharfstellen

Diese Folge ist für Microsoft 365 Copilot mit Zugriff auf den Outlook-Kalender gedacht. Die Prompts stehen in Kästen und lassen sich unverändert kopieren. Gehe die Phasen der Reihe nach durch und kopiere immer nur einen Prompt auf einmal.

## Vorher wissen
- **Copilot ist gut im Lesen, Zählen, Vergleichen und Zusammenfassen.** Bei Serien ändern, vielen Terminen auf einmal und Löschen ist er unzuverlässig. Deshalb gilt in allen Prompts: erst auflisten, dann bestätigen lassen, dann einzeln ändern.
- **Arbeite zuerst im Test-Kalender** (zum Beispiel „GFK2027 Test“) und erst am Ende im echten Kalender. Verschieben geht in der Listenansicht, Serien bleiben dabei erhalten.
- **Die Quelle der Wahrheit ist die `index.html`.** Findet der Copilot einen Fehler, ändere ihn dort und erzeuge die Datei neu. Der Copilot meldet nur, er korrigiert nicht auf Verdacht.
- **Private Termine** (Arzt, Geburtstage, private Einträge) soll der Copilot nur zählen und nie einzeln auflisten. Das steht im Rollenprompt.
- **Ein Prompt, eine Aufgabe.** Das Ergebnis immer kurz stichprobenartig im Kalender gegenprüfen.

---

## Phase 0: Rolle und Sicherheitsregeln (einmal am Anfang)

```
Du unterstützt die Assistenz der Geschäftsführung (Jens Fritsch, Diakonie Ruhr) bei der Prüfung des Jahreskalenders 2027.

Arbeitsregeln für das ganze Gespräch:
1. Du arbeitest nur im Kalender „GFK2027 Test“, solange ich nichts anderes sage.
2. Du änderst, verschiebst oder löschst nichts, ohne dass ich es für diesen einen Fall bestätigt habe. Du zeigst mir immer zuerst die Liste (Datum, Uhrzeit, Titel) und fragst dann nach.
3. Du löschst nie eine ganze Serie und nie mehr als 5 Termine auf einmal.
4. Termine mit den Kategorien „Geburtstag“ und „Privat“ sowie Einträge mit „Privater Termin“, „Arzt“ oder „Zahnarzt“ im Titel zählst du nur und nennst sie nie einzeln.
5. Unsere Termine tragen die Kategorie „GFK2027“. Alles ohne diese Kategorie ist ein älterer Eintrag.
6. Du rätst nicht. Wenn du etwas nicht sicher aus dem Kalender lesen kannst, schreibst du „nicht prüfbar“.
7. Du antwortest kurz, als Tabelle oder nummerierte Liste, und trennst immer „stimmt“ und „Abweichung“.

Bestätige mit „verstanden“ und wiederhole die sieben Regeln in einem Satz je Regel.
```

---

## Phase 1: Bestandsaufnahme (nur lesen)

### 1.1 Gesamtzahl
```
Zähle im Kalender „GFK2027 Test“ alle Termine im Zeitraum 01.01.2027 bis 31.12.2027.
Gib mir diese drei Zahlen:
a) alle Termine
b) Termine mit der Kategorie „GFK2027“
c) Termine ohne die Kategorie „GFK2027“
Erwartet sind 613 Termine mit der Kategorie „GFK2027“. Nenne die Abweichung.
```

### 1.2 Zählung je Reihe
```
Zähle im Zeitraum 01.01.2027 bis 31.12.2027 die Termine mit der Kategorie „GFK2027“ nach Titel und vergleiche mit meinen Erwartungswerten. Gib die Antwort als Tabelle mit den Spalten Titel, Ist, Soll, Differenz.

Soll:
Fokuszeit-Blocker (Mo) 42
Fokuszeit-Blocker (Fr) 39
Projektarbeit-Blocker GF 44
Wochengespräch mit GF-Beteiligung 11
Wochengespräch (ohne GF) 33
Steuerkreis Wirtschaft & Finanzen 10
Steuerkreis QM & Regulatorik 5
Anreise Steuerkreis-Tag 14
Hospitation vor Ort 14
Wirtschaftsausschuss SBO 10
Erweiterte Konzernleitung (eKL) 10
AG Wohlfahrt Bochum 8
Verwaltungsrat IM 4
Vorstandssitzung IM 5
IMK 4
IMK + ASA IM 2

Titel, die nicht in meiner Liste stehen, nennst du in einer eigenen Tabelle „weitere Titel“ mit Anzahl.
```

### 1.3 Ältere Einträge ohne Kategorie
```
Liste die Termine im Zeitraum 01.01.2027 bis 31.12.2027 auf, die NICHT die Kategorie „GFK2027“ haben, nur Serien und mehrfach vorkommende Titel. Gruppiere nach Titel und gib je Gruppe an: Anzahl, übliche Uhrzeit und Wochentag, Kategorie, ob es eine Serie ist.
Ignoriere Geburtstage, Feiertage und private Einträge, nenne dafür nur die Gesamtzahl.
Markiere in einer eigenen Spalte, bei welchen Gruppen ein Titel unserer GFK2027-Reihen ähnlich ist (zum Beispiel „JF Moreira“ und „JF Frau Moreira“).
```

---

## Phase 2: Regeln prüfen (nur lesen, eine Regel pro Prompt)

Das Regelwerk ist mit der Prüfung in der `index.html` abgestimmt. Weicht der Copilot ab, hat entweder der Kalender oder der Prompt einen Fehler. Dann melde ihn und ändere nichts.

### 2.1 Nichts vor 09:00
```
Suche im Kalender „GFK2027 Test“ alle Termine mit der Kategorie „GFK2027“, die vor 09:00 Uhr beginnen (01.01.2027 bis 31.12.2027). Ausgenommen sind ganztägige Termine. Liste: Datum, Uhrzeit, Titel. Wenn es keine gibt, schreibe „keine Abweichung“.
```

### 2.2 Fokuszeit und Mittwoch
```
Prüfe diese Reihen mit der Kategorie „GFK2027“ im Jahr 2027:
- Fokuszeit-Blocker (Mo): jeder Montag 09:00–10:30
- Fokuszeit-Blocker (Fr): jeder Freitag 09:00–11:00
- Projektarbeit-Blocker GF: jeder Mittwoch 12:00–14:00
- Wochengespräch (ohne GF) und Wochengespräch mit GF-Beteiligung: jeder Mittwoch 14:00–16:00
Das Wochengespräch mit GF-Beteiligung gibt es nur am 2. Mittwoch des Monats, an den anderen Mittwochen ohne GF.
Gib je Reihe nur die Termine aus, die vom Wochentag oder von der Uhrzeit oder Dauer abweichen. Nenne außerdem Mittwoche, an denen weder „mit GF“ noch „ohne GF“ steht, und nenne an, ob der Grund Urlaub oder Feiertag ist.
```

### 2.3 Wirtschaftsausschuss und Rückfahrtpuffer
```
Prüfe den Wirtschaftsausschuss SBO im Jahr 2027:
- am 4. Dienstag des Monats, 09:00–10:00 Uhr (60 Minuten)
- im Juli und im Oktober gibt es keinen Termin
- danach 30 Minuten Rückfahrtpuffer: Es darf von 10:00 bis 10:30 kein anderer Termin liegen.
Liste Abweichungen bei Wochentag, Uhrzeit und Dauer. Liste alle Termine, die im Puffer von 10:00 bis 10:30 liegen.
```

### 2.4 Jour fixes: Dienstag und Dauer
```
Prüfe alle Termine mit der Kategorie „JF“ und „GFK2027“ im Jahr 2027:
a) Sie liegen auf einem Dienstag.
b) Sie dauern 50 Minuten, außer: JF A³-Team 90 Minuten, JF Jahndorf 100 Minuten, JF MAV+BR SBO 100 Minuten (am Donnerstag) und JF Personal (siehe nächste Prüfung).
c) Zwischen zwei Jour fixes am selben Tag liegen mindestens 10 Minuten.
Liste nur Abweichungen: Datum, Uhrzeit, Titel, Grund.
```

### 2.5 JF Personal als Block
```
Prüfe die Reihe „JF Personal“ im Jahr 2027. Sie besteht jedes Mal aus drei direkt aufeinanderfolgenden Teilen am selben Tag:
1. „JF Personal“ 50 Minuten
2. „JF Personal – Poolspringer-Slot Frau Mala“ 20 Minuten
3. „JF Personal – Wechselpuffer“ 5 Minuten
Der Block darf nicht getrennt sein und liegt am Dienstag. Der Abstand zwischen zwei Blöcken beträgt 6 bis 8 Wochen. Liste jeden Block, bei dem ein Teil fehlt, nicht direkt anschließt oder an einem anderen Tag liegt, und jeden Abstand außerhalb von 6 bis 8 Wochen.
```

### 2.6 Intervalle: QM, Jahndorf
```
Berechne für die Reihen „JF QM & Regulatorik“ (6 bis 8 Wochen Abstand) und „JF Jahndorf“ (etwa 8 Wochen Abstand, 100 Minuten) im Jahr 2027 den Abstand in Wochen zwischen aufeinanderfolgenden Terminen. Gib eine Tabelle mit Datum, Uhrzeit und Abstand zum Vorgänger aus und markiere Abstände außerhalb des Sollbereichs. Erkläre Lücken, wenn Urlaub oder ein Feiertag dazwischen liegt.
```

### 2.7 Steuerkreise und Anreise
```
Prüfe an jedem Tag im Jahr 2027, an dem ein Steuerkreis liegt (Titel beginnt mit „Steuerkreis“):
a) Jeder Steuerkreis dauert 120 Minuten und liegt auf einem Donnerstag.
b) Eine „Anreise Steuerkreis-Tag“ (30 Minuten) liegt direkt vor dem ersten Steuerkreis des Tages, aber nie vor dem zweiten.
c) Zwischen zwei Steuerkreisen am selben Tag liegen genau 15 Minuten.
d) Direkt nach dem letzten Steuerkreis liegt ein „Hospitation vor Ort“ mit 120 Minuten.
e) Als Ort steht nie „Westring 26“.
Gib je Termintag eine Zeile und bei Abweichungen den Grund.
```

### 2.8 Klausuren
```
Prüfe im Jahr 2027:
- Die Leistungsklausur Sozialwirtschaft und die GBL-Klausur liegen nie in derselben Kalenderwoche.
- Die Leistungsklausur Sozialwirtschaft liegt auf Montag und Dienstag, die GBL-Klausur im November auf Donnerstag und Freitag.
- An den Klausurtagen liegen weder Fokuszeit noch Projektarbeit noch Wochengespräch. Die Ausnahme ist bekannt: Am 04.05.2027 liegen nach der Leistungsklausur zwei Jour fixes (JF Frerich/Culina, JF Wirtschaft & Finanzen), das ist so gewollt.
Gib die Klausurtage mit Kalenderwoche aus und liste Abweichungen.
```

### 2.9 Innere Mission
```
Prüfe die Termine der Inneren Mission im Jahr 2027:
- IMK: 6 Termine, mittwochs, davon 2 mit dem Titel „IMK + ASA IM“
- Vorstandssitzung IM: 180 Minuten, 09:00 Uhr
- Verwaltungsrat IM: 4 Termine, mittwochs 17:00–18:30 Uhr
- AG Wohlfahrt Bochum: 8 Termine, mittwochs 17:00–18:30 Uhr
Keiner dieser Termine liegt in den NRW-Schulferien: 22.03.–27.03., 18.05., 19.07.–31.08., 23.10.–06.11.2027.
Gib für jede Reihe Anzahl, Abweichungen bei Uhrzeit oder Dauer und Termine in den Ferien aus.
```

### 2.10 Montag: LK und eKL
```
Prüfe im Jahr 2027:
- Leitungskonferenz Sozialwirtschaft: 1. Montag im Monat, 120 Minuten
- Erweiterte Konzernleitung (eKL): 3. Montag im Monat, 180 Minuten, 12:00–15:00 Uhr
- JF Machleit Ebner: vierteljährlich direkt nach der eKL, 50 Minuten
- Steuerungsgruppen (Personal, UK DR): 180 Minuten, Digitalisierung DR: 60 Minuten
Liste Abweichungen bei Wochentag, Uhrzeit und Dauer.
```

### 2.11 Gesellschafter, GVV, Leitungskonferenz ambulant/stationär
```
Prüfe, ob im Jahr 2027 vorhanden sind und mit der richtigen Dauer:
- GVV DADuL: 2 Termine, je 180 Minuten
- GVV Pflege/DfM/Culina/MiR: 2 Termine
- Leitungskonferenz ambulant: 2 Termine, 2 Stunden; Leitungskonferenz stationär: 2 Termine, 3 Stunden
- „Hospitation nach Leitungskonferenz“: je 120 Minuten direkt danach
- ASA (Team-Termin): 2 Termine à 2 Stunden
Gib je Titel Anzahl und Abweichungen aus. Ambulant und stationär dürfen nicht verwechselt sein.
```

---

## Phase 3: Konflikte mit Urlaub, Feiertagen und Überschneidungen (nur lesen)

### 3.1 Urlaub und Feiertage
```
Gib mir alle Termine mit der Kategorie „GFK2027“, die auf einen Feiertag oder in einen Urlaubszeitraum fallen.

Feiertage 2027: 01.01., 26.03., 29.03., 01.05., 06.05., 17.05., 27.05., 03.10., 01.11., 25.12., 26.12.
Urlaub: 01.01.–08.01., 26.03.–04.04., 26.07.–29.07., 04.08.–20.08., 22.10.–05.11.
Zusätzliche freie Tage laut Kalender: 09.02., 05.05., 14.05., 27.12.

Liste: Datum, Uhrzeit, Titel. Danach die Zahl der Termine je Gruppe. Termine ohne die Kategorie „GFK2027“ listest du getrennt auf.
```

### 3.2 Überschneidungen
```
Suche im Zeitraum 01.01.2027 bis 31.12.2027 Terminpaare, die sich zeitlich überschneiden (nicht bei ganztägigen Terminen). Gruppiere nach Paar der Titel und gib je Paar die Anzahl und zwei Beispieldaten an.
Trenne drei Tabellen:
a) beide Termine tragen GFK2027
b) ein Termin trägt GFK2027, der andere nicht
c) keiner trägt GFK2027
Tabelle (b) ist die wichtigste.
```

### 3.3 Doppelungen
```
Suche Termine, die im Kalender doppelt vorkommen: gleiches Datum und gleiche Startzeit, oder gleiches Datum und fast gleicher Titel (zum Beispiel „JF Frau Weisang“ und „JF Weisang“). Liste die Paare mit Kategorie und Serien-Status. Entscheide nichts, markiere nur.
```

---

## Phase 4: Aufräumen (immer mit Bestätigung)

Erst ausführen, wenn Phase 1 bis 3 ausgewertet sind und du die Liste der alten Serien entschieden hast. Löschen macht der Copilot nicht in großem Stil, du setzt es lieber selbst in der Serienansicht um.

### 4.1 Löschliste vorbereiten
```
Erstelle eine Löschliste. Aufnehmen sollst du nur Serien ohne die Kategorie „GFK2027“, die ich dir gleich nenne. Die Liste enthält je Serie: Titel, Wochentag, Uhrzeit, Anzahl 2027, erstes und letztes Datum, Organisator.
Serien: JF Marketing & Vertrieb, JF Moreira, Jour fixe Altenhilfe, Vorstandssitzung Innere Mission, Leitungskonferenz Sozialwirtschaft, JF Frau Merino-Kesting, Sitzung der erweiterten Konzernleitung, MAV IM, JF Frau Weisang.
Lösche nichts. Warte auf meine Auswahl.
```

### 4.2 Alte Serien am 31.12.2026 beenden statt löschen
```
Ich möchte folgende Serien nicht löschen, sondern am 31.12.2026 enden lassen, damit November und Dezember 2026 erhalten bleiben: [Titel einsetzen].
Beschreibe mir Schritt für Schritt, wie ich das in Outlook bei der Serie einstelle. Ändere selbst nichts.
```

### 4.3 Einzelnen Termin ändern (Muster)
```
Der Termin „[Titel]“ am [Datum] um [Uhrzeit] soll auf [neues Datum/Uhrzeit] verschoben werden.
Prüfe zuerst, ob der neue Slot gegen eine dieser Regeln verstößt: nichts vor 09:00, kein Feiertag oder Urlaub, keine Überschneidung, Jour fixes nur dienstags, Rückfahrtpuffer nach dem Wirtschaftsausschuss, Mindestabstand 10 Minuten.
Zeige mir das Ergebnis und frage, ob du den Termin verschieben sollst. Ohne meine Bestätigung änderst du nichts.
```

---

## Phase 5: Scharfstellen

### 5.1 Vorabprüfung
```
Fasse die Prüfung zusammen. Gib mir eine Tabelle mit den Spalten Prüfpunkt, Ergebnis (stimmt / Abweichung / nicht prüfbar), Anzahl Abweichungen, für diese Prüfpunkte:
1. Anzahl 613 Termine mit GFK2027
2. nichts vor 09:00
3. Fokuszeit, Projektarbeit, Wochengespräch
4. Wirtschaftsausschuss und Puffer
5. Jour fixes (Tag und Dauer)
6. JF Personal als Block
7. Steuerkreise, Anreise, Hospitation
8. Klausuren nicht in derselben Woche
9. Innere Mission (Anzahl, Ferien)
10. Termine in Urlaub oder an Feiertagen
11. Überschneidungen zwischen GFK2027 und anderen Terminen
12. offene Doppelungen
Am Ende: Ist der Kalender bereit zum Scharfstellen? Antworte mit Ja oder Nein und nenne bei Nein die drei wichtigsten Punkte.
```

### 5.2 Teams-Besprechungen (nur für die digitalen Reihen)
```
Nenne mir alle Reihen mit der Kategorie „GFK2027“, die laut Ort oder Notiz digital stattfinden (kein Ort oder „Teams“). Gib je Reihe Titel, Anzahl und ein Beispieldatum an. Schalte noch keine Teams-Besprechung ein.
```

### 5.3 Im echten Kalender
```
Nur auf meine ausdrückliche Anweisung: Wechsle zum Kalender der Geschäftsführung. Zähle dort die Termine mit der Kategorie „GFK2027“ im Jahr 2027. Es sollen 0 sein, solange noch nicht importiert wurde. Berichte, ändere nichts.
```

Danach verschiebst du die Termine selbst in der Listenansicht: Kategorie `GFK2027` suchen, alle markieren und in den Kalender der Geschäftsführung verschieben. Danach läuft die Prüfung aus Phase 1 und 3 noch einmal im echten Kalender.

---

## Phase 6: Laufender Betrieb

### 6.1 Neuen Termin einplanen
```
Ich möchte folgenden Termin einplanen: [Titel], Dauer [Minuten], Zeitraum [von–bis], bevorzugter Wochentag [Tag].
Suche freie Slots im Kalender der Geschäftsführung, die diese Regeln erfüllen: nichts vor 09:00, kein Feiertag, kein Urlaub, keine Überschneidung, mindestens 10 Minuten Abstand zu anderen Terminen, Jour fixes nur dienstags, Fokuszeit am Montag (09:00–10:30) und Freitag (09:00–11:00) sowie Projektarbeit am Mittwoch (12:00–14:00) bleiben frei. Nenne die besten drei Vorschläge mit Begründung. Lege noch nichts an.
```

### 6.2 Wochenvorschau
```
Gib mir die Wochenvorschau für die Woche ab [Datum] für den Kalender der Geschäftsführung: je Tag die Termine mit Uhrzeit, markiere Lücken kürzer als 10 Minuten, Termine ohne Ort und Termine ohne Kategorie.
```

### 6.3 Wöchentlicher Kurzcheck (freitags)
```
Prüfe die kommenden 4 Wochen im Kalender der Geschäftsführung gegen die Regeln aus Phase 2: nichts vor 09:00, keine Überschneidungen, Jour fixes nur dienstags, Rückfahrtpuffer, Urlaub und Feiertage frei. Melde nur Abweichungen als kurze Liste mit Datum, Uhrzeit, Titel und Regel. Wenn alles stimmt, schreibe nur „keine Abweichung“.
```

---

## Anhang: Wenn der Copilot etwas nicht kann
| Symptom | Was du tun kannst |
|---|---|
| Er zählt andere Zahlen als erwartet | Zeitraum und Kalender im Prompt nennen; Kategorie „GFK2027“ in der Listenansicht gegenprüfen |
| Er kennt die Kategorie nicht | Im Outlook-Suchfeld nach der Kategorie filtern und die Zahl selbst nennen |
| Er ändert eine Serie komplett | Rückgängig machen (Strg+Z), Phase 0 erneut senden |
| Er übersieht Termine | Kürzeren Zeitraum wählen (ein Quartal) und erneut fragen |
| Er schlägt Slots vor, die gegen Regeln verstoßen | Regeln noch einmal im Prompt nennen und bestätigen lassen |
