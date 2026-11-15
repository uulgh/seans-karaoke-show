// Achtergrondscript van Sean's Karaoke Show.
//
// Dit script draait onzichtbaar op de achtergrond en is "de ene waarheid":
// alleen hier worden de wachtrij en de instellingen veranderd. De zijbalk en
// het spelervenster tonen wat er in de opslag staat en sturen een bericht
// hierheen als er iets moet veranderen.
//
// Belangrijk: alle "addListener"-regels staan bovenaan en buiten functies.
// Firefox mag dit script stilleggen en maakt het pas weer wakker als er iets
// gebeurt; dat lukt alleen als de luisteraars meteen bij het starten worden
// aangemeld.

import {
  bekendeNamen,
  maakLos,
  nieuweAvond,
  staatInWachtrij,
  verplaats,
  verwijder,
  zetInstelling,
} from "../gedeeld/wachtrij.js";
import { isVideoId, LINKPATRONEN, muziekUit } from "../youtube/youtube-adressen.js";
import { leesToestand, werkToestandBij, zetMelding } from "./opslag.js";
import {
  bijGeslotenVenster,
  dempTabblad,
  naarWachtscherm,
  openSpelerscherm,
  overslaan,
  pauzeWissel,
  plaatsOpnieuw,
  ruimOpBijStart,
  spelerMeldde,
  starten,
  stoppen,
  zetVast,
} from "./spelerscherm.js";
import { openPopUpOfVoegToe, voegNummerToe, zoekVideogegevens } from "./toevoegen.js";

const MENU_ID = "zet-in-wachtrij";
const MAX_LOGO = 3_000_000; // tekens; ruim genoeg voor een logo van 2 MB

// --- Knop in de werkbalk: zijbalk openen of sluiten ---------------------------

browser.action.onClicked.addListener(() => {
  // Firefox staat dit alleen toe als directe reactie op een klik van de
  // gebruiker. Daarom gebeurt het meteen hier, zonder iets ervoor.
  browser.sidebarAction.toggle();
});

// --- Starten van Firefox of van de extensie --------------------------------------

async function maakMenu() {
  await browser.menus.removeAll();
  browser.menus.create({
    id: MENU_ID,
    title: "Zet in de karaoke-wachtrij",
    contexts: ["link"],
    targetUrlPatterns: LINKPATRONEN,
  });
}

async function bijStart() {
  await maakMenu();
  await ruimOpBijStart();
}

browser.runtime.onInstalled.addListener(bijStart);
browser.runtime.onStartup.addListener(bijStart);

// --- Rechtsklikmenu bij YouTube-links ------------------------------------------

browser.menus.onClicked.addListener((info, tabblad) => {
  if (info.menuItemId !== MENU_ID) return;

  // Zijbalk openen zodat je ziet dat het nummer erbij komt. Dit moet als
  // allereerste, anders ziet Firefox het niet meer als reactie op de klik.
  browser.sidebarAction.open();

  openPopUpOfVoegToe({ adres: info.linkUrl, linkTekst: info.linkText, tabId: tabblad?.id }).catch((fout) => {
    console.error("Toevoegen via het rechtsklikmenu is mislukt:", fout);
    zetMelding(`Toevoegen is niet gelukt: ${fout.message}`, "fout");
  });
});

// --- Het spelervenster gaat dicht ---------------------------------------------------

browser.windows.onRemoved.addListener((vensterId) => {
  bijGeslotenVenster({ vensterId });
});

browser.tabs.onRemoved.addListener((tabId) => {
  bijGeslotenVenster({ tabId });
});

// --- Stille laptop: YouTube-tabbladen dempen zolang het spelervenster open is --------

browser.tabs.onUpdated.addListener(
  async (tabId, wijziging, tabblad) => {
    dempTabblad(tabblad, await leesToestand());
  },
  { urls: ["*://*.youtube.com/*"], properties: ["url", "audible"] },
);

// --- Berichten van de zijbalk, de pop-up en het spelervenster ------------------------
//
// Berichten komen altijd van de extensie zelf: van een eigen pagina (zoals de
// zijbalk) of van ons eigen script in een YouTube-pagina. Gewone webpagina's
// kunnen hier niets naartoe sturen.

// De zijbalk is een eigen pagina van de extensie.
function komtVanEigenPagina(afzender) {
  return typeof afzender.url === "string" && afzender.url.startsWith(browser.runtime.getURL(""));
}

// Komt dit bericht uit het tabblad van het spelervenster?
async function komtVanSpeler(afzender) {
  const { speler } = await leesToestand();
  return speler.open && afzender.tab?.id === speler.tabId;
}

async function nummerVerwijderen(id) {
  const voor = await leesToestand();
  const nummer = voor.wachtrij.find((kandidaat) => kandidaat.id === id);
  if (!nummer) return { gelukt: false };
  await werkToestandBij((toestand) => verwijder(toestand, id));
  await zetMelding(`Verwijderd: ${nummer.titel}`);
  return { gelukt: true };
}

