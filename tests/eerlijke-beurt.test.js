// Tests voor de eerlijke beurtverdeling, het verplaatsen en de speler.
// Draaien met:  npm test
//
// De regel: elk verzoek krijgt een rondenummer, namelijk het hoeveelste nummer
// van die aanvrager het is (gezongen plus wachtend). De wachtrij staat op
// volgorde van ronde, en binnen een ronde op volgorde van aanvragen.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  afgelopen,
  herstel,
  kanStarten,
  legeToestand,
  maakLos,
  maakNummer,
  nieuweAvond,
  rondes,
  spelerGeopend,
  spelerGesloten,
  spelerMeldt,
  start,
  stop,
  verplaats,
  verwijder,
  voegToe,
  zetInstelling,
} from "../extensie/gedeeld/wachtrij.js";

// Hulpjes om de tests leesbaar te houden: vraag("Lisa", "L1") is een verzoek
// van Lisa met de herkenbare naam L1.
let videoTeller = 0;
const vraag = (aanvrager, id) =>
  maakNummer({ videoId: String(++videoTeller).padStart(11, "v"), titel: id, aanvrager }, { id });
const vraagAan = (toestand, verzoeken) =>
  verzoeken.reduce((tussenstand, [aanvrager, id]) => voegToe(tussenstand, vraag(aanvrager, id)), toestand);
const ids = (toestand) => toestand.wachtrij.map((nummer) => nummer.id);
const metSpeler = (toestand) => spelerGeopend(toestand, { tabId: 1, vensterId: 2, vastgezet: true });

// --- De eerlijke beurt -------------------------------------------------------------

test("DE TEST UIT DE OPDRACHT: Lisa vraagt 3 nummers aan, daarna Tom 1 → Lisa, Tom, Lisa, Lisa", () => {
  const toestand = vraagAan(legeToestand(), [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Lisa", "L3"],
    ["Tom", "T1"],
  ]);
  assert.deepEqual(ids(toestand), ["L1", "T1", "L2", "L3"]);
  assert.deepEqual(
    toestand.wachtrij.map((nummer) => nummer.aanvrager),
    ["Lisa", "Tom", "Lisa", "Lisa"],
  );
});

test("elk verzoek krijgt het juiste rondenummer", () => {
  const toestand = vraagAan(legeToestand(), [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Tom", "T1"],
    ["Lisa", "L3"],
  ]);
  const ronde = rondes(toestand);
  assert.deepEqual(
    ["L1", "L2", "L3", "T1"].map((id) => ronde.get(id)),
    [1, 2, 3, 1],
  );
});

test("binnen een ronde geldt de volgorde van aanvragen", () => {
  const toestand = vraagAan(legeToestand(), [
    ["Tom", "T1"],
    ["Lisa", "L1"],
    ["Fatima", "F1"],
    ["Lisa", "L2"],
    ["Tom", "T2"],
  ]);
  assert.deepEqual(ids(toestand), ["T1", "L1", "F1", "L2", "T2"]);
});

test("namen worden vergeleken zonder op hoofdletters te letten", () => {
  const toestand = vraagAan(legeToestand(), [
    ["Lisa", "L1"],
    ["LISA", "L2"],
    ["lisa", "L3"],
    ["Tom", "T1"],
  ]);
  assert.deepEqual(ids(toestand), ["L1", "T1", "L2", "L3"]);
});

test("geen naam telt als één aanvrager: 'Iedereen'", () => {
  const toestand = vraagAan(legeToestand(), [
    ["", "X1"],
    ["", "X2"],
    ["Tom", "T1"],
    ["Iedereen", "X3"],
  ]);
  // X1, X2 en X3 zijn alle drie van "Iedereen": ronde 1, 2 en 3.
  assert.deepEqual(ids(toestand), ["X1", "T1", "X2", "X3"]);
});

test("wat al gezongen is telt mee: wie al 2 keer zong, komt na een nieuwkomer", () => {
  let toestand = metSpeler(
    vraagAan(legeToestand(), [
      ["Lisa", "L1"],
      ["Lisa", "L2"],
    ]),
  );
  toestand = afgelopen(start(toestand)); // L1 gezongen
  toestand = afgelopen(start(toestand)); // L2 gezongen
  toestand = vraagAan(toestand, [
    ["Lisa", "L3"], // ronde 3 voor Lisa
    ["Tom", "T1"], // ronde 1 voor Tom
  ]);
  assert.deepEqual(ids(toestand), ["T1", "L3"]);
});

test("het nummer dat nu bezig is telt ook mee als beurt", () => {
  let toestand = metSpeler(vraagAan(legeToestand(), [["Lisa", "L1"]]));
  toestand = start(toestand); // L1 is nu bezig
  toestand = vraagAan(toestand, [
    ["Lisa", "L2"], // ronde 2
    ["Tom", "T1"], // ronde 1
  ]);
  assert.deepEqual(ids(toestand), ["T1", "L2"]);
});

