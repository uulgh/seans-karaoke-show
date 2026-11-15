// Automatische tests voor het ontleden van videotitels.
// Draaien met:  npm test
//
// Elke regel hieronder is: [videotitel op YouTube, verwachte artiest, verwachte titel].
// Kom je op een avond een titel tegen die verkeerd gaat? Zet hem erbij, dan
// blijft hij voortaan goed gaan.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ontleedTitel } from "../extensie/gedeeld/titel-ontleden.js";

const gevallen = [
  // --- De voorbeelden uit de opdracht ---
  ["ABBA - Mamma Mia (Karaoke)", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia (Karaoke Version)", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia (Lyrics)", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia (Instrumental)", "ABBA", "Mamma Mia"],

  // --- Andere haakjes en streepjes ---
  ["ABBA – Mamma Mia [Karaoke]", "ABBA", "Mamma Mia"],
  ["ABBA — Mamma Mia 【KARAOKE VERSION】", "ABBA", "Mamma Mia"],
  ["Queen - Don't Stop Me Now [Karaoke Version]", "Queen", "Don't Stop Me Now"],
  ["ABBA - Mamma Mia (Karaoke with Lyrics) (HD)", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia (Official Lyric Video)", "ABBA", "Mamma Mia"],

  // --- Ruiswoorden die los in de titel staan ---
  ["ABBA - Mamma Mia - Karaoke", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia Karaoke Version", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia Lyrics", "ABBA", "Mamma Mia"],
  ["Karaoke - ABBA - Mamma Mia", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia #karaoke #abba", "ABBA", "Mamma Mia"],
  ["Marco Borsato - Dromen zijn bedrog • Karaoke", "Marco Borsato", "Dromen zijn bedrog"],

  // --- Nederlandse varianten ---
  ["André Hazes - Zij gelooft in mij (Karaoke versie met tekst)", "André Hazes", "Zij gelooft in mij"],
  ["Frans Bauer - Heb je even voor mij (Songtekst)", "Frans Bauer", "Heb je even voor mij"],

  // --- "Karaoké" met een accent (Frans, Spaans) ---
  ["Céline Dion - Pour que tu m'aimes encore (Karaoké)", "Céline Dion", "Pour que tu m'aimes encore"],
  ["Céline Dion - Pour que tu m'aimes encore Karaoké", "Céline Dion", "Pour que tu m'aimes encore"],

  // --- Haakjes zonder ruiswoord blijven staan ---
  [
    "Guus Meeuwis - Het is een nacht (Levensecht) (Karaoke)",
    "Guus Meeuwis",
    "Het is een nacht (Levensecht)",
  ],

  // --- Namen met een streepje of schuine streep blijven heel ---
  ["Jay-Z - Empire State of Mind (Karaoke Version)", "Jay-Z", "Empire State of Mind"],
  ["AC/DC - Thunderstruck (Karaoke)", "AC/DC", "Thunderstruck"],

  // --- Hoofdletters en extra spaties maken niet uit ---
  ["   ABBA  -  Mamma Mia   (karaoke version)  ", "ABBA", "Mamma Mia"],

  // --- Aanhalingstekens om de titel ---
  ['ABBA - "Mamma Mia" (Karaoke)', "ABBA", "Mamma Mia"],

  // --- Titels met een | erin: alleen het eerste echte stuk telt ---
  ["KARAOKE | ABBA - Mamma Mia", "ABBA", "Mamma Mia"],
  ["ABBA - Mamma Mia | Karaoke Version | Voorbeeldkanaal", "ABBA", "Mamma Mia"],

  // --- "In the Style of": de artiest staat tussen haakjes ---
  ["Mamma Mia (In the Style of ABBA) (Karaoke Version)", "ABBA", "Mamma Mia"],
  ["Mamma Mia - Karaoke [Originally Performed by ABBA]", "ABBA", "Mamma Mia"],

  // --- Geen streepje: alles is de titel, de artiest blijft leeg ---
  ["Bohemian Rhapsody Karaoke", "", "Bohemian Rhapsody"],
  ["Bohemian Rhapsody", "", "Bohemian Rhapsody"],

  // --- Meer dan één streepje: het eerste stuk is de artiest ---
  ["ABBA - Mamma Mia - Live in Londen (Karaoke)", "ABBA", "Mamma Mia - Live in Londen"],

  // --- Randgevallen ---
  ["Karaoke", "", "Karaoke"],
  ["", "", ""],
];

for (const [videotitel, artiest, titel] of gevallen) {
  test(`"${videotitel}"  →  artiest "${artiest}", titel "${titel}"`, () => {
    assert.deepEqual(ontleedTitel(videotitel), { artiest, titel });
  });
}

test("geen tekst (null of niets) geeft twee lege velden", () => {
  assert.deepEqual(ontleedTitel(null), { artiest: "", titel: "" });
  assert.deepEqual(ontleedTitel(undefined), { artiest: "", titel: "" });
});

// Sommige kanalen schrijven "Titel - Artiest" in plaats van "Artiest - Titel".
// Dat kan de code niet raden. Deze test legt vast wat er dan gebeurt: de
// velden staan omgekeerd, en in de pop-up kun je ze omwisselen.
test('"Mamma Mia - ABBA (Karaoke)" komt omgekeerd in de velden (omwisselen doe je in de pop-up)', () => {
  assert.deepEqual(ontleedTitel("Mamma Mia - ABBA (Karaoke)"), { artiest: "Mamma Mia", titel: "ABBA" });
});