async function instellingZetten(naam, waarde) {
  const voor = await leesToestand();
  const na = await werkToestandBij((toestand) => zetInstelling(toestand, naam, waarde));
  const veranderd = voor.instellingen[naam] !== na.instellingen[naam];

  if (naam === "muziekAdres" && na.instellingen.muziekAdres && !muziekUit(na.instellingen.muziekAdres)) {
    await zetMelding("Dit is geen YouTube-link naar een video of afspeellijst.", "fout");
  }
  if (naam === "achtergrondmuziek" && na.instellingen.achtergrondmuziek && !muziekUit(na.instellingen.muziekAdres)) {
    await zetMelding("Stel eerst een muzieklink in bij Instellingen (het tandwiel).", "fout");
  }

  // Muziek aan of uit, of een andere link: het wachtscherm opnieuw laden.
  const gaatOverMuziek = naam === "achtergrondmuziek" || naam === "muziekAdres";
  if (veranderd && gaatOverMuziek && na.speler.open && na.speler.fase === "wacht") {
    await naarWachtscherm();
  }
  return { gelukt: true };
}

async function logoZetten(logo) {
  if (logo === null) {
    await browser.storage.local.remove("logo");
    return { gelukt: true };
  }
  if (typeof logo !== "string" || !logo.startsWith("data:image/") || logo.length > MAX_LOGO) {
    await zetMelding("Dit logo is te groot of geen afbeelding. Kies een afbeelding van hooguit 2 MB.", "fout");
    return { gelukt: false };
  }
  await browser.storage.local.set({ logo });
  return { gelukt: true };
}

async function avondOpnieuw() {
  const voor = await leesToestand();
  if (voor.nuBezig) {
    await zetMelding("Stop eerst het nummer dat bezig is.", "fout");
    return { gelukt: false };
  }
  await werkToestandBij(nieuweAvond);
  await zetMelding("Nieuwe avond: de wachtrij en de beurtentelling zijn leeg.");
  return { gelukt: true };
}

// De pop-up vraagt: wat is de artiest en de titel van deze video?
async function videogegevens({ videoId, titelHint }) {
  if (!isVideoId(videoId)) return { gelukt: false };
  const [gegevens, toestand] = await Promise.all([zoekVideogegevens(videoId, titelHint), leesToestand()]);
  return {
    gelukt: true,
    ...gegevens, // videotitel, artiest, titel
    staatAl: staatInWachtrij(toestand, videoId),
    namen: bekendeNamen(toestand),
  };
}

// De pop-up zegt: zet dit nummer in de wachtrij.
async function nummerToevoegen({ videoId, artiest, titel, aanvrager }) {
  try {
    const { stondErAl } = await voegNummerToe({ videoId, artiest, titel, aanvrager });
    return { gelukt: true, stondErAl };
  } catch (fout) {
    return { gelukt: false, fout: fout.message };
  }
}

// Berichten die alleen de zijbalk (een eigen pagina) mag sturen.
function vanZijbalk(bericht) {
  switch (bericht.soort) {
    case "nummer-verwijderen":
      return nummerVerwijderen(bericht.id);
    case "nummer-verplaatsen":
      return werkToestandBij((toestand) => verplaats(toestand, bericht.id, bericht.naar)).then(() => ({ gelukt: true }));
    case "nummer-losmaken":
      return werkToestandBij((toestand) => maakLos(toestand, bericht.id)).then(() => ({ gelukt: true }));
    case "instelling-zetten":
      return instellingZetten(bericht.naam, bericht.waarde);
    case "logo-zetten":
      return logoZetten(bericht.logo);
    case "nieuwe-avond":
      return avondOpnieuw();
    case "spelerscherm-openen":
      return openSpelerscherm().then(() => ({ gelukt: true }));
    case "scherm-vastzetten":
      return zetVast().then(() => ({ gelukt: true }));
    case "scherm-opnieuw-plaatsen":
      return plaatsOpnieuw().then(() => ({ gelukt: true }));
    case "starten":
      return starten();
    case "pauze-wissel":
      return pauzeWissel();
    case "stoppen":
      return stoppen();
    case "overslaan":
      return overslaan();
    default:
      return undefined;
  }
}

browser.runtime.onMessage.addListener((bericht, afzender) => {
  if (!bericht || typeof bericht !== "object" || afzender.id !== browser.runtime.id) return undefined;

  switch (bericht.soort) {
    // Vanuit de pop-up op YouTube.
    case "videogegevens-opvragen":
      return videogegevens(bericht);
    case "nummer-toevoegen":
      return nummerToevoegen(bericht);

    // Vanuit het script in een YouTube-pagina: ben ik het spelervenster?
    case "speler-aanmelden":
      return komtVanSpeler(afzender).then((isSpeler) => ({ isSpeler }));

    // Vanuit het spelervenster: wat gebeurt er op het tweede scherm?
    case "speler-meldt":
      return komtVanSpeler(afzender).then((klopt) =>
        klopt ? spelerMeldde(bericht.gebeurtenis, bericht.gegevens) : { gelukt: false },
      );

    // De voortgang (tijd) gaat rechtstreeks van het spelervenster naar de
    // zijbalk; het achtergrondscript hoeft daar niets mee te doen.
    case "voortgang":
      return undefined;

    default:
      // Alles wat overblijft mag alleen vanaf een eigen pagina, zoals de zijbalk.
      return komtVanEigenPagina(afzender) ? vanZijbalk(bericht) : undefined;
  }
});
