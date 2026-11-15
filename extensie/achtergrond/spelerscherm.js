// Het spelervenster: het aparte venster dat op het tweede scherm staat.
//
// Dit bestand opent en plaatst het venster, stuurt het naar de juiste
// YouTube-pagina (een nummer, de achtergrondmuziek of de rustpagina) en houdt
// de laptop stil door andere YouTube-tabbladen te dempen.
//
// Wat er IN het venster te zien is (wachtscherm, aftellen, de video
// schermvullend) regelt het script in de pagina: speler/speler.js.

import {
  afgelopen,
  spelerGeopend,
  spelerGesloten,
  spelerMeldt,
  start,
  stop,
  zetVastgezet,
} from "../gedeeld/wachtrij.js";
import { muziekadres, muziekUit, rustadres, speleradres } from "../youtube/youtube-adressen.js";
import { leesToestand, werkToestandBij, zetMelding } from "./opslag.js";

const SLEUTEL_PLEK = "vensterplek"; // waar het venster de vorige keer stond
const YOUTUBE = ["*://*.youtube.com/*"];

// --- Welke pagina hoort er in het spelervenster? ------------------------------------

// Het adres voor het wachtscherm: de achtergrondmuziek als die aan staat en
// er een geldige link is ingesteld, anders de lichte rustpagina.
export function wachtadres(toestand) {
  const { achtergrondmuziek, muziekAdres } = toestand.instellingen;
  const muziek = achtergrondmuziek ? muziekUit(muziekAdres) : null;
  if (!muziek) return rustadres();

  // Verdergaan waar de muziek was gebleven. Bij een losse video alleen als
  // het nog om dezelfde video gaat.
  const hervat = toestand.muziekHervat;
  const pastErbij = hervat && (muziek.lijstId || hervat.videoId === muziek.videoId);
  return muziekadres(muziek, pastErbij ? hervat : null);
}

// Stuurt het spelervenster naar een ander adres.
async function stuurSpelerNaar(adres) {
  const toestand = await leesToestand();
  if (!toestand.speler.open) return;
  try {
    await browser.tabs.update(toestand.speler.tabId, { url: adres, muted: false });
  } catch {
    // Het venster bestaat niet meer.
    await werkToestandBij(spelerGesloten);
  }
}

export async function naarWachtscherm() {
  await stuurSpelerNaar(wachtadres(await leesToestand()));
}

// --- Openen en plaatsen ----------------------------------------------------------------

function plekIsGoed(plek) {
  return (
    Boolean(plek) &&
    ["left", "top", "width", "height"].every((naam) => Number.isFinite(plek[naam])) &&
    plek.width >= 200 &&
    plek.height >= 150
  );
}

// Opent het spelervenster. Staat er een plek bewaard, dan gaat het venster
// daar meteen naartoe en op volledig scherm. Anders opent het klein op de
// laptop, zodat Sean het naar het tweede scherm kan slepen.
export async function openSpelerscherm() {
  let toestand = await leesToestand();

  if (toestand.speler.open) {
    try {
      await browser.windows.update(toestand.speler.vensterId, { focused: true });
      return;
    } catch {
      toestand = await werkToestandBij(spelerGesloten); // het venster was al weg
    }
  }

  const bewaard = await browser.storage.local.get(SLEUTEL_PLEK);
  const plek = plekIsGoed(bewaard[SLEUTEL_PLEK]) ? bewaard[SLEUTEL_PLEK] : null;

  const venster = await browser.windows.create({
    type: "popup", // een venster zonder tabbladen en zonder adresbalk om in te typen
    url: wachtadres(toestand),
    ...(plek ?? { width: 1000, height: 620 }),
  });

  await werkToestandBij((oud) =>
    spelerGeopend(oud, { tabId: venster.tabs[0].id, vensterId: venster.id, vastgezet: Boolean(plek) }),
  );

  if (plek) {
    // Firefox kan een venster niet tegelijk een plek én volledig scherm geven.
    // Dus eerst op zijn plek zetten, en daarna pas op volledig scherm.
    await browser.windows.update(venster.id, { left: plek.left, top: plek.top });
    await browser.windows.update(venster.id, { state: "fullscreen" });
  }

  await dempLaptop();
}

// Sean heeft het venster naar het tweede scherm gesleept: onthoud die plek
// en zet het venster op volledig scherm.
export async function zetVast() {
  const toestand = await leesToestand();
  if (!toestand.speler.open) return;

  const venster = await browser.windows.get(toestand.speler.vensterId);
  if (venster.state !== "fullscreen") {
    const plek = { left: venster.left, top: venster.top, width: venster.width, height: venster.height };
    await browser.storage.local.set({ [SLEUTEL_PLEK]: plek });
    await browser.windows.update(venster.id, { state: "fullscreen" });
  }
  await werkToestandBij((oud) => zetVastgezet(oud, true));
}

// "Opnieuw plaatsen": het venster gaat uit volledig scherm, zodat het naar
// een ander scherm kan worden gesleept.
export async function plaatsOpnieuw() {
  const toestand = await leesToestand();
  if (!toestand.speler.open) return;
  await werkToestandBij((oud) => zetVastgezet(oud, false));
  await browser.windows.update(toestand.speler.vensterId, { state: "normal" });
  await browser.windows.update(toestand.speler.vensterId, { focused: true });
}

