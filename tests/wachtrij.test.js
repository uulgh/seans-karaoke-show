// Tests voor de wachtrij en de instellingen.  Draaien met:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  herstel,
  legeToestand,
  maakNummer,
  staatInWachtrij,
  verwijder,
  voegToe,
  zetInstelling,
} from "../extensie/gedeeld/wachtrij.js";

const MAMMA_MIA = { videoId: "aaaaaaaaaaa", artiest: "ABBA", titel: "Mamma Mia", aanvrager: "Lisa" };
const HAZES = { videoId: "bbbbbbbbbbb", artiest: "André Hazes", titel: "Zij gelooft in mij", aanvrager: "Tom" };

test("een nieuwe toestand is leeg, met de standaardinstellingen", () => {
  const toestand = legeToestand();
  assert.deepEqual(toestand.wachtrij, []);
  assert.equal(toestand.nuBezig, null);
  assert.deepEqual(toestand.instellingen, { aftellen: true, eerlijkeBeurt: true, achtergrondmuziek: false });
});

test("maakNummer maakt een compleet nummer", () => {
  const nummer = maakNummer(MAMMA_MIA, { id: "n1", nu: 1000 });
  assert.deepEqual(nummer, {
    id: "n1",
    videoId: "aaaaaaaaaaa",
    titel: "Mamma Mia",
    artiest: "ABBA",
    aanvrager: "Lisa",
    toegevoegdOp: 1000,
    zelfVerplaatst: false,
  });
});

test("maakNummer geeft elk nummer een eigen id", () => {
  assert.notEqual(maakNummer(MAMMA_MIA).id, maakNummer(MAMMA_MIA).id);
});

test("maakNummer ruimt spaties op en kort hele lange tekst in", () => {
  const nummer = maakNummer({ videoId: "aaaaaaaaaaa", titel: "  Mamma    Mia ", aanvrager: "x".repeat(1000) });
  assert.equal(nummer.titel, "Mamma Mia");
  assert.equal(nummer.artiest, "");
  assert.equal(nummer.aanvrager.length, 200);
});

test("een nummer zonder titel heet 'Onbekende titel'", () => {
  assert.equal(maakNummer({ videoId: "aaaaaaaaaaa", titel: "   " }).titel, "Onbekende titel");
});

test("een duet als 'Fatima & Sanne' mag als aanvrager", () => {
  assert.equal(maakNummer({ ...MAMMA_MIA, aanvrager: "Fatima & Sanne" }).aanvrager, "Fatima & Sanne");
});

test("maakNummer weigert een ongeldige video", () => {
  assert.throws(() => maakNummer({ videoId: "kapot", titel: "x" }));
  assert.throws(() => maakNummer(undefined));
});

test("voegToe zet het nummer achteraan en laat de oude toestand met rust", () => {
  const leeg = legeToestand();
  const een = voegToe(leeg, maakNummer(MAMMA_MIA, { id: "n1" }));
  const twee = voegToe(een, maakNummer(HAZES, { id: "n2" }));
  assert.deepEqual(
    twee.wachtrij.map((nummer) => nummer.id),
    ["n1", "n2"],
  );
  assert.equal(leeg.wachtrij.length, 0);
  assert.equal(een.wachtrij.length, 1);
});

test("dezelfde video mag twee keer in de wachtrij; staatInWachtrij ziet het", () => {
  let toestand = legeToestand();
  assert.equal(staatInWachtrij(toestand, "aaaaaaaaaaa"), false);
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  assert.equal(staatInWachtrij(toestand, "aaaaaaaaaaa"), true);
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  assert.equal(toestand.wachtrij.length, 2);
});

test("verwijder haalt precies één nummer weg", () => {
  let toestand = legeToestand();
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA, { id: "n1" }));
  toestand = voegToe(toestand, maakNummer(HAZES, { id: "n2" }));
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA, { id: "n3" }));
  const na = verwijder(toestand, "n2");
  assert.deepEqual(
    na.wachtrij.map((nummer) => nummer.id),
    ["n1", "n3"],
  );
  assert.equal(verwijder(na, "bestaat-niet").wachtrij.length, 2);
});

test("zetInstelling zet een schakelaar om en negeert onzin", () => {
  const toestand = legeToestand();
  assert.equal(zetInstelling(toestand, "aftellen", false).instellingen.aftellen, false);
  assert.equal(toestand.instellingen.aftellen, true); // de oude toestand is niet veranderd
  assert.equal(zetInstelling(toestand, "bestaatNiet", true), toestand);
  assert.equal(zetInstelling(toestand, "aftellen", "ja"), toestand);
  assert.equal(zetInstelling(toestand, "__proto__", true), toestand);
});

test("herstel maakt van een lege of kapotte opslag een geldige toestand", () => {
  for (const kapot of [undefined, null, "tekst", 42, [], { wachtrij: "nee" }, { instellingen: 7 }]) {
    assert.deepEqual(herstel(kapot), legeToestand());
  }
});

test("herstel bewaart goede nummers en gooit kapotte weg", () => {
  const goed = maakNummer(MAMMA_MIA, { id: "n1", nu: 5 });
  const hersteld = herstel({
    wachtrij: [goed, null, { id: "n2", videoId: "kapot" }, { videoId: "bbbbbbbbbbb" }, "tekst"],
    instellingen: { aftellen: false, eerlijkeBeurt: "ja", onbekend: true },
  });
  assert.deepEqual(hersteld.wachtrij, [goed]);
  assert.deepEqual(hersteld.instellingen, { aftellen: false, eerlijkeBeurt: true, achtergrondmuziek: false });
});

test("wat bewaard en weer geladen wordt, komt er hetzelfde uit", () => {
  let toestand = legeToestand();
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  toestand = voegToe(toestand, maakNummer(HAZES));
  toestand = zetInstelling(toestand, "achtergrondmuziek", true);
  const viaOpslag = JSON.parse(JSON.stringify(toestand));
  assert.deepEqual(herstel(viaOpslag), toestand);
});
