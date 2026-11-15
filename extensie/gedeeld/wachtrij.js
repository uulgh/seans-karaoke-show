// De "toestand" van de karaokeshow en de regels om hem te veranderen.
//
// De toestand is één object met alles wat bewaard moet blijven:
//
//   {
//     versie: 1,
//     nuBezig: null,            // het nummer dat nu speelt (vanaf fase 3)
//     wachtrij: [ nummer, ... ], // het eerste nummer is "Volgende"
//     gezongen: [],             // wat al geweest is (nodig voor eerlijke beurt, fase 4)
//     instellingen: { aftellen, eerlijkeBeurt, achtergrondmuziek },
//   }
//
// Een nummer ziet er zo uit:
//
//   { id, videoId, titel, artiest, aanvrager, toegevoegdOp, zelfVerplaatst }
//
// Dit bestand gebruikt niets van Firefox. De functies krijgen een toestand en
// geven een NIEUWE toestand terug; de oude blijft ongewijzigd. Daardoor zijn
// ze los te testen (tests/wachtrij.test.js).

import { isVideoId } from "../youtube/youtube-adressen.js";

export const VERSIE = 1;

export const STANDAARD_INSTELLINGEN = Object.freeze({
  aftellen: true,
  eerlijkeBeurt: true,
  achtergrondmuziek: false,
});

const MAX_TEKST = 200; // langste titel, artiest of naam
const MAX_NUMMERS = 500; // meer past er niet in de wachtrij

// Maakt van wat dan ook een nette, korte tekst zonder dubbele spaties.
function alsTekst(waarde) {
  return String(waarde ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEKST);
}

export function legeToestand() {
  return {
    versie: VERSIE,
    nuBezig: null,
    wachtrij: [],
    gezongen: [],
    instellingen: { ...STANDAARD_INSTELLINGEN },
  };
}

function isNummer(iets) {
  return Boolean(iets) && typeof iets === "object" && typeof iets.id === "string" && isVideoId(iets.videoId);
}

function nettNummer(nummer) {
  return {
    id: nummer.id,
    videoId: nummer.videoId,
    titel: alsTekst(nummer.titel) || "Onbekende titel",
    artiest: alsTekst(nummer.artiest),
    aanvrager: alsTekst(nummer.aanvrager),
    toegevoegdOp: Number.isFinite(nummer.toegevoegdOp) ? nummer.toegevoegdOp : 0,
    zelfVerplaatst: nummer.zelfVerplaatst === true,
  };
}

// Maakt van wat er in de opslag staat altijd een geldige toestand. Is de
// opslag leeg of beschadigd, dan krijg je (voor dat stuk) de standaardwaarden.
export function herstel(opgeslagen) {
  const leeg = legeToestand();
  if (!opgeslagen || typeof opgeslagen !== "object") return leeg;

  const lijst = (waarde) => (Array.isArray(waarde) ? waarde.filter(isNummer).map(nettNummer) : []);

  const instellingen = { ...STANDAARD_INSTELLINGEN };
  for (const naam of Object.keys(STANDAARD_INSTELLINGEN)) {
    if (typeof opgeslagen.instellingen?.[naam] === "boolean") {
      instellingen[naam] = opgeslagen.instellingen[naam];
    }
  }

  return {
    versie: VERSIE,
    nuBezig: isNummer(opgeslagen.nuBezig) ? nettNummer(opgeslagen.nuBezig) : null,
    wachtrij: lijst(opgeslagen.wachtrij).slice(0, MAX_NUMMERS),
    gezongen: lijst(opgeslagen.gezongen),
    instellingen,
  };
}

// Maakt een nieuw nummer voor in de wachtrij.
// Geeft een fout als de video-ID niet klopt.
export function maakNummer(gegevens, { id = crypto.randomUUID(), nu = Date.now() } = {}) {
  if (!isVideoId(gegevens?.videoId)) {
    throw new Error("Dit is geen geldige YouTube-video.");
  }
  return nettNummer({
    id,
    videoId: gegevens.videoId,
    titel: gegevens.titel,
    artiest: gegevens.artiest,
    aanvrager: gegevens.aanvrager,
    toegevoegdOp: nu,
    zelfVerplaatst: false,
  });
}

// Staat deze video al in de wachtrij?
export function staatInWachtrij(toestand, videoId) {
  return toestand.wachtrij.some((nummer) => nummer.videoId === videoId);
}

// Zet een nummer achteraan in de wachtrij.
// (In fase 4 komt hier de eerlijke beurtverdeling bij.)
export function voegToe(toestand, nummer) {
  if (toestand.wachtrij.length >= MAX_NUMMERS) {
    throw new Error("De wachtrij is vol.");
  }
  return { ...toestand, wachtrij: [...toestand.wachtrij, nummer] };
}

// Haalt een nummer uit de wachtrij.
export function verwijder(toestand, id) {
  return { ...toestand, wachtrij: toestand.wachtrij.filter((nummer) => nummer.id !== id) };
}

// Zet een schakelaar aan of uit. Onbekende namen worden genegeerd.
export function zetInstelling(toestand, naam, waarde) {
  if (!Object.hasOwn(STANDAARD_INSTELLINGEN, naam) || typeof waarde !== "boolean") {
    return toestand;
  }
  return { ...toestand, instellingen: { ...toestand.instellingen, [naam]: waarde } };
}