// Het venster (of het tabblad erin) is gesloten.
export async function bijGeslotenVenster({ vensterId = null, tabId = null }) {
  const toestand = await leesToestand();
  const { speler } = toestand;
  if (!speler.open) return;
  if (speler.vensterId !== vensterId && speler.tabId !== tabId) return;
  await werkToestandBij(spelerGesloten);
  await ontdempLaptop();
}

// Firefox of de extensie is opnieuw gestart. Een spelervenster van de vorige
// keer werkt niet meer; we sluiten het en beginnen schoon.
export async function ruimOpBijStart() {
  const toestand = await leesToestand();
  if (toestand.speler.open) {
    await browser.windows.remove(toestand.speler.vensterId).catch(() => {});
  }
  await werkToestandBij(spelerGesloten);
  await ontdempLaptop();
}

// --- Bediening: starten, pauze, stoppen, overslaan ------------------------------------------

export async function starten() {
  let gestart = false;
  const toestand = await werkToestandBij((oud) => {
    const nieuw = start(oud);
    gestart = nieuw !== oud;
    return nieuw;
  });

  if (!gestart) {
    if (!toestand.speler.open) await zetMelding("Open eerst het spelerscherm.", "fout");
    else if (toestand.nuBezig) await zetMelding("Er is al een nummer bezig.", "fout");
    else await zetMelding("De wachtrij is leeg.", "fout");
    return { gelukt: false };
  }

  await stuurSpelerNaar(speleradres(toestand.nuBezig.videoId));
  return { gelukt: true };
}

// Pauze of juist weer verder: de opdracht gaat naar de pagina in het
// spelervenster. Die meldt daarna zelf of het gelukt is.
export async function pauzeWissel() {
  const toestand = await leesToestand();
  if (!toestand.nuBezig || toestand.speler.fase === "aftellen") return { gelukt: false };
  const opdracht = toestand.speler.fase === "gepauzeerd" ? "verder" : "pauze";
  try {
    await browser.tabs.sendMessage(toestand.speler.tabId, { soort: "speler-opdracht", opdracht });
    return { gelukt: true };
  } catch {
    return { gelukt: false };
  }
}

// Stop: terug naar het wachtscherm; het nummer komt weer vooraan in de wachtrij.
export async function stoppen() {
  await werkToestandBij(stop);
  await naarWachtscherm();
  return { gelukt: true };
}

// Overslaan: terug naar het wachtscherm; het nummer telt als gezongen.
export async function overslaan() {
  await werkToestandBij(afgelopen);
  await naarWachtscherm();
  return { gelukt: true };
}

// De pagina in het spelervenster meldt iets: begonnen, gepauzeerd, afgelopen ...
export async function spelerMeldde(gebeurtenis, gegevens) {
  if (gebeurtenis === "vastzetten") {
    await zetVast();
    return { gelukt: true };
  }
  const voor = await leesToestand();
  const na = await werkToestandBij((oud) => spelerMeldt(oud, gebeurtenis, gegevens));
  // Na afloop van het nummer: terug naar het wachtscherm. Zo krijgt YouTube
  // ook geen kans om zelf een volgende video te starten.
  if (gebeurtenis === "afgelopen" && voor.nuBezig && !na.nuBezig) await naarWachtscherm();
  return { gelukt: true };
}

// --- Stille laptop -----------------------------------------------------------------------------
//
// Zolang het spelervenster open is, worden YouTube-tabbladen in het
// laptopvenster gedempt. Alleen het spelervenster maakt geluid.
// Zet Sean zelf het geluid van een tabblad weer aan (om iets voor te
// luisteren), dan blijven we daar vanaf.

function zelfAangezet(tabblad) {
  return tabblad.mutedInfo?.reason === "user" && !tabblad.mutedInfo.muted;
}

export async function dempTabblad(tabblad, toestand) {
  if (!toestand.speler.open || !tabblad) return;
  if (tabblad.id === toestand.speler.tabId) {
    if (tabblad.mutedInfo?.muted) await browser.tabs.update(tabblad.id, { muted: false }).catch(() => {});
    return;
  }
  if (tabblad.mutedInfo?.muted || zelfAangezet(tabblad)) return;
  await browser.tabs.update(tabblad.id, { muted: true }).catch(() => {});
}

export async function dempLaptop() {
  const toestand = await leesToestand();
  if (!toestand.speler.open) return;
  const tabbladen = await browser.tabs.query({ url: YOUTUBE });
  await Promise.all(tabbladen.map((tabblad) => dempTabblad(tabblad, toestand)));
}

// Het spelervenster is dicht: wat wij hebben gedempt, krijgt zijn geluid terug.
export async function ontdempLaptop() {
  const tabbladen = await browser.tabs.query({ url: YOUTUBE });
  await Promise.all(
    tabbladen
      .filter(
        (tabblad) =>
          tabblad.mutedInfo?.muted &&
          tabblad.mutedInfo.reason === "extension" &&
          tabblad.mutedInfo.extensionId === browser.runtime.id,
      )
      .map((tabblad) => browser.tabs.update(tabblad.id, { muted: false }).catch(() => {})),
  );
}
