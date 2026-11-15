// Zijbalk van Sean's Karaoke Show: het regiepaneel op de laptop.
//
// Dit script doet maar één ding: een "toestand" (wat speelt er, wat staat er
// in de wachtrij, welke schakelaars staan aan) op het scherm tekenen.
//
// Fase 1: de toestand komt uit voorbeeld.js, zodat de vormgeving te zien is.
// Vanaf fase 2 komt de toestand uit het achtergrondscript.

import { voorbeeldToestand } from "./voorbeeld.js";

const element = (id) => document.getElementById(id);

// --- Kleine hulpjes ----------------------------------------------------------

// Maakt van 102 seconden de tekst "1:42".
function alsTijd(seconden) {
  const heel = Math.max(0, Math.floor(seconden));
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

// --- Tekenen -----------------------------------------------------------------

function tekenSpelerscherm(spelerscherm) {
  const actief = Boolean(spelerscherm && spelerscherm.actief);
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

function tekenWachtrij(wachtrij) {
  const lijst = element("wachtrij-lijst");
  const sjabloon = element("sjabloon-regel");

  element("wachtrij-aantal").textContent = String(wachtrij.length);
  element("wachtrij-leeg").hidden = wachtrij.length > 0;

  const regels = wachtrij.map((nummer, index) => {
    const regel = sjabloon.content.firstElementChild.cloneNode(true);
    regel.dataset.id = nummer.id;
    regel.querySelector(".regel__nummer").textContent = String(index + 1);

    const titel = regel.querySelector(".regel__titel");
    titel.textContent = nummer.titel;
    titel.title = nummer.titel;

    const artiest = regel.querySelector(".regel__artiest");
    artiest.textContent = nummer.artiest;
    artiest.title = nummer.artiest;

    tekenNaam(regel.querySelector(".regel__naam"), nummer.aanvrager);
    regel.querySelector(".etiket").hidden = !nummer.zelfVerplaatst;

    // Duidelijke omschrijving voor schermlezers: "Dancing Queen naar voren".
    for (const knop of regel.querySelectorAll("[data-actie]")) {
      knop.setAttribute("aria-label", `${nummer.titel}: ${knop.title.toLowerCase()}`);
    }
    // Het eerste nummer kan niet verder naar voren, het laatste niet verder naar achteren.
    regel.querySelector('[data-actie="omhoog"]').disabled = index === 0;
    regel.querySelector('[data-actie="omlaag"]').disabled = index === wachtrij.length - 1;

    return regel;
  });

  lijst.replaceChildren(...regels);
}

function tekenInstellingen(instellingen) {
  element("optie-aftellen").checked = Boolean(instellingen.aftellen);
  element("optie-eerlijk").checked = Boolean(instellingen.eerlijkeBeurt);
  element("optie-muziek").checked = Boolean(instellingen.achtergrondmuziek);
}

// Tekent de hele zijbalk opnieuw aan de hand van de toestand.
function tekenAlles(toestand) {
  tekenSpelerscherm(toestand.spelerscherm);
  tekenNuBezig(toestand.nuBezig);
  tekenVolgende(toestand.wachtrij[0]);
  tekenWachtrij(toestand.wachtrij);
  tekenInstellingen(toestand.instellingen);
}

// --- Kort berichtje onderin ---------------------------------------------------

let berichtKlok;

function toonBericht(tekst) {
  const bericht = element("bericht");
  bericht.textContent = tekst;
  bericht.hidden = false;
  clearTimeout(berichtKlok);
  berichtKlok = setTimeout(() => {
    bericht.hidden = true;
  }, 2600);
}

// --- Fase 1: knoppen doen nog niets -------------------------------------------
// Elke knop die nog niet werkt heeft in de HTML data-fase="3" of "4". Een klik
// laat zien in welke fase hij gaat werken. Dit verdwijnt stap voor stap.

document.addEventListener("click", (gebeurtenis) => {
  const knop = gebeurtenis.target.closest("button[data-fase]");
  if (!knop) return;
  toonBericht(`Deze knop gaat werken in fase ${knop.dataset.fase}.`);
});

// --- Start ---------------------------------------------------------------------

element("voorbeeldmelding").hidden = false;
tekenAlles(voorbeeldToestand);
