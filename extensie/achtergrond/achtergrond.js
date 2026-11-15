// Achtergrondscript van Sean's Karaoke Show.
//
// Dit script draait onzichtbaar op de achtergrond en is "de ene waarheid":
// alleen hier worden de wachtrij en de instellingen veranderd. De zijbalk
// toont wat er in de opslag staat en stuurt een bericht hierheen als er iets
// moet veranderen.
//
// Belangrijk: alle "addListener"-regels staan bovenaan en buiten functies.
// Firefox mag dit script stilleggen en maakt het pas weer wakker als er iets
// gebeurt; dat lukt alleen als de luisteraars meteen bij het starten worden
// aangemeld.

import { bekendeNamen, staatInWachtrij, verwijder, zetInstelling } from "../gedeeld/wachtrij.js";
import { isVideoId, LINKPATRONEN } from "../youtube/youtube-adressen.js";
import { leesToestand, werkToestandBij, zetMelding } from "./opslag.js";
import { openPopUpOfVoegToe, voegNummerToe, zoekVideogegevens } from "./toevoegen.js";

const MENU_ID = "zet-in-wachtrij";

// --- Knop in de werkbalk: zijbalk openen of sluiten ---------------------------

browser.action.onClicked.addListener(() => {
  // Firefox staat dit alleen toe als directe reactie op een klik van de
  // gebruiker. Daarom gebeurt het meteen hier, zonder iets ervoor.
  browser.sidebarAction.toggle();
});

// --- Rechtsklikmenu bij YouTube-links ------------------------------------------

async function maakMenu() {
  await browser.menus.removeAll();
  browser.menus.create({
    id: MENU_ID,
    title: "Zet in de karaoke-wachtrij",
    contexts: ["link"],
    targetUrlPatterns: LINKPATRONEN,
  });
}

// Bij installeren, bijwerken en bij het starten van Firefox.
browser.runtime.onInstalled.addListener(maakMenu);
browser.runtime.onStartup.addListener(maakMenu);

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

// --- Berichten van de zijbalk en van de pop-up ----------------------------------

// Berichten komen altijd van de extensie zelf: van een eigen pagina (zoals de
// zijbalk) of van ons eigen script in een YouTube-pagina (de pop-up). Gewone
// webpagina's kunnen hier niets naartoe sturen.
//
// Verwijderen en instellingen wijzigen mag alleen vanaf een eigen pagina.
function komtVanEigenPagina(afzender) {
  return typeof afzender.url === "string" && afzender.url.startsWith(browser.runtime.getURL(""));
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
  await werkToestandBij((toestand) => zetInstelling(toestand, naam, waarde));
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

browser.runtime.onMessage.addListener((bericht, afzender) => {
  if (!bericht || typeof bericht !== "object" || afzender.id !== browser.runtime.id) return undefined;

  switch (bericht.soort) {
    // Vanuit de pop-up op YouTube (of een eigen pagina).
    case "videogegevens-opvragen":
      return videogegevens(bericht);
    case "nummer-toevoegen":
      return nummerToevoegen(bericht);

    // Alleen vanaf een eigen pagina, zoals de zijbalk.
    case "nummer-verwijderen":
      return komtVanEigenPagina(afzender) ? nummerVerwijderen(bericht.id) : undefined;
    case "instelling-zetten":
      return komtVanEigenPagina(afzender) ? instellingZetten(bericht.naam, bericht.waarde) : undefined;

    default:
      return undefined;
  }
});
