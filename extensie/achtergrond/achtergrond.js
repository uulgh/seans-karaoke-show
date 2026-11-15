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

import { verwijder, zetInstelling } from "../gedeeld/wachtrij.js";
import { LINKPATRONEN } from "../youtube/youtube-adressen.js";
import { leesToestand, werkToestandBij, zetMelding } from "./opslag.js";
import { voegVideoToe } from "./toevoegen.js";

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

browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;

  // Zijbalk openen zodat je ziet dat het nummer erbij komt. Dit moet als
  // allereerste, anders ziet Firefox het niet meer als reactie op de klik.
  browser.sidebarAction.open();

  voegVideoToe({ adres: info.linkUrl, linkTekst: info.linkText }).catch((fout) => {
    console.error("Toevoegen via het rechtsklikmenu is mislukt:", fout);
    zetMelding(`Toevoegen is niet gelukt: ${fout.message}`, "fout");
  });
});

// --- Berichten van de zijbalk ---------------------------------------------------

// Alleen de eigen pagina's van de extensie (zoals de zijbalk) mogen de
// wachtrij en de instellingen veranderen, geen webpagina's.
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

browser.runtime.onMessage.addListener((bericht, afzender) => {
  if (!bericht || typeof bericht !== "object" || !komtVanEigenPagina(afzender)) return undefined;

  switch (bericht.soort) {
    case "nummer-verwijderen":
      return nummerVerwijderen(bericht.id);
    case "instelling-zetten":
      return instellingZetten(bericht.naam, bericht.waarde);
    default:
      return undefined;
  }
});
