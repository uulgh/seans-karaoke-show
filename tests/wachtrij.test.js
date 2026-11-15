// Tests voor de wachtrij en de instellingen.  Draaien met:  npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bekendeNamen,
  herstel,
  legeToestand,
  maakNummer,
  nieuweAvond,
  staatInWachtrij,
  verwijder,
  voegToe,
  zetInstelling,
} from "../extensie/gedeeld/wachtrij.js";

const MAMMA_MIA = { videoId: "aaaaaaaaaaa", artiest: "ABBA", titel: "Mamma Mia", aanvrager: "Lisa" };
const HAZES = { videoId: "bbbbbbbbbbb", artiest: "André Hazes", titel: "Zij gelooft in mij", aanvrager: "Tom" };

// Een lege toestand met de eerlijke beurt UIT, zodat de volgorde gewoon de
// volgorde van toevoegen is. De eerlijke beurt heeft eigen tests.
const leegZonderBeurt = () => zetInstelling(legeToestand(), "eerlijkeBeurt", false);
const ids = (toestand) => toestand.wachtrij.map((nummer) => nummer.id);

test("een nieuwe toestand is leeg, met de standaardinstellingen", () => {
  const toestand = legeToestand();
  assert.deepEqual(toestand.wachtrij, []);
  assert.equal(toestand.nuBezig, null);
  assert.deepEqual(toestand.instellingen, {
    aftellen: true,
    eerlijkeBeurt: true,
    achtergrondmuziek: false,
    muziekVolume: 20,
    muziekAdres: "",
    feestnaam: "Karaoke-avond",
  });
  assert.equal(toestand.speler.open, false);
  assert.equal(toestand.speler.fase, "wacht");
});

