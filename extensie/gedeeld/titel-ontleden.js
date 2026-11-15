// Haalt de artiest en de titel uit de titel van een YouTube-video.
//
//   "ABBA - Mamma Mia (Karaoke)"  →  { artiest: "ABBA", titel: "Mamma Mia" }
//
// Dit bestand weet niets van YouTube-pagina's of van Firefox; het krijgt alleen
// een stuk tekst en geeft twee stukken tekst terug. Daardoor is het los te
// testen met "npm test" (zie tests/titel-ontleden.test.js).
//
// De regels, in deze volgorde:
//   1. Hashtags weg (#karaoke).
//   2. "(In the Style of ABBA)" onthouden als artiest.
//   3. Stukken tussen haakjes weg als er een ruiswoord in staat, zoals
//      (Karaoke Version) of [Lyrics]. Andere haakjes, zoals (Levensecht), blijven.
//   4. Staat er een | in, dan telt alleen het eerste stuk dat geen ruis is.
//   5. Losse ruiswoorden weg (Karaoke, Lyrics, Instrumental ...).
//   6. Splitsen op het streepje: links de artiest, rechts de titel.
//
// De uitkomst is een voorstel: in de pop-up kan Sean beide velden aanpassen.

// Een stuk tussen haakjes verdwijnt als een van deze woorden erin staat.
const RUIS_IN_HAAKJES =
  /karaok[eé]|lyrics?|instrumenta(?:l|al)|songtekst|met tekst|backing track|sing[\s-]?along|meezing|official|\bh[dq]\b|\b4k\b/i;

// Deze woorden verdwijnen ook als ze los in de titel staan.
// (De langste staan vooraan, zodat "Karaoke Version" in één keer weggaat.)
const GEEN_LETTER_ERVOOR = "(?<![\\p{L}\\p{N}])";
const GEEN_LETTER_ERNA = "(?![\\p{L}\\p{N}])";
const RUIS_LOS = new RegExp(
  GEEN_LETTER_ERVOOR +
    "(?:karaok[eé]\\s+versi(?:on|e)|karaok[eé]|with\\s+lyrics|met\\s+tekst|lyrics?(?:\\s+video)?|instrumenta(?:l|al)|songtekst)" +
    GEEN_LETTER_ERNA,
  "giu",
);

// "(In the Style of ABBA)": zo noemen sommige karaokekanalen de artiest.
const IN_DE_STIJL_VAN =
  /[([]\s*(?:in the style of|originally performed by|made famous by|in de stijl van)\s+([^)\]]+)[)\]]/i;

const HAAKJES = /[([{【][^()[\]{}【】]*[)\]}】]/g;
const LEGE_HAAKJES = /[([{【]\s*[)\]}】]/g;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const STREEPJE = /\s+[-–—]\s+|[–—]/; // " - " met spaties, of een lang streepje
const RAND = /^[\s\-–—|:•·*~,]+|[\s\-–—|:•·*~,]+$/g; // leestekens aan begin en eind
const AANHALINGSTEKENS = /^["“”„«](.+)["“”»]$/;

function netjes(tekst) {
  return tekst.replace(LEGE_HAAKJES, " ").replace(/\s+/g, " ").replace(RAND, "");
}

function zonderRuis(tekst) {
  return netjes(tekst.replace(RUIS_LOS, " "));
}

function zonderAanhalingstekens(tekst) {
  const gevonden = tekst.match(AANHALINGSTEKENS);
  return gevonden ? gevonden[1].trim() : tekst;
}

export function ontleedTitel(videotitel) {
  const origineel = String(videotitel ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
  if (!origineel) return { artiest: "", titel: "" };

  // 1. Hashtags weg.
  let tekst = origineel.replace(HASHTAG, " ");

  // 2. "(In the Style of ABBA)" onthouden en weghalen.
  let stijlArtiest = "";
  const stijl = tekst.match(IN_DE_STIJL_VAN);
  if (stijl) {
    stijlArtiest = netjes(stijl[1]);
    tekst = tekst.replace(stijl[0], " ");
  }

  // 3. Haakjes met een ruiswoord erin weg.
  tekst = tekst.replace(HAAKJES, (stuk) => (RUIS_IN_HAAKJES.test(stuk) ? " " : stuk));

  // 4 en 5. Bij "A | B | C" telt het eerste stuk waar na het opruimen iets van overblijft.
  const stukken = tekst.split(/[|｜]/).map(zonderRuis);
  tekst = stukken.find((stuk) => stuk !== "") ?? "";

  // 6. Splitsen op het streepje.
  let delen = tekst
    .split(STREEPJE)
    .map((deel) => zonderAanhalingstekens(netjes(deel ?? "")))
    .filter((deel) => deel !== "");

  if (stijlArtiest) {
    // De artiest is al bekend; staat hij ook nog in de titel, dan mag hij daar weg.
    delen = delen.filter((deel) => deel.toLowerCase() !== stijlArtiest.toLowerCase());
    return { artiest: stijlArtiest, titel: delen.join(" - ") || origineel };
  }

  if (delen.length >= 2) {
    return { artiest: delen[0], titel: delen.slice(1).join(" - ") };
  }

  // Geen streepje gevonden: alles is de titel. Bleef er niets over (de video
  // heet bijvoorbeeld alleen "Karaoke"), dan de oorspronkelijke titel.
  return { artiest: "", titel: delen[0] ?? origineel };
}