test("met de eerlijke beurt UIT blijft alles op volgorde van aanvragen", () => {
  const uit = zetInstelling(legeToestand(), "eerlijkeBeurt", false);
  const toestand = vraagAan(uit, [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Lisa", "L3"],
    ["Tom", "T1"],
  ]);
  assert.deepEqual(ids(toestand), ["L1", "L2", "L3", "T1"]);
});

test("de eerlijke beurt AAN zetten deelt de wachtrij meteen opnieuw in", () => {
  const uit = zetInstelling(legeToestand(), "eerlijkeBeurt", false);
  const toestand = vraagAan(uit, [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Lisa", "L3"],
    ["Tom", "T1"],
  ]);
  assert.deepEqual(ids(zetInstelling(toestand, "eerlijkeBeurt", true)), ["L1", "T1", "L2", "L3"]);
});

test("verwijderen houdt de volgorde eerlijk", () => {
  const toestand = vraagAan(legeToestand(), [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Tom", "T1"],
    ["Tom", "T2"],
  ]);
  assert.deepEqual(ids(toestand), ["L1", "T1", "L2", "T2"]);
  // Lisa's eerste verzoek vervalt: haar tweede wordt nu haar ronde 1.
  assert.deepEqual(ids(verwijder(toestand, "L1")), ["L2", "T1", "T2"]);
});

// --- Zelf verplaatsen -----------------------------------------------------------------

test("een zelf verplaatst nummer krijgt het label en blijft op die plek", () => {
  let toestand = vraagAan(legeToestand(), [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Lisa", "L3"],
    ["Tom", "T1"],
  ]); // L1, T1, L2, L3
  toestand = verplaats(toestand, "L3", 0); // Sean zet L3 helemaal vooraan
  assert.deepEqual(ids(toestand), ["L3", "L1", "T1", "L2"]);
  assert.equal(toestand.wachtrij[0].zelfVerplaatst, true);
  assert.equal(toestand.wachtrij[1].zelfVerplaatst, false);

  // Er komt een nieuw verzoek bij: L3 blijft vooraan staan.
  toestand = vraagAan(toestand, [["Fatima", "F1"]]);
  assert.deepEqual(ids(toestand), ["L3", "L1", "T1", "F1", "L2"]);
});

test("verplaatsen naar achteren en buiten de lijst werkt ook", () => {
  const toestand = vraagAan(zetInstelling(legeToestand(), "eerlijkeBeurt", false), [
    ["A", "a"],
    ["B", "b"],
    ["C", "c"],
  ]);
  assert.deepEqual(ids(verplaats(toestand, "a", 1)), ["b", "a", "c"]);
  assert.deepEqual(ids(verplaats(toestand, "a", 2)), ["b", "c", "a"]);
  assert.deepEqual(ids(verplaats(toestand, "a", 99)), ["b", "c", "a"]);
  assert.deepEqual(ids(verplaats(toestand, "c", -5)), ["c", "a", "b"]);
  assert.equal(verplaats(toestand, "bestaat-niet", 0), toestand);
  assert.equal(verplaats(toestand, "a", "vooraan"), toestand);
});

test("maakLos haalt het label weg en deelt het nummer weer eerlijk in", () => {
  let toestand = vraagAan(legeToestand(), [
    ["Lisa", "L1"],
    ["Lisa", "L2"],
    ["Tom", "T1"],
  ]); // L1, T1, L2
  toestand = verplaats(toestand, "L2", 0); // L2, L1, T1
  assert.deepEqual(ids(toestand), ["L2", "L1", "T1"]);
  toestand = maakLos(toestand, "L2");
  assert.deepEqual(ids(toestand), ["L1", "T1", "L2"]);
  assert.equal(
    toestand.wachtrij.some((nummer) => nummer.zelfVerplaatst),
    false,
  );
});

// --- De speler: starten, afgelopen, stoppen -------------------------------------------------

test("Start kan alleen met een open spelervenster en een nummer in de wachtrij", () => {
  const metNummer = vraagAan(legeToestand(), [["Lisa", "L1"]]);
  assert.equal(kanStarten(metNummer), false); // geen spelervenster
  assert.equal(start(metNummer), metNummer);
  assert.equal(kanStarten(metSpeler(legeToestand())), false); // lege wachtrij
  assert.equal(kanStarten(metSpeler(metNummer)), true);
});