test("maakNummer maakt een compleet nummer", () => {
  const nummer = maakNummer(MAMMA_MIA, { id: "n1", nu: 1000 });
  assert.deepEqual(nummer, {
    id: "n1",
    volgnr: 0,
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

test("voegToe zet het nummer achteraan, geeft een volgnummer en laat de oude toestand met rust", () => {
  const leeg = leegZonderBeurt();
  const een = voegToe(leeg, maakNummer(MAMMA_MIA, { id: "n1" }));
  const twee = voegToe(een, maakNummer(HAZES, { id: "n2" }));
  assert.deepEqual(ids(twee), ["n1", "n2"]);
  assert.deepEqual(
    twee.wachtrij.map((nummer) => nummer.volgnr),
    [1, 2],
  );
  assert.equal(twee.teller, 2);
  assert.equal(leeg.wachtrij.length, 0);
  assert.equal(een.wachtrij.length, 1);
});

test("dezelfde video mag twee keer in de wachtrij; staatInWachtrij ziet het", () => {
  let toestand = leegZonderBeurt();
  assert.equal(staatInWachtrij(toestand, "aaaaaaaaaaa"), false);
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  assert.equal(staatInWachtrij(toestand, "aaaaaaaaaaa"), true);
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  assert.equal(toestand.wachtrij.length, 2);
});

test("verwijder haalt precies één nummer weg", () => {
  let toestand = leegZonderBeurt();
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA, { id: "n1" }));
  toestand = voegToe(toestand, maakNummer(HAZES, { id: "n2" }));
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA, { id: "n3" }));
  const na = verwijder(toestand, "n2");
  assert.deepEqual(ids(na), ["n1", "n3"]);
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

test("zetInstelling houdt het volume tussen 0 en 100", () => {
  const toestand = legeToestand();
  assert.equal(zetInstelling(toestand, "muziekVolume", 55).instellingen.muziekVolume, 55);
  assert.equal(zetInstelling(toestand, "muziekVolume", 250).instellingen.muziekVolume, 100);
  assert.equal(zetInstelling(toestand, "muziekVolume", -4).instellingen.muziekVolume, 0);
  assert.equal(zetInstelling(toestand, "muziekVolume", "37").instellingen.muziekVolume, 37);
  assert.equal(zetInstelling(toestand, "muziekVolume", "hard"), toestand);
  assert.equal(zetInstelling(toestand, "muziekVolume", true), toestand);
});

test("een lege feestnaam wordt weer 'Karaoke-avond'", () => {
  const toestand = zetInstelling(legeToestand(), "feestnaam", "Verjaardag van Lisa");
  assert.equal(toestand.instellingen.feestnaam, "Verjaardag van Lisa");
  assert.equal(zetInstelling(toestand, "feestnaam", "   ").instellingen.feestnaam, "Karaoke-avond");
});

test("een andere muzieklink begint weer bij het begin", () => {
  const toestand = { ...legeToestand(), muziekHervat: { videoId: "ccccccccccc", tijd: 80 } };
  const na = zetInstelling(toestand, "muziekAdres", "https://youtu.be/ddddddddddd");
  assert.equal(na.instellingen.muziekAdres, "https://youtu.be/ddddddddddd");
  assert.equal(na.muziekHervat, null);
});

test("herstel maakt van een lege of kapotte opslag een geldige toestand", () => {
  for (const kapot of [undefined, null, "tekst", 42, [], { wachtrij: "nee" }, { instellingen: 7 }, { speler: "x" }]) {
    assert.deepEqual(herstel(kapot), legeToestand());
  }
});

test("herstel bewaart goede nummers en gooit kapotte weg", () => {
  const goed = { ...maakNummer(MAMMA_MIA, { id: "n1", nu: 5 }), volgnr: 1 };
  const hersteld = herstel({
    teller: 1,
    wachtrij: [goed, null, { id: "n2", videoId: "kapot" }, { videoId: "bbbbbbbbbbb" }, "tekst"],
    instellingen: { aftellen: false, eerlijkeBeurt: "ja", onbekend: true, muziekVolume: 999 },
  });
  assert.deepEqual(hersteld.wachtrij, [goed]);
  assert.equal(hersteld.instellingen.aftellen, false);
  assert.equal(hersteld.instellingen.eerlijkeBeurt, true);
  assert.equal(hersteld.instellingen.muziekVolume, 100);
  assert.equal("onbekend" in hersteld.instellingen, false);
});

test("herstel geeft nummers uit een oudere versie een volgnummer, op volgorde", () => {
  const oud = (id) => {
    const nummer = maakNummer(MAMMA_MIA, { id });
    delete nummer.volgnr;
    return nummer;
  };
  const hersteld = herstel({ versie: 1, wachtrij: [oud("n1"), oud("n2"), oud("n3")] });
  assert.deepEqual(
    hersteld.wachtrij.map((nummer) => nummer.volgnr),
    [1, 2, 3],
  );
  assert.equal(hersteld.teller, 3);
});

test("wat bewaard en weer geladen wordt, komt er hetzelfde uit", () => {
  let toestand = legeToestand();
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  toestand = voegToe(toestand, maakNummer(HAZES));
  toestand = zetInstelling(toestand, "achtergrondmuziek", true);
  toestand = zetInstelling(toestand, "feestnaam", "Feest!");
  const viaOpslag = JSON.parse(JSON.stringify(toestand));
  assert.deepEqual(herstel(viaOpslag), toestand);
});

test("bekendeNamen geeft elke aanvrager één keer, op alfabet, zonder lege namen", () => {
  let toestand = legeToestand();
  for (const aanvrager of ["Tom", "Lisa", "", "lisa", "Fatima & Sanne", "TOM"]) {
    toestand = voegToe(toestand, maakNummer({ ...MAMMA_MIA, aanvrager }));
  }
  assert.deepEqual(bekendeNamen(toestand), ["Fatima & Sanne", "Lisa", "Tom"]);
  assert.deepEqual(bekendeNamen(legeToestand()), []);
});

test("nieuweAvond wist de wachtrij en de beurtentelling, maar niet de instellingen", () => {
  let toestand = zetInstelling(legeToestand(), "feestnaam", "Feest!");
  toestand = voegToe(toestand, maakNummer(MAMMA_MIA));
  toestand = { ...toestand, gezongen: [{ ...maakNummer(HAZES), volgnr: 9 }] };
  const na = nieuweAvond(toestand);
  assert.deepEqual(na.wachtrij, []);
  assert.deepEqual(na.gezongen, []);
  assert.equal(na.teller, 0);
  assert.equal(na.instellingen.feestnaam, "Feest!");
});
