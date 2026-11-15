// De "toestand" van de karaokeshow en de regels om hem te veranderen.
//
// De toestand is één object met alles wat bewaard moet blijven:
//
//   {
//     versie: 2,
//     teller: 12,                // volgnummer van het laatst aangevraagde nummer
//     nuBezig: null,             // het nummer dat nu speelt (of waarvoor wordt afgeteld)
//     wachtrij: [ nummer, ... ], // het eerste nummer is "Volgende"
//     gezongen: [ nummer, ... ], // wat al geweest is (nodig voor de eerlijke beurt)
//     instellingen: { aftellen, eerlijkeBeurt, achtergrondmuziek, muziekVolume,
//                     muziekAdres, feestnaam },
//     speler: { open, tabId, vensterId, vastgezet, fase, aftellenTot, probleem,
//               muziekSpeelt },
//     muziekHervat: { videoId, tijd } of null,  // waar de achtergrondmuziek was gebleven
//   }
//
// Een nummer ziet er zo uit:
//
//   { id, volgnr, videoId, titel, artiest, aanvrager, toegevoegdOp, zelfVerplaatst }
//
// De fase van de speler is een van:
//   "wacht"       het wachtscherm staat op het tweede scherm
//   "aftellen"    er is op Start gedrukt; de video wordt geladen en er wordt (eventueel) afgeteld
//   "speelt"      de video speelt
//   "gepauzeerd"  de video staat op pauze
//
// Dit bestand gebruikt niets van Firefox. De functies krijgen een toestand en
// geven een NIEUWE toestand terug; de oude blijft ongewijzigd. Daardoor zijn
// ze los te testen (tests/wachtrij.test.js en tests/eerlijke-beurt.test.js).

import { isVideoId } from "../youtube/youtube-adressen.js";

export const VERSIE = 2;
export const AFTELSECONDEN = 5;

export const STANDAARD_INSTELLINGEN = Object.freeze({
  aftellen: true,
  eerlijkeBeurt: true,
  achtergrondmuziek: false,
  muziekVolume: 20, // 0 tot 100
  muziekAdres: "", // YouTube-link: video of afspeellijst
  feestnaam: "Karaoke-avond",
});

const LEGE_SPELER = Object.freeze({
  open: false, // is het spelervenster open?
  tabId: null,
  vensterId: null,
  vastgezet: false, // staat het venster op zijn plek, op volledig scherm?
  fase: "wacht",
  aftellenTot: 0, // tijdstip (in milliseconden) waarop de video mag starten
  probleem: "", // "", "autoplay", "cookies", "start" of "reclame"
  muziekSpeelt: false,
});

const FASES = ["wacht", "aftellen", "speelt", "gepauzeerd"];
const PROBLEMEN = ["", "autoplay", "cookies", "start", "reclame"];

const MAX_TEKST = 200; // langste titel, artiest of naam
const MAX_NUMMERS = 500; // meer past er niet in de wachtrij
const MAX_GEZONGEN = 2000;

// --- Hulpjes -------------------------------------------------------------------

// Maakt van wat dan ook een nette, korte tekst zonder dubbele spaties.
function alsTekst(waarde, lengte = MAX_TEKST) {
  return String(waarde ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, lengte);
}

function isNummer(iets) {
  return Boolean(iets) && typeof iets === "object" && typeof iets.id === "string" && isVideoId(iets.videoId);
}

function nettNummer(nummer, reserveVolgnr = 0) {
  return {
    id: nummer.id,
    volgnr: Number.isFinite(nummer.volgnr) ? nummer.volgnr : reserveVolgnr,
    videoId: nummer.videoId,
    titel: alsTekst(nummer.titel) || "Onbekende titel",
    artiest: alsTekst(nummer.artiest),
    aanvrager: alsTekst(nummer.aanvrager),
    toegevoegdOp: Number.isFinite(nummer.toegevoegdOp) ? nummer.toegevoegdOp : 0,
    zelfVerplaatst: nummer.zelfVerplaatst === true,
  };
}

// Controleert één instelling. Geeft de nette waarde, of undefined als hij niet klopt.
function netteInstelling(naam, waarde) {
  switch (naam) {
    case "aftellen":
    case "eerlijkeBeurt":
    case "achtergrondmuziek":
      return typeof waarde === "boolean" ? waarde : undefined;
    case "muziekVolume": {
      const getal = Number(waarde);
      return Number.isFinite(getal) && waarde !== "" && waarde !== null && typeof waarde !== "boolean"
        ? Math.min(100, Math.max(0, Math.round(getal)))
        : undefined;
    }
    case "muziekAdres":
      return typeof waarde === "string" ? alsTekst(waarde, 500) : undefined;
    case "feestnaam":
      return typeof waarde === "string" ? alsTekst(waarde, 60) || STANDAARD_INSTELLINGEN.feestnaam : undefined;
    default:
      return undefined;
  }
}

