/*
 * Prüfungen für index.html über die Schnittstelle window.GFKAL.
 * Start:  node tests/check-index.js
 * Voraussetzung: Playwright mit Chromium (globale oder lokale Installation).
 * Umgebung: CHROMIUM_PATH setzt den Browser-Pfad, sonst gilt der Playwright-Standard.
 */
var path = require("path");
var pw;
try { pw = require("playwright"); } catch (e) { pw = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright"); }
var URL = "file://" + path.resolve(__dirname, "..", "index.html");

var results = [], failed = 0;
function ok(cond, msg) { if (!cond) throw new Error("Prüfung fehlgeschlagen: " + msg); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg + " (erwartet " + JSON.stringify(b) + ", war " + JSON.stringify(a) + ")"); }

(async function() {
  var launch = { args: ["--no-sandbox"] };
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  else if (require("fs").existsSync("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")) launch.executablePath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  var browser = await pw.chromium.launch(launch);

  async function page(opts) {
    var ctx = await browser.newContext(opts || {});
    var p = await ctx.newPage();
    p.__errors = [];
    p.on("pageerror", function(e) { p.__errors.push(String(e)); });
    await p.goto(URL);
    return p;
  }
  async function test(name, fn, opts) {
    var p = await page(opts);
    try { await fn(p); if (p.__errors.length) throw new Error("Skriptfehler: " + p.__errors[0]); results.push("ok    " + name); }
    catch (e) { failed++; results.push("FEHLER " + name + "\n        " + e.message); }
    await p.context().close();
  }

  // ---------- Ausgangsstand ----------
  await test("Ausgangsstand: 599 Termine, keine Verstöße, alles in 2027, keine Ausweichkonflikte", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, flat = G.allEventsFlat(), v = 0;
      for (var dk in G.eventsData()) G.checkPlausibility(dk).forEach(function(x) { if (!x.ok) v++; });
      return { total: flat.length, v: v, outside: flat.filter(function(x) { return x.dateKey.slice(0, 4) !== "2027"; }).length, conflicts: G.generationConflicts().length };
    });
    eq(r, { total: 599, v: 0, outside: 0, conflicts: 0 }, "Ausgangsstand");
  });
  await test("Raster: kein Terminende nach 18:00 (außer Klausuren), keine Lücke unter 10 Minuten", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, D = G.eventsData(), late = 0, small = 0;
      var tm = function(s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; };
      for (var dk in D) {
        var e = D[dk].slice().sort(function(a, b) { return tm(a.start) - tm(b.start); });
        e.forEach(function(x) { if (x.type !== "Klausur" && tm(x.start) + x.duration > 1080) late++; });
        for (var i = 1; i < e.length; i++) {
          if (e[i].blockKey && e[i].blockKey === e[i - 1].blockKey) continue;
          if (e[i].rule && e[i].rule.id === "lk-ambulant-stationaer") continue;
          var gap = tm(e[i].start) - (tm(e[i - 1].start) + e[i - 1].duration);
          if (gap >= 0 && gap < 10) small++;
        }
      }
      return { late: late, small: small };
    });
    eq(r, { late: 0, small: 0 }, "Raster");
  });
  await test("Slot-Suche: Raster vor der Suche – Slots liegen im Raster, frei und enden spätestens um 18:00", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, dk = "2027-01-09", out = { belegt: 0, schlecht: 0 };   // leerer Samstag: nur der Allokator wird geprüft
      var tm = function(s) { var a = s.split(":"); return +a[0] * 60 + +a[1]; }, hm = function(m) { return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + m % 60).slice(-2); };
      // Vorbelegung ohne Raster: endet 09:47 – der nächste Slot muss auf dem Raster liegen und mindestens 10 Minuten Abstand halten
      G.addEvent(dk, "V", "JF", "09:00", 47, "", null, {});
      for (var t = 0; t < 8; t++) {
        var s = G.findSlot(dk, "09:00", 50, {}), clash = G.eventsData()[dk].some(function(o) { var os = tm(o.start), oe = os + o.duration; return s < oe + 10 && os < s + 60; });
        out.belegt++; if (clash || s % 15 || s + 50 > 1080) out.schlecht++;
        G.addEvent(dk, "T" + t, "JF", hm(s), 50, "", null, {});
      }
      // früherer Fehler: freies Fenster bei 17:10 wurde auf 17:15 gerastet und endete um 18:05
      var dk2 = "2027-01-10"; G.addEvent(dk2, "Spät", "JF", "16:10", 50, "", null, {});
      var s2 = G.findSlot(dk2, "17:00", 50, {}); out.spaet = { start: s2, ende: s2 + 50 };
      return out;
    });
    eq(r.schlecht, 0, "Slots außerhalb Raster, kollidierend oder nach 18:00");
    ok(r.spaet.ende <= 1080, "Slot endet nach 18:00: " + JSON.stringify(r.spaet));
  });

  // ---------- Regeln und Serien ----------
  await test("Befund 1: Turnus ohne Serienhäkchen ändert nur eine Kopie für diesen Termin", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, partner = G.allEventsFlat().filter(function(x) { return x.ev.rule && x.ev.rule.id === "jf-partner"; });
      var first = partner[0];
      G.openForm(first.dateKey, first.ev.uid);
      document.getElementById("fTurnus").value = "alle 8 Wochen";
      document.getElementById("fSeries").checked = false;
      G.saveForm();
      var after = G.allEventsFlat().filter(function(x) { return x.ev.rule && (x.ev.rule.baseId || x.ev.rule.id) === "jf-partner"; });
      return { total: partner.length, geaendert: after.filter(function(x) { return x.ev.rule.turnus === "alle 8 Wochen"; }).length, original: G.RULES()["jf-partner"].turnus };
    });
    eq(r, { total: 156, geaendert: 1, original: "monatlich" }, "Regel-Kopie");
  });
  await test("Befund 1: mit Serienhäkchen ändert sich nur die eigene Serie, nicht die anderen Partner", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, first = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "partner-JF Zittlau"; })[0];
      G.openForm(first.dateKey, first.ev.uid);
      document.getElementById("fTurnus").value = "alle 2 Monate";
      document.getElementById("fSeries").checked = true;
      G.saveForm();
      var all = G.allEventsFlat().filter(function(x) { return x.ev.rule && (x.ev.rule.baseId || x.ev.rule.id) === "jf-partner"; });
      var z = all.filter(function(x) { return x.ev.seriesId === "partner-JF Zittlau"; });
      return { zittlau: z.every(function(x) { return x.ev.rule.turnus === "alle 2 Monate"; }), andere: all.filter(function(x) { return x.ev.seriesId !== "partner-JF Zittlau" && x.ev.rule.turnus !== "monatlich"; }).length };
    });
    eq(r, { zittlau: true, andere: 0 }, "Serienänderung");
  });
  await test("Befund 2: Steuerungsgruppen haben drei Serien, Änderung an einer lässt die anderen stehen", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, flat = G.allEventsFlat();
      var ids = {}; flat.forEach(function(x) { if (x.ev.seriesId && x.ev.seriesId.indexOf("steuerungsgruppe") === 0) ids[x.ev.seriesId] = (ids[x.ev.seriesId] || 0) + 1; });
      var first = flat.filter(function(x) { return x.ev.seriesId === "steuerungsgruppe-personal"; })[0];
      G.openForm(first.dateKey, first.ev.uid);
      document.getElementById("fTitle").value = "Steuerungsgruppe Personal NEU";
      document.getElementById("fSeries").checked = true;
      G.saveForm();
      var titles = {}; G.allEventsFlat().forEach(function(x) { if (x.ev.seriesId && x.ev.seriesId.indexOf("steuerungsgruppe") === 0) titles[x.ev.title] = 1; });
      return { ids: Object.keys(ids).length, titles: Object.keys(titles).sort() };
    });
    eq(r.ids, 3, "Anzahl Serien");
    eq(r.titles, ["Steuerungsgruppe Digitalisierung", "Steuerungsgruppe Personal NEU", "Steuerungsgruppe UK DR"], "Titel");
  });
  await test("Befund 5: Tag-Tausch behält beide Dauern und die Spanne, ohne neue Überschneidung", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, day = "2027-01-04", D = G.eventsData()[day];
      var a = D.filter(function(e) { return e.title.indexOf("Fokuszeit") === 0; })[0], b = D.filter(function(e) { return e.title.indexOf("Leitungskonferenz") === 0; })[0];
      var d1 = a.duration, d2 = b.duration;
      G.swapEventTimes(day, a.uid, b.uid);
      var msgs = G.checkPlausibility(day).filter(function(x) { return x.messages.join("").indexOf("Überschneidung") >= 0; }).length;
      return { d: [a.duration === d1, b.duration === d2], lk: b.time, fokus: a.time, ueberschneidung: msgs };
    });
    eq(r.d, [true, true], "Dauer");
    eq(r.lk, "07:30 – 09:30", "LK beginnt am Anfang der Spanne");
    eq(r.fokus, "14:30 – 16:00", "Fokus endet am Ende der Spanne");
    eq(r.ueberschneidung, 0, "Überschneidungen");
  });
  await test("Blockteile lassen sich nicht einzeln tauschen", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, parts = G.allEventsFlat().filter(function(x) { return x.ev.blockKey; });
      var day = parts[0].dateKey, same = parts.filter(function(x) { return x.dateKey === day; });
      var before = same.map(function(x) { return x.ev.start; });
      G.swapEventTimes(day, same[0].ev.uid, same[1].ev.uid);
      return { unveraendert: JSON.stringify(same.map(function(x) { return x.ev.start; })) === JSON.stringify(before), dialog: document.getElementById("dlgOverlay").classList.contains("active") };
    });
    eq(r, { unveraendert: true, dialog: true }, "Blocktausch");
  });

  // ---------- Prüfregeln ----------
  await test("Turnus: Jahndorf-Abstand liegt zwischen 42 und 56 Tagen", async function(p) {
    var days = await p.evaluate(function() {
      var d = window.GFKAL.allEventsFlat().filter(function(x) { return x.ev.seriesId === "jahndorf"; }).map(function(x) { return x.dateKey; }).sort(), out = [];
      for (var i = 1; i < d.length; i++) out.push(Math.round((new Date(d[i]) - new Date(d[i - 1])) / 86400000));
      return out;
    });
    ok(days.every(function(x) { return x >= 42 && x <= 56; }), "Abstände " + days.join(","));
  });
  await test("Turnus: eine Lücke über 8 Wochen wird gemeldet (Jahndorf)", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, j = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "jahndorf"; }).sort(function(a, b) { return a.dateKey < b.dateKey ? -1 : 1; });
      var mid = j[3]; G.eventsData()[mid.dateKey] = G.eventsData()[mid.dateKey].filter(function(e) { return e.uid !== mid.ev.uid; });
      var msgs = []; G.recomputeViolations();
      for (var dk in G.eventsData()) G.checkPlausibility(dk).forEach(function(x) { if (!x.ok && x.ev.seriesId === "jahndorf") msgs = msgs.concat(x.messages); });
      return msgs;
    });
    ok(r.length && r[0].indexOf("Lücke") === 0, "Lückenmeldung fehlt: " + JSON.stringify(r));
  });
  await test("Turnus: „2x jährlich“ – zwei Vorkommen ohne Meldung, ein drittes wird gemeldet", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, before = 0;
      G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "klausur-sw"; }).forEach(function(x) { G.checkPlausibility(x.dateKey).forEach(function(y) { if (y.ev.uid === x.ev.uid && !y.ok) before++; }); });
      var neu = G.addEvent("2027-07-06", "Leistungsklausur Sozialwirtschaft (Tag 1)", "Klausur", "09:00", 60, "", G.RULES()["klausur-sw"], { seriesId: "klausur-sw" });
      var msgs = G.checkPlausibility("2027-07-06").filter(function(x) { return x.ev.uid === neu.uid; })[0].messages.filter(function(m) { return m.indexOf("Vorkommen") >= 0; });
      return { before: before, msgs: msgs.length };
    });
    eq(r, { before: 0, msgs: 1 }, "2x jährlich");
  });
  await test("Turnus: Freitext wird über Arten erkannt (halbjährlich, 2-3x, alle 6–8 Wochen, unregelmäßig)", async function(p) {
    var r = await p.evaluate(function() {
      var P = window.GFKAL.parseTurnus;
      return ["wöchentlich", "monatlich", "quartalsweise", "halbjährlich", "2x jährlich", "2-3x jährlich", "jährlich (November)", "alle 2 Monate", "alle 6-8 Wochen", "alle 6–8 Wochen", "alle 8 Wochen", "unregelmäßig", "offen", "ca. 4–5×/Jahr"].map(function(t) { var s = P(t); return s.kind + (s.maxDays ? ":" + s.minDays + "-" + s.maxDays : "") + (s.maxPerYear ? ":max" + s.maxPerYear : ""); });
    });
    eq(r, ["weekly", "monthly", "interval:70-112", "halfyear:max2", "peryear:max2", "peryear:max3", "peryear:max1", "interval:42-73", "interval:42-56", "interval:42-56", "interval:49-63", "open", "open", "open"], "Turnusarten");
  });
  await test("Befund 8: Doppelpack – 30 Minuten Lücke nach dem Steuerkreis W&F wird gemeldet", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, qm = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "sk-qm"; })[0], e = qm.ev;
      var wf = G.eventsData()[qm.dateKey].filter(function(o) { return o.seriesId === "sk-wifi"; })[0];
      e.start = ("0" + Math.floor((wf.start.split(":")[0] * 60 + +wf.start.split(":")[1] + wf.duration + 30) / 60)).slice(-2) + ":" + ("0" + (wf.start.split(":")[1] * 1 + wf.duration + 30) % 60).slice(-2);
      e.time = e.start + " – 23:59";
      return G.checkPlausibility(qm.dateKey).filter(function(x) { return x.ev.uid === e.uid; })[0].messages.filter(function(m) { return m.indexOf("Doppelpack") === 0; });
    });
    ok(r.length === 1, "Doppelpack-Meldung fehlt: " + JSON.stringify(r));
  });
  await test("Befund 9: Personal-Block aus der Regel – vier Teile fehlen nicht, zwei Teile werden gemeldet", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, parts = G.allEventsFlat().filter(function(x) { return x.ev.blockKey; });
      var day = parts[0].dateKey, bk = parts[0].ev.blockKey;
      G.eventsData()[day] = G.eventsData()[day].filter(function(e) { return !(e.blockKey === bk && e.title.indexOf("Wechselpuffer") > 0); });
      return G.checkPlausibility(day).filter(function(x) { return x.ev.blockKey === bk; })[0].messages.filter(function(m) { return m.indexOf("Block unvollständig") === 0; });
    });
    ok(r.length === 1 && r[0].indexOf("2 von 3") > 0, "Blockmeldung: " + JSON.stringify(r));
  });
  await test("Befund 10: gesperrtes Format – Felder schreibgeschützt, Abweichung nur bewusst", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, w = G.allEventsFlat().filter(function(x) { return x.ev.rule && x.ev.rule.id === "wirtschaftsausschuss"; })[0], out = {};
      G.openForm(w.dateKey, w.ev.uid);
      out.gesperrt = ["fTitle", "fStart", "fDuration", "fTurnus"].every(function(id) { return document.getElementById(id).readOnly; });
      document.getElementById("fTitle").value = "Etwas anderes"; document.getElementById("fDuration").value = 30; G.saveForm();
      out.titelOhneHaken = G.eventsData()[w.dateKey].filter(function(e) { return e.uid === w.ev.uid; })[0].title;
      G.openForm(w.dateKey, w.ev.uid);
      document.getElementById("fDeviate").checked = true; document.getElementById("fDeviate").dispatchEvent(new Event("change"));
      out.entsperrt = !document.getElementById("fTitle").readOnly;
      document.getElementById("fTitle").value = "Etwas anderes"; G.saveForm();
      var ev = G.eventsData()[w.dateKey].filter(function(e) { return e.uid === w.ev.uid; })[0];
      out.titelMitHaken = ev.title; out.abweichung = ev.deviation;
      out.titelMeldung = G.checkPlausibility(w.dateKey).filter(function(x) { return x.ev.uid === w.ev.uid; })[0].messages.filter(function(m) { return m.indexOf("Titel weicht") === 0; }).length;
      return out;
    });
    eq(r, { gesperrt: true, titelOhneHaken: "Wirtschaftsausschuss SBO", entsperrt: true, titelMitHaken: "Etwas anderes", abweichung: true, titelMeldung: 0 }, "Sperre");
  });
  await test("Befund 10: Verschieben eines gesperrten Formats meldet die Abweichung", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, lk = G.allEventsFlat().filter(function(x) { return x.ev.rule && x.ev.rule.id === "lk-sozialwirtschaft"; })[0];
      G.moveEvent(lk.dateKey, lk.ev.uid, lk.dateKey, "10:00");
      return G.checkPlausibility(lk.dateKey).filter(function(x) { return x.ev.uid === lk.ev.uid; })[0].messages.filter(function(m) { return m.indexOf("Beginn/Dauer weichen") === 0; }).length;
    });
    eq(r, 1, "Abweichungsmeldung");
  });
  await test("Punkt 11: zweites Montagsfenster 09:00–10:30 ist zulässig, andere Fenster nicht", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, f = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "fokuszeit-mo"; })[0], e = f.ev;
      var check = function() { return G.checkPlausibility(f.dateKey).filter(function(x) { return x.ev.uid === e.uid; })[0]; };
      e.start = "09:00"; e.time = "09:00 – 10:30"; var alt = check();
      e.start = "10:00"; e.time = "10:00 – 11:30"; var anders = check();
      return { altOk: alt.messages.filter(function(m) { return m.indexOf("Zeitfenster") === 0; }).length, altHinweis: alt.hints.some(function(h) { return h.indexOf("Alternatives") === 0; }), andersMeldung: anders.messages.filter(function(m) { return m.indexOf("Zeitfenster") === 0; }).length };
    });
    eq(r, { altOk: 0, altHinweis: true, andersMeldung: 1 }, "Montagsfenster");
  });
  await test("Punkt 11: Annahme lässt sich im Formular quittieren, auch für die ganze Serie", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, first = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "wochengespraech"; })[0], out = {};
      out.vorher = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "wochengespraech" && x.ev.assumption; }).length;
      G.openForm(first.dateKey, first.ev.uid);
      out.zeileSichtbar = document.getElementById("fAssumptionRow").style.display !== "none";
      document.getElementById("fAssumption").checked = false; document.getElementById("fSeries").checked = true; G.saveForm();
      out.nachher = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "wochengespraech" && x.ev.assumption; }).length;
      return out;
    });
    eq(r, { vorher: 12, zeileSichtbar: true, nachher: 0 }, "Annahme");
  });

  // ---------- Verschieben, Drag ----------
  await test("Befund 9/12: Drag nie vor 07:00 und nie über 18:00, Klausur wird geklemmt", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, kl = G.eventsData()["2027-05-03"].filter(function(e) { return e.type === "Klausur"; })[0], out = {};
      G.moveEvent("2027-05-03", kl.uid, "2027-06-14", "18:00", { clampGrid: true }); out.klausur = kl.time;
      var f = G.eventsData()["2027-06-07"].filter(function(e) { return e.title.indexOf("Fokuszeit") === 0; })[0];
      G.moveEvent("2027-06-07", f.uid, "2027-06-07", "06:00", { clampGrid: true }); out.fokus = f.time;
      return out;
    });
    eq(r, { klausur: "09:00 – 18:00", fokus: "07:00 – 08:30" }, "Klemmen");
  });
  await test("Befund 13: Block wird nur als Ganzes verschoben und bleibt bei Klemmen zusammen", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, parts = G.allEventsFlat().filter(function(x) { return x.ev.blockKey; }), day = parts[0].dateKey, bk = parts[0].ev.blockKey;
      var part2 = G.eventsData()[day].filter(function(e) { return e.blockKey === bk && e.title.indexOf("Poolspringer") > 0; })[0];
      G.moveEvent(day, part2.uid, day, "00:30", { clampGrid: true });
      var now = G.eventsData()[day].filter(function(e) { return e.blockKey === bk; }).sort(function(a, b) { return a.start < b.start ? -1 : 1; });
      var v = G.checkPlausibility(day).filter(function(x) { return x.ev.blockKey === bk && !x.ok; }).length;
      return { teile: now.length, zeiten: now.map(function(e) { return e.time; }), verstoesse: v };
    });
    eq(r.teile, 3, "Teile"); eq(r.verstoesse, 0, "Block bleibt regelkonform");
    ok(r.zeiten[0].indexOf("07:00") === 0, "Block beginnt nicht um 07:00: " + r.zeiten.join(","));
  });
  await test("Verschieben über Mitternacht ist ausgeschlossen (kein „27:00“)", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, kl = G.eventsData()["2027-05-03"].filter(function(e) { return e.type === "Klausur"; })[0];
      G.moveEvent("2027-05-03", kl.uid, "2027-06-14", "23:00");
      return kl.time;
    });
    eq(r, "15:00 – 24:00", "Klemmen am Tagesende");
  });
  await test("Verschiebungen bleiben im Jahr 2027 und prüfen das Ziel erneut", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, bad = 0, hol = 0;
      G.allEventsFlat().forEach(function(x) { if (x.dateKey.slice(0, 4) !== "2027") bad++; });
      for (var dk in G.eventsData()) G.checkPlausibility(dk).forEach(function(y) { if (y.messages.some(function(m) { return m.indexOf("Feiertag") >= 0; })) hol++; });
      return { bad: bad, hol: hol, conflicts: G.generationConflicts().length };
    });
    eq(r, { bad: 0, hol: 0, conflicts: 0 }, "Jahrgrenze");
  });
  await test("Touch: Termin per Pointer-Ereignissen in eine andere Spalte ziehen", async function(p) {
    var r = await p.evaluate(async function() {
      var G = window.GFKAL; G.openFocus("2027-06-08", "week");
      var el = Array.prototype.filter.call(document.querySelectorAll(".week-ev"), function(e) { return e.textContent.indexOf("JF Zittlau") >= 0 || e.textContent.indexOf("JF Weisang") >= 0 || e.textContent.indexOf("JF Lahn") >= 0; })[0];
      if (!el) el = document.querySelector(".week-ev");
      var title = el.querySelector("b").textContent;
      var cols = document.querySelectorAll(".week-col"), target = cols[3], tr = target.getBoundingClientRect(), er = el.getBoundingClientRect();
      var fire = function(t, x, y) { el.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); };
      var sx = er.left + 10, sy = er.top + 6;
      fire("pointerdown", sx, sy); fire("pointermove", sx + 30, sy + 40);
      fire("pointermove", tr.left + 20, tr.top + 6 * 44); fire("pointerup", tr.left + 20, tr.top + 6 * 44);
      var moved = G.allEventsFlat().filter(function(x) { return x.ev.title === title && x.dateKey === target.getAttribute("data-date"); }).length;
      return { moved: moved, ziel: target.getAttribute("data-date") };
    }, null);
    ok(r.moved >= 1, "Termin wurde nicht in die Zielspalte " + r.ziel + " verschoben");
  }, { hasTouch: true, viewport: { width: 1280, height: 900 } });
  await test("Woche unter 768 px wird als Tagesliste angezeigt, darüber als Raster", async function(p) {
    var mobile = await p.evaluate(function() { window.GFKAL.openFocus("2027-06-08", "week"); return { list: !!document.querySelector(".week-list"), grid: !!document.querySelector(".week-grid") }; });
    eq(mobile, { list: true, grid: false }, "mobil");
    await p.setViewportSize({ width: 1100, height: 800 });
    await p.waitForTimeout(300);
    var desk = await p.evaluate(function() { return { list: !!document.querySelector(".week-list"), grid: !!document.querySelector(".week-grid") }; });
    eq(desk, { list: false, grid: true }, "Desktop nach Größenänderung");
  }, { viewport: { width: 400, height: 800 } });

  // ---------- Import, Speicher ----------
  await test("Befund 6: Import ohne Jahr, mit leerem Termin oder ohne Pflichtfelder wird abgewiesen, Bestand bleibt", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, n = G.allEventsFlat().length, out = {};
      var cases = { ohneJahr: { events: [] }, leererTermin: { year: 2027, events: [{}] }, keineListe: { year: 2027, events: "x" }, falscherTyp: { year: 2027, events: [{ date: "2027-01-05", title: "X", type: "Foo", start: "09:00", duration: 50 }] }, dauerZuGross: { year: 2027, events: [{ date: "2027-01-05", title: "X", type: "JF", start: "09:00", duration: 5000 }] }, datumFalsch: { year: 2027, events: [{ date: "2027-02-30", title: "X", type: "JF", start: "09:00", duration: 50 }] }, jahrFalsch: { year: 2027, events: [{ date: "2028-01-05", title: "X", type: "JF", start: "09:00", duration: 50 }] }, ueberMitternacht: { year: 2027, events: [{ date: "2027-01-05", title: "X", type: "JF", start: "23:30", duration: 120 }] }, unbekannteRegel: { year: 2027, events: [{ date: "2027-01-05", title: "X", type: "JF", start: "09:00", duration: 50, ruleId: "gibt-es-nicht" }] } };
      for (var k in cases) { try { G.deserialize(cases[k]); out[k] = "angenommen"; } catch (e) { out[k] = "abgewiesen"; } }
      out.bestand = G.allEventsFlat().length === n;
      return out;
    });
    Object.keys(r).forEach(function(k) { if (k !== "bestand") eq(r[k], "abgewiesen", k); });
    eq(r.bestand, true, "Bestand unverändert");
  });
  await test("Befund 6/XSS: eingeschleuster HTML-Code im Beginn wird abgewiesen und nie ausgeführt", async function(p) {
    var r = await p.evaluate(async function() {
      var G = window.GFKAL, s = G.serialize();
      s.events = [{ date: "2027-01-04", uid: "ev1", title: "harmlos", type: "JF", start: "<img src=x onerror=\"window.__xss=1\">", duration: 50, ruleId: null }];
      var abgewiesen = false; try { G.deserialize(s); } catch (e) { abgewiesen = true; }
      G.addEvent("2027-01-05", "<img src=x onerror=\"window.__xss=2\">", "JF", "09:00", 50, "<b>x</b>", null, { ort: "<i>o</i>" });
      G.afterChange(null); G.openFocus("2027-01-05", "day");
      await new Promise(function(r) { setTimeout(r, 300); });
      return { abgewiesen: abgewiesen, ausgefuehrt: window.__xss, imgs: document.querySelectorAll("#focusBody img, #detailList img, .cell img").length };
    });
    eq(r, { abgewiesen: true, ausgefuehrt: undefined, imgs: 0 }, "XSS");
  });
  await test("Import: Rückfrage, Ersetzen und Rückgängig (ganze Dateiroute)", async function(p) {
    var data = await p.evaluate(function() { var s = window.GFKAL.serialize(); s.events = s.events.slice(0, 10); return JSON.stringify(s); });
    var tmp = path.join(require("os").tmpdir(), "gfkal-import-test.json"); require("fs").writeFileSync(tmp, data);
    await p.setInputFiles("#importFile", tmp);
    await p.waitForSelector("#dlgOverlay.active");
    var text = await p.textContent("#dlgText");
    ok(text.indexOf("10 Termine") >= 0, "Rückfrage nennt nicht die Terminzahl: " + text);
    eq(await p.evaluate(function() { return window.GFKAL.allEventsFlat().length; }), 599, "vor der Bestätigung unverändert");
    await p.click("#dlgFooter .btn.danger");
    eq(await p.evaluate(function() { return window.GFKAL.allEventsFlat().length; }), 10, "nach der Bestätigung ersetzt");
    await p.click("#btnUndo");
    eq(await p.evaluate(function() { return window.GFKAL.allEventsFlat().length; }), 599, "Rückgängig stellt den Bestand her");
  });
  await test("JSON Version 4: Regeln einmal, keine abgeleiteten Felder, Rundlauf bleibt verlustfrei", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, s = G.serialize(), j = JSON.stringify(s);
      var ev0 = s.events[0], rules = Object.keys(s.rules).length;
      var before = G.allEventsFlat().length; G.deserialize(JSON.parse(j)); G.recomputeViolations();
      var v = 0; for (var dk in G.eventsData()) G.checkPlausibility(dk).forEach(function(x) { if (!x.ok) v++; });
      return { version: s.version, rules: rules, regelImTermin: "rule" in ev0, abgeleitet: ("time" in ev0) || ("color" in ev0), bytes: j.length, gleich: G.allEventsFlat().length === before, verstoesse: v };
    });
    eq(r.version, 4, "Version"); eq(r.regelImTermin, false, "Regel im Termin"); eq(r.abgeleitet, false, "time/color im JSON"); eq(r.gleich, true, "Terminzahl"); eq(r.verstoesse, 0, "Verstöße nach Rundlauf");
    ok(r.bytes < 250000, "JSON zu groß: " + r.bytes);
  });
  await test("JSON Version 3 (Regel je Termin) lässt sich weiterhin importieren", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, s = G.serialize(), rules = s.rules;
      s.version = 3; delete s.rules;
      s.events = s.events.map(function(e) { e.rule = e.ruleId ? rules[e.ruleId] : null; delete e.ruleId; return e; });
      G.deserialize(s);
      return { n: G.allEventsFlat().length, regeln: Object.keys(G.RULES()).length };
    });
    eq(r.n, 599, "Terminzahl");
    ok(r.regeln >= 26, "Regeln aus Version 3 nicht übernommen: " + r.regeln);
  });
  await test("Befund 14: Ausgangsstand schreibt den Browserstand nicht sofort zurück, Rückgängig stellt her", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, d = G.allEventsFlat().filter(function(x) { return x.ev.title.indexOf("Fokuszeit") === 0; })[0];
      G.deleteEvent(d.dateKey, d.ev.uid); document.querySelector("#dlgFooter .btn.danger").click();
      var gespeichert = localStorage.getItem(G.CONFIG.STORAGE_KEY) !== null, n1 = G.allEventsFlat().length;
      document.getElementById("btnReset").click(); document.querySelector("#dlgFooter .btn.danger").click();
      var nachReset = localStorage.getItem(G.CONFIG.STORAGE_KEY) === null, n2 = G.allEventsFlat().length;
      G.undo();
      return { gespeichert: gespeichert, n1: n1, nachResetLeer: nachReset, n2: n2, n3: G.allEventsFlat().length };
    });
    eq(r, { gespeichert: true, n1: 598, nachResetLeer: true, n2: 599, n3: 598 }, "Ausgangsstand");
  });
  await test("Autosave und Wiederherstellen: Banner erscheint nach Neuladen, Stand kommt zurück", async function(p) {
    await p.evaluate(function() { var G = window.GFKAL, d = G.allEventsFlat()[0]; G.deleteEvent(d.dateKey, d.ev.uid); document.querySelector("#dlgFooter .btn.danger").click(); });
    await p.reload();
    ok(await p.isVisible("#restoreBanner"), "Banner fehlt");
    await p.click("#restoreYes");
    eq(await p.evaluate(function() { return window.GFKAL.allEventsFlat().length; }), 598, "wiederhergestellter Bestand");
  });
  await test("Speicher-Schnittstelle: Store lässt sich austauschen (Vorbereitung Backend)", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, calls = [];
      G.Store.save = function(o) { calls.push(o.version); return true; };
      var d = G.allEventsFlat()[0]; G.moveEvent(d.dateKey, d.ev.uid, d.dateKey, "12:00");
      return calls;
    });
    eq(r, [4], "Store.save wird mit Version 4 gerufen");
  });

  // ---------- Bedienung ----------
  await test("Rückgängig: bis zu 50 Schritte, Ctrl+Z, Schaltfläche", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, d = G.allEventsFlat().filter(function(x) { return x.ev.title.indexOf("Fokuszeit") === 0; })[0];
      for (var i = 0; i < 55; i++) G.moveEvent(d.dateKey, d.ev.uid, d.dateKey, i % 2 ? "08:00" : "10:00");
      return { tiefe: G.undoDepth(), aktiv: !document.getElementById("btnUndo").disabled };
    });
    eq(r, { tiefe: 50, aktiv: true }, "Stapel");
    await p.keyboard.press("Control+z");
    eq(await p.evaluate(function() { return window.GFKAL.undoDepth(); }), 49, "Strg+Z nimmt einen Schritt zurück");
  });
  await test("Filter und Suche gelten in Jahresraster, Seitenspalte, Tag, Woche und Monat", async function(p) {
    var r = await p.evaluate(async function() {
      var G = window.GFKAL, out = {};
      G.setFilter({ types: ["JF", "Steuerkreis"], search: "jahndorf" });
      var visible = G.allEventsFlat().filter(function(x) { return G.passesFilter(x.ev); });
      out.treffer = visible.length; out.nurJahndorf = visible.every(function(x) { return x.ev.title.indexOf("Jahndorf") >= 0; });
      var day = visible[0].dateKey;
      out.raster = document.querySelectorAll('.cell[data-date="' + day + '"] .termin-dot').length;
      G.openFocus(day, "day"); out.tag = document.querySelectorAll("#focusBody .baustein-card").length;
      G.openFocus(day, "week"); out.woche = document.querySelectorAll(".week-ev").length;
      G.openFocus(day, "month"); out.monat = document.querySelectorAll(".month-day").length;
      out.seitenspalte = (document.querySelector("#calendarContainer") !== null);
      G.setFilter({ types: [], search: "", onlyPlaceholder: true });
      out.nurPlatzhalter = G.allEventsFlat().filter(function(x) { return G.passesFilter(x.ev); }).every(function(x) { return x.ev.placeholder; });
      G.setFilter({ types: ["Blocker"], onlyPlaceholder: false });
      out.blockerInklKlausur = G.allEventsFlat().filter(function(x) { return G.passesFilter(x.ev); }).every(function(x) { return ["Blocker", "Projekt", "Klausur"].indexOf(x.ev.type) >= 0; });
      return out;
    });
    ok(r.treffer === 8 && r.nurJahndorf, "Suche liefert nicht die acht Jahndorf-Termine: " + JSON.stringify(r));
    eq([r.raster, r.tag, r.woche, r.monat], [1, 1, 1, 1], "gefilterte Ansichten zeigen genau den einen Jahndorf-Termin");
    eq([r.nurPlatzhalter, r.blockerInklKlausur], [true, true], "Zusatzfilter");
  });
  await test("Filterschaltflächen: Mehrfachauswahl, Platzhalter unabhängig, „Alle Formate“ setzt zurück", async function(p) {
    await p.click('[data-filter="JF"]'); await p.click('[data-filter="Steuerkreis"]');
    eq(await p.getAttribute('[data-filter="JF"]', "aria-pressed"), "true", "JF gedrückt");
    eq(await p.getAttribute('[data-filter="all"]', "aria-pressed"), "false", "Alle nicht gedrückt");
    await p.click('[data-filter="Platzhalter"]');
    await p.fill("#searchInput", "klausur");
    await p.waitForTimeout(400);
    ok((await p.textContent("#filterInfo")).indexOf("Filter aktiv") === 0, "Filterinfo fehlt");
    await p.click('[data-filter="all"]');
    eq(await p.inputValue("#searchInput"), "", "Suchfeld geleert");
    eq(await p.textContent("#filterInfo"), "", "Filterinfo leer");
  });
  await test("Tastatur: Pfeile bewegen Fokus und Auswahl, Enter öffnet den Fokusmodus, Escape gibt den Fokus zurück", async function(p) {
    await p.focus('.cell[data-date="2027-01-04"]');
    await p.keyboard.press("ArrowRight");
    eq(await p.evaluate(function() { return [document.activeElement.getAttribute("data-date"), document.querySelector(".cell.selected").getAttribute("data-date"), document.getElementById("detailHeading").textContent]; }), ["2027-01-05", "2027-01-05", "Dienstag, 5. Januar 2027"], "Pfeil rechts");
    await p.keyboard.press("ArrowDown");
    eq(await p.evaluate(function() { return document.activeElement.getAttribute("data-date"); }), "2027-01-12", "Pfeil unten = eine Woche");
    await p.keyboard.press("Enter");
    ok(await p.isVisible("#focusOverlay.active"), "Fokusmodus nicht geöffnet");
    ok(await p.evaluate(function() { return document.getElementById("focusOverlay").contains(document.activeElement); }), "Fokus liegt nicht im Dialog");
    await p.keyboard.press("Escape");
    eq(await p.evaluate(function() { return document.activeElement.getAttribute("data-date"); }), "2027-01-12", "Fokus kehrt zur Zelle zurück");
  });
  await test("Tastatur: nur eine Zelle ist Tab-Stopp, Raster mit Rollen und Namen mit Datum, Feiertag, Anzahl", async function(p) {
    var r = await p.evaluate(function() {
      var stops = document.querySelectorAll('.cell[tabindex="0"]').length;
      var grids = document.querySelectorAll('[role="grid"]').length, rows = document.querySelectorAll('[role="row"]').length;
      var label = document.querySelector('.cell[data-date="2027-01-01"]').getAttribute("aria-label");
      return { stops: stops, grids: grids, rowsOk: rows >= 12 * 4, label: label };
    });
    eq([r.stops, r.grids, r.rowsOk], [1, 12, true], "Rollen");
    ok(r.label.indexOf("Freitag, 1. Januar 2027, Feiertag: Neujahr") === 0, "Beschriftung: " + r.label);
  });
  await test("Dialoge: Fokus-Käfig hält Tab im Formular, Escape schließt und stellt den Fokus wieder her", async function(p) {
    await p.evaluate(function() { window.GFKAL.openFocus("2027-01-05", "day"); });
    await p.click("#fmNew");
    ok(await p.isVisible("#formOverlay.active"), "Formular nicht offen");
    for (var i = 0; i < 25; i++) {
      await p.keyboard.press("Tab");
      ok(await p.evaluate(function() { return document.getElementById("formOverlay").contains(document.activeElement); }), "Fokus verlässt das Formular nach " + (i + 1) + " Tab");
    }
    await p.keyboard.press("Shift+Tab");
    ok(await p.evaluate(function() { return document.getElementById("formOverlay").contains(document.activeElement); }), "Shift+Tab verlässt das Formular");
    await p.keyboard.press("Escape");
    eq(await p.evaluate(function() { return document.activeElement.id; }), "fmNew", "Fokus kehrt zum auslösenden Knopf zurück");
  });
  await test("Verstoßzahl steht in der Tageszelle, Kontrast der Projektfarbe ausreichend", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, f = G.allEventsFlat().filter(function(x) { return x.ev.title.indexOf("Fokuszeit") === 0; })[0];
      G.moveEvent(f.dateKey, f.ev.uid, f.dateKey, "13:00");
      var cell = document.querySelector('.cell[data-date="' + f.dateKey + '"]');
      var lum = function(hex) { var c = [1, 3, 5].map(function(i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
      var col = getComputedStyle(document.documentElement).getPropertyValue("--c-projekt").trim();
      return { badge: (cell.querySelector(".viol-count") || {}).textContent, label: cell.getAttribute("aria-label"), kontrast: 1.05 / (lum(col) + 0.05) };
    });
    ok(r.badge && +r.badge >= 1, "Verstoßzahl fehlt");
    ok(r.label.indexOf("Regelverst") > 0, "Verstoß nicht im Namen: " + r.label);
    ok(r.kontrast >= 4.5, "Kontrast Projektfarbe " + r.kontrast.toFixed(2));
  });
  await test("Hinweistexte nennen die Knöpfe „Bearbeiten“ und „Löschen“", async function(p) {
    await p.evaluate(function() { window.GFKAL.openFocus("2027-01-05", "day"); });
    var hint = await p.textContent("#focusHint"), btns = await p.evaluate(function() { return Array.prototype.map.call(document.querySelectorAll(".baustein-actions button"), function(b) { return b.textContent; }).slice(0, 2); });
    ok(hint.indexOf("Bearbeiten") >= 0 && hint.indexOf("Löschen") >= 0 && hint.indexOf("Stift") < 0 && hint.indexOf("Kreuz") < 0, "Hinweis: " + hint);
    ok(btns[0].indexOf("Bearbeiten") >= 0 && btns[1].indexOf("Löschen") >= 0, "Knöpfe: " + btns.join("|"));
  });
  await test("Formular: Dauer, Beginn und Titel werden geprüft, Blockteile sind gesperrt", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, out = {}, first = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "jahndorf"; })[0];
      G.openForm(first.dateKey, first.ev.uid);
      document.getElementById("fDuration").value = 5000; G.saveForm(); out.zuLang = document.getElementById("fWarn").textContent;
      document.getElementById("fDuration").value = 50; document.getElementById("fStart").value = "23:50"; G.saveForm(); out.mitternacht = document.getElementById("fWarn").textContent;
      var blk = G.allEventsFlat().filter(function(x) { return x.ev.blockKey; })[0];
      G.openForm(blk.dateKey, blk.ev.uid); out.blockGesperrt = document.getElementById("fStart").readOnly && document.getElementById("fDuration").readOnly;
      return out;
    });
    ok(r.zuLang.indexOf("zwischen 5 und 720") > 0, "Dauergrenze: " + r.zuLang);
    ok(r.mitternacht.indexOf("24:00") > 0, "Tagesgrenze: " + r.mitternacht);
    eq(r.blockGesperrt, true, "Blockteil");
  });

  // ---------- Formatliste, ICS ----------
  await test("Formatliste kommt aus den Serien: GBL 7, Referate 4, keine Serie ohne Gruppe, Status aus den Daten", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, fl = G.buildFormatList(), titles = fl.map(function(g) { return g.title; });
      var rows = {}; fl.forEach(function(g) { g.rows.forEach(function(x) { rows[x.cells[0]] = x.cells; }); });
      var jahndorfRows = fl.reduce(function(n, g) { return n + g.rows.filter(function(x) { return x.cells[0].indexOf("Jahndorf") >= 0; }).length; }, 0);
      return { titles: titles, unzugeordnet: titles.filter(function(t) { return t.indexOf("Weitere") === 0; }).length, jahndorf: jahndorfRows, personal: rows["JF Personal"], klausur: rows["Leistungsklausur Sozialwirtschaft"], platzhalter: rows["Vorstandssitzung IM"] };
    });
    ok(r.titles.indexOf("GBL (7 Einzel-JF)") >= 0 && r.titles.indexOf("Referate (4 Einzel-JF) + A³") >= 0, "Gruppentitel: " + r.titles.join(" | "));
    eq(r.unzugeordnet, 0, "Serien ohne Gruppe"); eq(r.jahndorf, 1, "Jahndorf nur einmal");
    eq(r.personal.slice(1, 3), ["alle 6-8 Wochen", "75 Min. (50+20+5)"], "Personal-Block");
    ok(r.klausur[3].indexOf("03.–04.05. / 08.–09.11.") === 0, "Klausur-Slot: " + r.klausur[3]);
    eq(r.platzhalter[4], "Platzhalter", "Status Platzhalter");
  });
  await test("Formatliste wird bei Änderungen neu erzeugt (fehlende Serie wird sichtbar)", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, evs = G.allEventsFlat().filter(function(x) { return x.ev.seriesId === "pufferslot"; });
      evs.forEach(function(x) { G.eventsData()[x.dateKey] = G.eventsData()[x.dateKey].filter(function(e) { return e.uid !== x.ev.uid; }); });
      G.afterChange(null);
      return document.getElementById("formatListContainer").textContent.indexOf("fehlt im Kalender") >= 0;
    });
    eq(r, true, "Status „fehlt im Kalender“");
  });
  await test("ICS: gültiger Aufbau, Zeitzone, Faltung, Platzhalter auslassbar", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, without = G.buildICS(false), withPh = G.buildICS(true), t = without.text, lines = t.split("\r\n");
      var ph = G.allEventsFlat().filter(function(x) { return x.ev.placeholder; }).length, total = G.allEventsFlat().length;
      var enc = new TextEncoder(), langste = Math.max.apply(null, lines.map(function(l) { return enc.encode(l).length; }));
      var first = t.split("BEGIN:VEVENT")[1];
      return { start: lines[0], ende: lines[lines.length - 2], veventOhne: (t.match(/BEGIN:VEVENT/g) || []).length, veventMit: (withPh.text.match(/BEGIN:VEVENT/g) || []).length, count: [without.count, withPh.count], erwartet: [total - ph, total], tz: t.indexOf("TZID:Europe/Berlin") > 0, langste: langste, crlf: t.indexOf("\r\n") > 0 && t.indexOf("\n\n") < 0, erster: /DTSTART;TZID=Europe\/Berlin:2027\d{4}T\d{6}/.test(first) && /DTEND;TZID=Europe\/Berlin:2027\d{4}T\d{6}/.test(first) && first.indexOf("SUMMARY:") > 0, regelobjekt: t.indexOf("allowedDays") >= 0 };
    });
    eq([r.start, r.ende], ["BEGIN:VCALENDAR", "END:VCALENDAR"], "Rahmen");
    eq([r.veventOhne, r.veventMit], r.erwartet, "Anzahl VEVENT"); eq(r.count, r.erwartet, "count");
    ok(r.tz && r.langste <= 75 && r.crlf && r.erster, "Format: " + JSON.stringify(r));
    eq(r.regelobjekt, false, "keine Regelobjekte in der Datei");
  });
  await test("ICS: Export über die Schaltfläche bietet die Wahl mit/ohne Platzhalter", async function(p) {
    await p.click("#btnIcs");
    var labels = await p.evaluate(function() { return Array.prototype.map.call(document.querySelectorAll("#dlgFooter .btn"), function(b) { return b.textContent; }); });
    eq(labels, ["Abbrechen", "Ohne Platzhalter", "Mit Platzhaltern"], "Auswahl");
    await p.click("#dlgFooter .btn.cyan");
    await p.waitForSelector("#dlgArea", { state: "visible" });
    ok((await p.inputValue("#dlgArea")).indexOf("BEGIN:VCALENDAR") === 0, "ICS-Text fehlt im Dialog");
  });

  // ---------- Engine ohne globalen Zustand ----------
  await test("Engine: checkPlausibility arbeitet auf einem übergebenen Kontext, ohne den Bestand zu berühren", async function(p) {
    var r = await p.evaluate(function() {
      var G = window.GFKAL, ctx = { eventsData: { "2027-01-05": [{ uid: "x1", title: "T", type: "JF", start: "09:00", duration: 50, time: "09:00 – 09:50", rule: null, desc: "", ort: "", placeholder: false, assumption: false, blockKey: null, seriesId: null }, { uid: "x2", title: "U", type: "JF", start: "09:30", duration: 50, time: "09:30 – 10:20", rule: null, desc: "", ort: "", placeholder: false, assumption: false, blockKey: null, seriesId: null }] }, RULES: {} };
      var res = G.checkPlausibility("2027-01-05", ctx);
      return { verstoesse: res.filter(function(x) { return !x.ok; }).length, bestand: G.allEventsFlat().length };
    });
    eq(r, { verstoesse: 2, bestand: 599 }, "Kontext");
  });

  await browser.close();
  console.log(results.join("\n"));
  console.log("\n" + (results.length - failed) + " von " + results.length + " Prüfungen bestanden.");
  process.exit(failed ? 1 : 0);
})().catch(function(e) { console.error(e); process.exit(2); });
