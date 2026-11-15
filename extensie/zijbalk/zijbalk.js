// Zijbalk van Sean's Karaoke Show: het regiepaneel op de laptop.
//
// De zijbalk bewaart zelf niets. Hij doet twee dingen:
//   1. De toestand uit de opslag op het scherm tekenen, en opnieuw tekenen
//      zodra de opslag verandert.
//   2. Een bericht naar het achtergrondscript sturen als jij iets wilt
//      veranderen (een nummer verwijderen, een schakelaar omzetten).
//
// Het achtergrondscript past de opslag aan, en daardoor tekent de zijbalk
// vanzelf opnieuw. Zo loopt wat je ziet nooit uit de pas met wat bewaard is.

import { herstel } from "../gedeeld/wachtrij.js";

const element = (id) => document.getElementById(id);

// --- Kleine hulpjes ----------------------------------------------------------

// Maakt van 102 seconden de tekst "1:42".
function alsTijd(seconden) {
  const heel = Math.max(0, Math.floor(seconden || 0));
  const minuten = Math.floor(heel / 60);
  const rest = String(heel % 60).padStart(2, "0");
  return `${minuten}:${rest}`;
}

// Toont de naam van de aanvrager in roze, of "Geen naam" in grijs cursief.
function tekenNaam(plek, naam) {
  const heeftNaam = Boolean(naam && naam.trim());
  plek.textContent = heeftNaam ? naam.trim() : "Geen naam";
  plek.classList.toggle("naam--geen", !heeftNaam);
}

// Stuurt een opdracht naar het achtergrondscript.
async function stuur(bericht) {
  try {
    return await browser.runtime.sendMessage(bericht);
  } catch (fout) {
    console.error("Bericht naar het achtergrondscript is mislukt:", fout);
    toonBericht("Dat lukte niet. Probeer het nog eens.", "fout");
    return undefined;
  }
}

// --- Tekenen -----------------------------------------------------------------

// Het spelerscherm komt in fase 3; tot die tijd is er nooit een tweede scherm.
function tekenSpelerscherm(actief) {
  element("scherm-status").classList.toggle("status--actief", actief);
  element("scherm-status-tekst").textContent = actief ? "Tweede scherm actief" : "Geen tweede scherm";
  element("scherm-knop-tekst").textContent = actief ? "Opnieuw plaatsen" : "Spelerscherm openen";
  element("scherm-knop").title = actief
    ? "Zet het spelerscherm opnieuw op het tweede scherm"
    : "Open het venster voor het tweede scherm";
}

function tekenNuBezig(nummer) {
  const bezig = Boolean(nummer);
  element("nu-gevuld").hidden = !bezig;
  element("nu-leeg").hidden = bezig;
  element("nu-puls").hidden = !bezig;
  if (!bezig) return;

  element("nu-titel").textContent = nummer.titel;
  element("nu-artiest").textContent = nummer.artiest;
  tekenNaam(element("nu-aanvrager"), nummer.aanvrager);

  const procent = nummer.duur > 0 ? Math.min(100, (nummer.positie / nummer.duur) * 100) : 0;
  element("nu-vulling").style.width = `${procent}%`;
  element("nu-balk").setAttribute("aria-valuenow", String(Math.round(procent)));
  element("nu-positie").textContent = alsTijd(nummer.positie);
  element("nu-duur").textContent = alsTijd(nummer.duur);
}

function tekenVolgende(nummer) {
  const isEr = Boolean(nummer);
  element("volgende-gevuld").hidden = !isEr;
  element("volgende-leeg").hidden = isEr;
  element("knop-start").disabled = !isEr;
  if (!isEr) return;

  element("volgende-titel").textContent = nummer.titel;
  element("volgende-artiest").textContent = nummer.artiest;
  tekenNaam(element("volgende-aanvrager"), nummer.aanvrager);
}

// Welke nummers stonden er bij de vorige keer tekenen al? Daarmee kunnen we
// een nummer dat er net bij is gekomen even laten oplichten.
let bekendeIds = null;