test("Start maakt het eerste nummer 'Nu bezig' en telt 5 seconden af", () => {
  const toestand = start(
    metSpeler(
      vraagAan(legeToestand(), [
        ["Lisa", "L1"],
        ["Tom", "T1"],
      ]),
    ),
    1_000_000,
  );
  assert.equal(toestand.nuBezig.id, "L1");
  assert.deepEqual(ids(toestand), ["T1"]);
  assert.equal(toestand.speler.fase, "aftellen");
  assert.equal(toestand.speler.aftellenTot, 1_005_000);
  assert.equal(kanStarten(toestand), false); // niet twee keer starten
});

test("zonder aftellen mag de video meteen beginnen", () => {
  const zonder = zetInstelling(metSpeler(vraagAan(legeToestand(), [["Lisa", "L1"]])), "aftellen", false);
  assert.equal(start(zonder, 1_000_000).speler.aftellenTot, 1_000_000);
});

test("de speler meldt: begonnen, gepauzeerd, verder", () => {
  let toestand = start(metSpeler(vraagAan(legeToestand(), [["Lisa", "L1"]])));
  toestand = spelerMeldt(toestand, "begonnen");
  assert.equal(toestand.speler.fase, "speelt");
  toestand = spelerMeldt(toestand, "gepauzeerd");
  assert.equal(toestand.speler.fase, "gepauzeerd");
  toestand = spelerMeldt(toestand, "verder");
  assert.equal(toestand.speler.fase, "speelt");
});

test("na afloop telt het nummer als gezongen en staat het wachtscherm er weer", () => {
  let toestand = start(
    metSpeler(
      vraagAan(legeToestand(), [
        ["Lisa", "L1"],
        ["Tom", "T1"],
      ]),
    ),
  );
  toestand = spelerMeldt(spelerMeldt(toestand, "begonnen"), "afgelopen");
  assert.equal(toestand.nuBezig, null);
  assert.equal(toestand.speler.fase, "wacht");
  assert.deepEqual(
    toestand.gezongen.map((nummer) => nummer.id),
    ["L1"],
  );
  assert.deepEqual(ids(toestand), ["T1"]);
  assert.equal(kanStarten(toestand), true);
});

test("Stop zet het nummer terug vooraan; het telt niet als gezongen", () => {
  let toestand = start(
    metSpeler(
      vraagAan(legeToestand(), [
        ["Lisa", "L1"],
        ["Tom", "T1"],
      ]),
    ),
  );
  toestand = stop(spelerMeldt(toestand, "begonnen"));
  assert.equal(toestand.nuBezig, null);
  assert.deepEqual(ids(toestand), ["L1", "T1"]);
  assert.deepEqual(toestand.gezongen, []);
  assert.equal(toestand.speler.fase, "wacht");
});

test("gaat het spelervenster dicht tijdens een nummer, dan komt het nummer terug vooraan", () => {
  let toestand = spelerMeldt(start(metSpeler(vraagAan(legeToestand(), [["Lisa", "L1"]]))), "begonnen");
  toestand = spelerGesloten(toestand);
  assert.equal(toestand.speler.open, false);
  assert.equal(toestand.nuBezig, null);
  assert.deepEqual(ids(toestand), ["L1"]);
});

test("na een herstart van Firefox is er geen spelervenster en niets 'bezig'", () => {
  const bezig = spelerMeldt(start(metSpeler(vraagAan(legeToestand(), [["Lisa", "L1"]]))), "begonnen");
  const viaOpslag = JSON.parse(JSON.stringify(bezig));
  const hersteld = spelerGesloten(herstel(viaOpslag));
  assert.equal(hersteld.speler.open, false);
  assert.equal(hersteld.nuBezig, null);
  assert.deepEqual(ids(hersteld), ["L1"]);
});

test("de speler meldt een probleem, de muziek en waar de muziek was gebleven", () => {
  let toestand = metSpeler(legeToestand());
  toestand = spelerMeldt(toestand, "probleem", { code: "autoplay" });
  assert.equal(toestand.speler.probleem, "autoplay");
  assert.equal(spelerMeldt(toestand, "probleem", { code: "onzin" }).speler.probleem, "autoplay");
  toestand = spelerMeldt(toestand, "muziek", { speelt: true });
  assert.equal(toestand.speler.muziekSpeelt, true);
  toestand = spelerMeldt(toestand, "muziek-positie", { videoId: "ccccccccccc", tijd: 83.7 });
  assert.deepEqual(toestand.muziekHervat, { videoId: "ccccccccccc", tijd: 83 });
  // Zonder open spelervenster wordt er niets aangenomen.
  assert.equal(spelerMeldt(legeToestand(), "begonnen").speler.fase, "wacht");
});

test("een nieuwe avond kan niet midden in een nummer", () => {
  const bezig = start(metSpeler(vraagAan(legeToestand(), [["Lisa", "L1"]])));
  assert.equal(nieuweAvond(bezig), bezig);
});