// --- Begin en herstel -------------------------------------------------------------

export function legeToestand() {
  return {
    versie: VERSIE,
    teller: 0,
    nuBezig: null,
    wachtrij: [],
    gezongen: [],
    instellingen: { ...STANDAARD_INSTELLINGEN },
    speler: { ...LEGE_SPELER },
    muziekHervat: null,
  };
}

// Maakt van wat er in de opslag staat altijd een geldige toestand. Is de
// opslag leeg of beschadigd, dan krijg je (voor dat stuk) de standaardwaarden.
export function herstel(opgeslagen) {
  const leeg = legeToestand();
  if (!opgeslagen || typeof opgeslagen !== "object") return leeg;

  let reserve = 0; // volgnummers voor nummers uit een oudere versie, op volgorde
  const lijst = (waarde) =>
    Array.isArray(waarde) ? waarde.filter(isNummer).map((nummer) => nettNummer(nummer, ++reserve)) : [];

  const gezongen = lijst(opgeslagen.gezongen).slice(-MAX_GEZONGEN);
  const nuBezig = isNummer(opgeslagen.nuBezig) ? nettNummer(opgeslagen.nuBezig, ++reserve) : null;
  const wachtrij = lijst(opgeslagen.wachtrij).slice(0, MAX_NUMMERS);

  const instellingen = { ...STANDAARD_INSTELLINGEN };
  for (const naam of Object.keys(STANDAARD_INSTELLINGEN)) {
    const waarde = netteInstelling(naam, opgeslagen.instellingen?.[naam]);
    if (waarde !== undefined) instellingen[naam] = waarde;
  }

  const speler = { ...LEGE_SPELER };
  const bron = opgeslagen.speler;
  if (bron && typeof bron === "object") {
    speler.open = bron.open === true && Number.isInteger(bron.tabId) && Number.isInteger(bron.vensterId);
    if (speler.open) {
      speler.tabId = bron.tabId;
      speler.vensterId = bron.vensterId;
      speler.vastgezet = bron.vastgezet === true;
      speler.muziekSpeelt = bron.muziekSpeelt === true;
      if (PROBLEMEN.includes(bron.probleem)) speler.probleem = bron.probleem;
    }
    if (speler.open && nuBezig && FASES.includes(bron.fase) && bron.fase !== "wacht") {
      speler.fase = bron.fase;
      speler.aftellenTot = Number.isFinite(bron.aftellenTot) ? bron.aftellenTot : 0;
    }
  }

  const hervat = opgeslagen.muziekHervat;
  const muziekHervat =
    hervat && isVideoId(hervat.videoId) && Number.isFinite(hervat.tijd)
      ? { videoId: hervat.videoId, tijd: Math.max(0, Math.floor(hervat.tijd)) }
      : null;

  const hoogste = Math.max(0, ...[...gezongen, ...wachtrij, ...(nuBezig ? [nuBezig] : [])].map((n) => n.volgnr));

  const toestand = {
    versie: VERSIE,
    teller: Math.max(hoogste, Number.isFinite(opgeslagen.teller) ? opgeslagen.teller : 0),
    nuBezig,
    wachtrij,
    gezongen,
    instellingen,
    speler,
    muziekHervat,
  };

  // Er kan alleen iets "bezig" zijn als het spelervenster open is.
  return nuBezig && speler.fase === "wacht" ? zetTerugVooraan(toestand) : toestand;
}

// --- Eerlijke beurtverdeling --------------------------------------------------------

// Namen worden vergeleken zonder op hoofdletters te letten. Geen naam telt
// als aanvrager "Iedereen".
export function aanvragerSleutel(naam) {
  return (alsTekst(naam) || "Iedereen").toLocaleLowerCase("nl");
}

// Geeft bij elk wachtend nummer het rondenummer: het hoeveelste nummer van
// die aanvrager het is, gezongen plus wachtend.
// Uitkomst: een Map van nummer-id naar rondenummer.
export function rondes(toestand) {
  const aantal = new Map(); // aanvrager → hoeveel nummers tot nu toe
  const telOp = (nummer) => {
    const sleutel = aanvragerSleutel(nummer.aanvrager);
    const nieuw = (aantal.get(sleutel) ?? 0) + 1;
    aantal.set(sleutel, nieuw);
    return nieuw;
  };

  for (const nummer of toestand.gezongen) telOp(nummer);
  if (toestand.nuBezig) telOp(toestand.nuBezig);

  const uitkomst = new Map();
  const opAanvraag = [...toestand.wachtrij].sort((a, b) => a.volgnr - b.volgnr);
  for (const nummer of opAanvraag) uitkomst.set(nummer.id, telOp(nummer));
  return uitkomst;
}