function tekenWachtrij(wachtrij) {
  const lijst = element("wachtrij-lijst");
  const sjabloon = element("sjabloon-regel");

  element("wachtrij-aantal").textContent = String(wachtrij.length);
  element("wachtrij-leeg").hidden = wachtrij.length > 0;

  const regels = wachtrij.map((nummer, index) => {
    const regel = sjabloon.content.firstElementChild.cloneNode(true);
    regel.dataset.id = nummer.id;
    regel.querySelector(".regel__nummer").textContent = String(index + 1);
    if (bekendeIds && !bekendeIds.has(nummer.id)) regel.classList.add("regel--nieuw");

    const titel = regel.querySelector(".regel__titel");
    titel.textContent = nummer.titel;
    titel.title = nummer.titel;

    const artiest = regel.querySelector(".regel__artiest");
    artiest.textContent = nummer.artiest;
    artiest.title = nummer.artiest;
    artiest.hidden = !nummer.artiest;

    tekenNaam(regel.querySelector(".regel__naam"), nummer.aanvrager);
    regel.querySelector(".etiket").hidden = !nummer.zelfVerplaatst;

    // Duidelijke omschrijving voor schermlezers: "Dancing Queen: naar voren".
    for (const knop of regel.querySelectorAll("[data-actie]")) {
      knop.setAttribute("aria-label", `${nummer.titel}: ${knop.title.toLowerCase()}`);
    }
    // Het eerste nummer kan niet verder naar voren, het laatste niet verder naar achteren.
    regel.querySelector('[data-actie="omhoog"]').disabled = index === 0;
    regel.querySelector('[data-actie="omlaag"]').disabled = index === wachtrij.length - 1;

    return regel;
  });

  lijst.replaceChildren(...regels);
  bekendeIds = new Set(wachtrij.map((nummer) => nummer.id));
}

function tekenInstellingen(instellingen) {
  for (const invoer of document.querySelectorAll("[data-instelling]")) {
    invoer.checked = Boolean(instellingen[invoer.dataset.instelling]);
  }
}

// Tekent de hele zijbalk opnieuw aan de hand van de toestand.
function tekenAlles(toestand) {
  tekenSpelerscherm(false);
  tekenNuBezig(toestand.nuBezig);
  tekenVolgende(toestand.wachtrij[0]);
  tekenWachtrij(toestand.wachtrij);
  tekenInstellingen(toestand.instellingen);
}

// --- Kort berichtje onderin ---------------------------------------------------

let berichtKlok;

function toonBericht(tekst, soort = "info") {
  const bericht = element("bericht");
  bericht.textContent = tekst;
  bericht.classList.toggle("bericht--fout", soort === "fout");
  bericht.hidden = false;
  clearTimeout(berichtKlok);
  // Langere berichten blijven iets langer staan.
  berichtKlok = setTimeout(() => {
    bericht.hidden = true;
  }, 2600 + tekst.length * 30);
}

// Het achtergrondscript zet meldingen in de opslag ("Toegevoegd: Mamma Mia").
// We tonen ze alleen als ze vers zijn, niet als de zijbalk een uur later opengaat.
function toonMelding(melding) {
  if (!melding || typeof melding.tekst !== "string") return;
  if (Date.now() - melding.tijd > 6000) return;
  toonBericht(melding.tekst, melding.soort);
}

// --- Klikken en schakelen -------------------------------------------------------

document.addEventListener("click", (gebeurtenis) => {
  const knop = gebeurtenis.target.closest("button");
  if (!knop) return;

  // Verwijderen werkt al.
  if (knop.dataset.actie === "verwijderen") {
    const regel = knop.closest(".regel");
    if (regel) stuur({ soort: "nummer-verwijderen", id: regel.dataset.id });
    return;
  }

  // Knoppen die nog niet werken hebben in de HTML data-fase="3" of "4".
  if (knop.dataset.fase) {
    toonBericht(`Deze knop gaat werken in fase ${knop.dataset.fase}.`);
  }
});

document.addEventListener("change", (gebeurtenis) => {
  const invoer = gebeurtenis.target.closest("[data-instelling]");
  if (!invoer) return;
  stuur({ soort: "instelling-zetten", naam: invoer.dataset.instelling, waarde: invoer.checked });
});

// --- Start ---------------------------------------------------------------------

// Opnieuw tekenen zodra de opslag verandert.
browser.storage.onChanged.addListener((wijzigingen, gebied) => {
  if (gebied !== "local") return;
  if (wijzigingen.toestand) tekenAlles(herstel(wijzigingen.toestand.newValue));
  if (wijzigingen.melding) toonMelding(wijzigingen.melding.newValue);
});

// En één keer tekenen bij het openen van de zijbalk.
const opgeslagen = await browser.storage.local.get(["toestand", "melding"]);
tekenAlles(herstel(opgeslagen.toestand));
toonMelding(opgeslagen.melding);