// Zet de wachtrij op volgorde van ronde, en binnen een ronde op volgorde van
// aanvragen. Nummers die Sean zelf heeft verplaatst blijven op hun plek staan;
// de andere nummers worden eromheen ingedeeld.
// Staat de eerlijke beurt uit, dan verandert er niets.
export function herorden(toestand) {
  if (!toestand.instellingen.eerlijkeBeurt) return toestand;

  const ronde = rondes(toestand);
  const vrij = toestand.wachtrij
    .filter((nummer) => !nummer.zelfVerplaatst)
    .sort((a, b) => ronde.get(a.id) - ronde.get(b.id) || a.volgnr - b.volgnr);

  let volgende = 0;
  const wachtrij = toestand.wachtrij.map((nummer) => (nummer.zelfVerplaatst ? nummer : vrij[volgende++]));
  return { ...toestand, wachtrij };
}

// --- Nummers toevoegen, verwijderen en verplaatsen ---------------------------------------

// Maakt een nieuw nummer voor in de wachtrij.
// Geeft een fout als de video-ID niet klopt.
export function maakNummer(gegevens, { id = crypto.randomUUID(), nu = Date.now() } = {}) {
  if (!isVideoId(gegevens?.videoId)) {
    throw new Error("Dit is geen geldige YouTube-video.");
  }
  return nettNummer({
    id,
    volgnr: 0, // wordt ingevuld bij het toevoegen
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

// Zet een nummer in de wachtrij: achteraan, of (met eerlijke beurt) op de
// plek die bij zijn ronde hoort.
export function voegToe(toestand, nummer) {
  if (toestand.wachtrij.length >= MAX_NUMMERS) {
    throw new Error("De wachtrij is vol.");
  }
  const teller = toestand.teller + 1;
  return herorden({ ...toestand, teller, wachtrij: [...toestand.wachtrij, { ...nummer, volgnr: teller }] });
}

// Haalt een nummer uit de wachtrij.
export function verwijder(toestand, id) {
  return herorden({ ...toestand, wachtrij: toestand.wachtrij.filter((nummer) => nummer.id !== id) });
}

// Sean verplaatst een nummer zelf naar een andere plek (0 = helemaal vooraan).
// Het nummer krijgt het label "zelf verplaatst" en blijft daar staan.
export function verplaats(toestand, id, naarPlek) {
  const nummer = toestand.wachtrij.find((kandidaat) => kandidaat.id === id);
  if (!nummer || !Number.isInteger(naarPlek)) return toestand;

  const rest = toestand.wachtrij.filter((kandidaat) => kandidaat.id !== id);
  const plek = Math.min(rest.length, Math.max(0, naarPlek));
  rest.splice(plek, 0, { ...nummer, zelfVerplaatst: true });
  return herorden({ ...toestand, wachtrij: rest });
}

// Haalt het label "zelf verplaatst" weer weg; het nummer doet dan weer mee
// met de eerlijke beurtverdeling.
export function maakLos(toestand, id) {
  const wachtrij = toestand.wachtrij.map((nummer) => (nummer.id === id ? { ...nummer, zelfVerplaatst: false } : nummer));
  return herorden({ ...toestand, wachtrij });
}

// Alle namen van aanvragers die vanavond al zijn gebruikt, op alfabet.
// De pop-up stelt deze voor, zodat "Lisa" niet de ene keer "lisa" en de
// andere keer "Liza" wordt (belangrijk voor de eerlijke beurtverdeling).
export function bekendeNamen(toestand) {
  const namen = new Map(); // kleine letters → de naam zoals hij het eerst is getypt
  const alles = [toestand.nuBezig, ...toestand.wachtrij, ...toestand.gezongen];
  for (const nummer of alles) {
    const naam = nummer?.aanvrager;
    if (!naam) continue;
    const sleutel = naam.toLocaleLowerCase("nl");
    if (!namen.has(sleutel)) namen.set(sleutel, naam);
  }
  return [...namen.values()].sort((a, b) => a.localeCompare(b, "nl")).slice(0, 100);
}

// --- Instellingen ----------------------------------------------------------------------

// Verandert één instelling. Onbekende namen en verkeerde waarden worden genegeerd.
export function zetInstelling(toestand, naam, waarde) {
  if (!Object.hasOwn(STANDAARD_INSTELLINGEN, naam)) return toestand;
  const net = netteInstelling(naam, waarde);
  if (net === undefined || net === toestand.instellingen[naam]) return toestand;

  let nieuw = { ...toestand, instellingen: { ...toestand.instellingen, [naam]: net } };
  // Een andere muzieklink begint weer bij het begin.
  if (naam === "muziekAdres") nieuw = { ...nieuw, muziekHervat: null };
  // Gaat de eerlijke beurt aan, dan wordt de wachtrij meteen opnieuw ingedeeld.
  return naam === "eerlijkeBeurt" ? herorden(nieuw) : nieuw;
}

// --- De speler: openen, starten, stoppen ---------------------------------------------------

function metSpeler(toestand, wijziging) {
  return { ...toestand, speler: { ...toestand.speler, ...wijziging } };
}

// Zet het nummer dat bezig was terug vooraan in de wachtrij.
function zetTerugVooraan(toestand) {
  if (!toestand.nuBezig) return toestand;
  return {
    ...toestand,
    nuBezig: null,
    wachtrij: [toestand.nuBezig, ...toestand.wachtrij],
    speler: { ...toestand.speler, fase: "wacht", aftellenTot: 0, probleem: "" },
  };
}

// Het spelervenster is geopend.
export function spelerGeopend(toestand, { tabId, vensterId, vastgezet = false }) {
  return metSpeler(toestand, { ...LEGE_SPELER, open: true, tabId, vensterId, vastgezet });
}

// Het spelervenster is gesloten. Speelde er iets, dan gaat dat terug vooraan in de wachtrij.
export function spelerGesloten(toestand) {
  return { ...zetTerugVooraan(toestand), speler: { ...LEGE_SPELER } };
}

// Het venster staat op zijn plek (of juist niet meer).
export function zetVastgezet(toestand, vastgezet) {
  return toestand.speler.open ? metSpeler(toestand, { vastgezet: vastgezet === true }) : toestand;
}

// Mag er nu op Start worden gedrukt?
export function kanStarten(toestand) {
  return toestand.speler.open && toestand.speler.fase === "wacht" && !toestand.nuBezig && toestand.wachtrij.length > 0;
}

// Start: het eerste nummer uit de wachtrij wordt "Nu bezig". Staat aftellen
// aan, dan mag de video pas over 5 seconden beginnen.
export function start(toestand, nu = Date.now()) {
  if (!kanStarten(toestand)) return toestand;
  const [eerste, ...rest] = toestand.wachtrij;
  return {
    ...toestand,
    nuBezig: eerste,
    wachtrij: rest,
    speler: {
      ...toestand.speler,
      fase: "aftellen",
      aftellenTot: toestand.instellingen.aftellen ? nu + AFTELSECONDEN * 1000 : nu,
      probleem: "",
      muziekSpeelt: false,
    },
  };
}

// Het nummer is afgelopen of overgeslagen: het telt als gezongen.
export function afgelopen(toestand) {
  if (!toestand.nuBezig) return toestand;
  return herorden({
    ...toestand,
    nuBezig: null,
    gezongen: [...toestand.gezongen, toestand.nuBezig].slice(-MAX_GEZONGEN),
    speler: { ...toestand.speler, fase: "wacht", aftellenTot: 0, probleem: "" },
  });
}

// Stop: het nummer telt niet als gezongen en komt weer vooraan als "Volgende".
export function stop(toestand) {
  return zetTerugVooraan(toestand);
}

// De speler meldt wat er op het tweede scherm gebeurt.
export function spelerMeldt(toestand, gebeurtenis, gegevens = {}) {
  const { speler, nuBezig } = toestand;
  if (!speler.open) return toestand;

  switch (gebeurtenis) {
    case "begonnen":
    case "verder":
      return nuBezig ? metSpeler(toestand, { fase: "speelt", probleem: "" }) : toestand;
    case "gepauzeerd":
      return nuBezig && speler.fase === "speelt" ? metSpeler(toestand, { fase: "gepauzeerd" }) : toestand;
    case "afgelopen":
      return afgelopen(toestand);
    case "probleem":
      return PROBLEMEN.includes(gegevens.code) ? metSpeler(toestand, { probleem: gegevens.code }) : toestand;
    case "muziek":
      return metSpeler(toestand, { muziekSpeelt: gegevens.speelt === true });
    case "muziek-positie":
      return isVideoId(gegevens.videoId) && Number.isFinite(gegevens.tijd)
        ? { ...toestand, muziekHervat: { videoId: gegevens.videoId, tijd: Math.max(0, Math.floor(gegevens.tijd)) } }
        : toestand;
    default:
      return toestand;
  }
}

// Firefox is opnieuw gestart: er is geen spelervenster meer.
export function bijOpstarten(toestand) {
  return spelerGesloten(toestand);
}

// Een nieuwe avond: de wachtrij en de telling van de beurten beginnen opnieuw.
// De instellingen blijven staan. Kan niet terwijl er een nummer bezig is.
export function nieuweAvond(toestand) {
  if (toestand.nuBezig) return toestand;
  return { ...toestand, teller: 0, wachtrij: [], gezongen: [], muziekHervat: null };
}
