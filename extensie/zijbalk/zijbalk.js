// Zijbalk van Sean's Karaoke Show: het regiepaneel op de laptop.
//
// De zijbalk bewaart zelf niets. Hij doet twee dingen:
//   1. De toestand uit de opslag op het scherm tekenen, en opnieuw tekenen
//      zodra de opslag verandert.
//   2. Een bericht naar het achtergrondscript sturen als jij iets wilt
//      veranderen (starten, een nummer verplaatsen, een schakelaar omzetten).
//
// Het achtergrondscript past de opslag aan, en daardoor tekent de zijbalk
// vanzelf opnieuw. Zo loopt wat je ziet nooit uit de pas met wat bewaard is.

import { herstel, kanStarten } from "../gedeeld/wachtrij.js";
import { muziekUit } from "../youtube/youtube-adressen.js";

const element = (id) => document.getElementById(id);

const ICOON_PAUZE = "M7 5h4v14H7zM13 5h4v14h-4z";
const ICOON_VERDER = "M8 5l11 7-11 7z";

// Wat de zijbalk laat zien als er iets misgaat op het tweede scherm.
const PROBLEMEN = {
  autoplay: [
    "Firefox blokkeert het afspelen met geluid.",
    "Zet in Firefox bij Instellingen → Privacy & Beveiliging → Automatisch afspelen → Instellingen… de standaard op " +
      '"Audio en video toestaan". Druk daarna opnieuw op Start.',
  ],
  cookies: [
    "YouTube vraagt nog om je cookiekeuze.",
    "Open YouTube in een gewoon tabblad, maak je keuze in het venster van YouTube en probeer het daarna opnieuw.",
  ],
  reclame: [
    "YouTube toont eerst reclame.",
    "Het nummer begint daarna vanzelf. Met een reclameblokker zoals uBlock Origin gebeurt dit niet.",
  ],
  start: [
    "De video start niet.",
    "Misschien is de video verwijderd of is er geen internet. Druk op Overslaan voor het volgende nummer, of op Stop " +
      "om het nog eens te proberen.",
  ],
};

let toestand = herstel(undefined); // wat er nu getekend is
let voortgang = null; // { videoId, positie, duur } van het nummer dat speelt

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

function tekenSpelerscherm(speler) {
  const klaar = speler.open && speler.vastgezet;
  element("scherm-status").classList.toggle("status--actief", klaar);
  element("scherm-status-tekst").textContent = klaar
    ? "Tweede scherm actief"
    : speler.open
      ? "Nog niet geplaatst"
      : "Geen tweede scherm";

  const knop = element("scherm-knop");
  knop.classList.toggle("knop--hoofd", speler.open && !speler.vastgezet);
  if (!speler.open) {
    element("scherm-knop-tekst").textContent = "Spelerscherm openen";
    knop.dataset.opdracht = "spelerscherm-openen";
    knop.title = "Open het venster voor het tweede scherm";
  } else if (!speler.vastgezet) {
    element("scherm-knop-tekst").textContent = "Hier vastzetten";
    knop.dataset.opdracht = "scherm-vastzetten";
    knop.title = "Onthoud deze plek en maak het venster schermvullend";
  } else {
    element("scherm-knop-tekst").textContent = "Opnieuw plaatsen";
    knop.dataset.opdracht = "scherm-opnieuw-plaatsen";
    knop.title = "Haal het venster uit volledig scherm om het naar een ander scherm te slepen";
  }

  element("hulp-plaatsen").hidden = !(speler.open && !speler.vastgezet);

  const probleem = PROBLEMEN[speler.probleem];
  element("hulp-probleem").hidden = !probleem;
  if (probleem) {
    element("probleem-kop").textContent = probleem[0];
    element("probleem-tekst").textContent = probleem[1];
  }
}

function tekenVoortgang() {
  const nummer = toestand.nuBezig;
  const past = nummer && voortgang && voortgang.videoId === nummer.videoId;
  const positie = past ? voortgang.positie : 0;
  const duur = past ? voortgang.duur : 0;
  const procent = duur > 0 ? Math.min(100, (positie / duur) * 100) : 0;
  element("nu-vulling").style.width = `${procent}%`;
  element("nu-balk").setAttribute("aria-valuenow", String(Math.round(procent)));
  element("nu-positie").textContent = alsTijd(positie);
  element("nu-duur").textContent = duur > 0 ? alsTijd(duur) : "–:––";
}

function tekenNuBezig(nummer, speler) {
  const bezig = Boolean(nummer);
  element("nu-gevuld").hidden = !bezig;
  element("nu-leeg").hidden = bezig;
  element("nu-puls").hidden = !bezig || speler.fase === "gepauzeerd";
  element("nu-kop-tekst").textContent =
    bezig && speler.fase === "aftellen" ? "Start zo…" : bezig && speler.fase === "gepauzeerd" ? "Op pauze" : "Nu bezig";
  if (!bezig) {
    voortgang = null;
    return;
  }

  element("nu-titel").textContent = nummer.titel;
  element("nu-artiest").textContent = nummer.artiest;
  tekenNaam(element("nu-aanvrager"), nummer.aanvrager);

  const gepauzeerd = speler.fase === "gepauzeerd";
  element("pauze-tekst").textContent = gepauzeerd ? "Verder" : "Pauze";
  element("pauze-icoon").setAttribute("d", gepauzeerd ? ICOON_VERDER : ICOON_PAUZE);
  element("knop-pauze").disabled = speler.fase === "aftellen";

  tekenVoortgang();
}

function tekenVolgende(nummer) {
  const isEr = Boolean(nummer);
  element("volgende-gevuld").hidden = !isEr;
  element("volgende-leeg").hidden = isEr;
  // De Start-knop is alleen "echt" uit als er niets te starten valt. Is er
  // geen spelerscherm, dan blijft hij aanklikbaar en legt hij uit waarom.
  element("knop-start").disabled = !isEr || Boolean(toestand.nuBezig);
  element("knop-start").classList.toggle("knop--wacht", isEr && !kanStarten(toestand));
  if (!isEr) return;

  element("volgende-titel").textContent = nummer.titel;
  element("volgende-artiest").textContent = nummer.artiest;
  tekenNaam(element("volgende-aanvrager"), nummer.aanvrager);
}

// Welke nummers stonden er bij de vorige keer tekenen al? Daarmee kunnen we
// een nummer dat er net bij is gekomen even laten oplichten.
let bekendeIds = null;

function tekenWachtrij(wachtrij, eerlijk) {
  const lijst = element("wachtrij-lijst");
  const sjabloon = element("sjabloon-regel");

  element("wachtrij-aantal").textContent = String(wachtrij.length);
  element("wachtrij-leeg").hidden = wachtrij.length > 0;

  const regels = wachtrij.map((nummer, index) => {
    const regel = sjabloon.content.firstElementChild.cloneNode(true);
    regel.dataset.id = nummer.id;
    regel.dataset.plek = String(index);
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
    // Het label "zelf verplaatst" heeft alleen betekenis als de eerlijke beurt aan staat.
    regel.querySelector(".etiket").hidden = !(eerlijk && nummer.zelfVerplaatst);

    // Duidelijke omschrijving voor schermlezers: "Dancing Queen: naar voren".
    for (const knop of regel.querySelectorAll(".regel__knoppen [data-actie]")) {
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
  // Tekstvelden niet overschrijven terwijl je erin typt.
  for (const invoer of document.querySelectorAll("[data-tekstinstelling]")) {
    if (document.activeElement !== invoer) invoer.value = instellingen[invoer.dataset.tekstinstelling] ?? "";
  }

  element("volume-rij").hidden = !instellingen.achtergrondmuziek;
  if (document.activeElement !== element("invoer-volume")) element("invoer-volume").value = instellingen.muziekVolume;
  element("volume-getal").textContent = String(instellingen.muziekVolume);

  const muziek = instellingen.muziekAdres ? muziekUit(instellingen.muziekAdres) : null;
  const hulp = element("muziek-hulp");
  hulp.classList.toggle("veld__hulp--fout", Boolean(instellingen.muziekAdres) && !muziek);
  hulp.textContent = !instellingen.muziekAdres
    ? "Een video of een afspeellijst. Plak de link en druk op Enter."
    : !muziek
      ? "Dit is geen YouTube-link naar een video of afspeellijst."
      : muziek.lijstId
        ? "Gelukt: dit is een afspeellijst."
        : "Gelukt: dit is een video. Hij wordt steeds herhaald.";
}

function tekenLogo(logo) {
  const beeld = element("logo-beeld");
  beeld.hidden = !logo;
  if (logo) beeld.src = logo;
  else beeld.removeAttribute("src");
  element("logo-weg").hidden = !logo;
}

// Tekent de hele zijbalk opnieuw aan de hand van de toestand.
function tekenAlles(nieuw) {
  toestand = nieuw;
  tekenSpelerscherm(toestand.speler);
  tekenNuBezig(toestand.nuBezig, toestand.speler);
  tekenVolgende(toestand.wachtrij[0]);
  tekenWachtrij(toestand.wachtrij, toestand.instellingen.eerlijkeBeurt);
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

// --- Klikken -------------------------------------------------------------------

// De knop "Wachtrij en beurten leegmaken" vraagt eerst om bevestiging: je
// moet er twee keer op klikken.
let avondKlok;
function nieuweAvond(knop) {
  if (knop.dataset.zeker === "ja") {
    clearTimeout(avondKlok);
    delete knop.dataset.zeker;
    knop.textContent = "Wachtrij en beurten leegmaken";
    stuur({ soort: "nieuwe-avond" });
    return;
  }
  knop.dataset.zeker = "ja";
  knop.textContent = "Zeker weten? Klik nog een keer";
  avondKlok = setTimeout(() => {
    delete knop.dataset.zeker;
    knop.textContent = "Wachtrij en beurten leegmaken";
  }, 4000);
}

document.addEventListener("click", (gebeurtenis) => {
  const knop = gebeurtenis.target.closest("button");
  if (!knop) return;

  // Knoppen in een regel van de wachtrij.
  const regel = knop.closest(".regel");
  if (regel && knop.dataset.actie) {
    const id = regel.dataset.id;
    const plek = Number(regel.dataset.plek);
    if (knop.dataset.actie === "verwijderen") stuur({ soort: "nummer-verwijderen", id });
    if (knop.dataset.actie === "omhoog") stuur({ soort: "nummer-verplaatsen", id, naar: plek - 1 });
    if (knop.dataset.actie === "omlaag") stuur({ soort: "nummer-verplaatsen", id, naar: plek + 1 });
    if (knop.dataset.actie === "losmaken") stuur({ soort: "nummer-losmaken", id });
    return;
  }

  switch (knop.id) {
    case "knop-start":
      stuur({ soort: "starten" });
      return;
    case "instellingen-knop":
      toonInstellingen(element("instellingen").hidden);
      return;
    case "instellingen-sluiten":
      toonInstellingen(false);
      return;
    case "logo-weg":
      stuur({ soort: "logo-zetten", logo: null });
      return;
    case "nieuwe-avond":
      nieuweAvond(knop);
      return;
    default:
      // Pauze, Stop, Overslaan en de knop van het spelerscherm.
      if (knop.dataset.opdracht) stuur({ soort: knop.dataset.opdracht });
  }
});

function toonInstellingen(open) {
  element("instellingen").hidden = !open;
  element("inhoud").hidden = open;
  if (open) element("invoer-feestnaam").focus();
}

// --- Schakelaars, tekstvelden, volume en logo ---------------------------------------

document.addEventListener("change", (gebeurtenis) => {
  const doel = gebeurtenis.target;

  if (doel.dataset.instelling) {
    stuur({ soort: "instelling-zetten", naam: doel.dataset.instelling, waarde: doel.checked });
  } else if (doel.dataset.tekstinstelling) {
    stuur({ soort: "instelling-zetten", naam: doel.dataset.tekstinstelling, waarde: doel.value });
  } else if (doel.id === "invoer-volume") {
    stuur({ soort: "instelling-zetten", naam: "muziekVolume", waarde: Number(doel.value) });
  } else if (doel.id === "logo-bestand") {
    leesLogo(doel);
  }
});

// Het volume verandert al tijdens het schuiven, niet pas bij het loslaten.
let volumeKlok;
element("invoer-volume").addEventListener("input", (gebeurtenis) => {
  const waarde = Number(gebeurtenis.target.value);
  element("volume-getal").textContent = String(waarde);
  clearTimeout(volumeKlok);
  volumeKlok = setTimeout(() => stuur({ soort: "instelling-zetten", naam: "muziekVolume", waarde }), 120);
});

// Enter in een tekstveld slaat de waarde op (door het veld te verlaten).
document.addEventListener("keydown", (gebeurtenis) => {
  if (gebeurtenis.key === "Enter" && gebeurtenis.target.dataset?.tekstinstelling) gebeurtenis.target.blur();
});

function leesLogo(invoer) {
  const bestand = invoer.files?.[0];
  invoer.value = ""; // zodat je hetzelfde bestand nog eens kunt kiezen
  if (!bestand) return;
  if (!bestand.type.startsWith("image/") || bestand.size > 2_000_000) {
    toonBericht("Kies een afbeelding van hooguit 2 MB.", "fout");
    return;
  }
  const lezer = new FileReader();
  lezer.addEventListener("load", () => stuur({ soort: "logo-zetten", logo: lezer.result }));
  lezer.addEventListener("error", () => toonBericht("Het logo kon niet worden gelezen.", "fout"));
  lezer.readAsDataURL(bestand);
}

// --- Slepen in de wachtrij ------------------------------------------------------------
//
// Je pakt een regel vast bij de zes puntjes links en sleept hem naar een
// andere plek. Een roze streep laat zien waar hij terechtkomt.

const lijst = element("wachtrij-lijst");
let sleep = null; // { id, van } zolang er gesleept wordt

function wisSleepstrepen() {
  for (const regel of lijst.querySelectorAll(".regel--voor, .regel--na")) {
    regel.classList.remove("regel--voor", "regel--na");
  }
}

// Bij welke regel en aan welke kant (voor of na) hangt de muis nu?
function sleepdoel(gebeurtenis) {
  const regel = gebeurtenis.target.closest?.(".regel");
  if (!regel) return null;
  const rand = regel.getBoundingClientRect();
  const na = gebeurtenis.clientY > rand.top + rand.height / 2;
  return { regel, na };
}

// Slepen kan alleen aan de greep beginnen, zodat je de knoppen gewoon kunt aanklikken.
lijst.addEventListener("pointerdown", (gebeurtenis) => {
  const greep = gebeurtenis.target.closest(".regel__greep");
  for (const regel of lijst.children) regel.draggable = Boolean(greep) && regel === greep.closest(".regel");
});

lijst.addEventListener("dragstart", (gebeurtenis) => {
  const regel = gebeurtenis.target.closest?.(".regel");
  if (!regel?.draggable) return;
  sleep = { id: regel.dataset.id, van: Number(regel.dataset.plek) };
  gebeurtenis.dataTransfer.effectAllowed = "move";
  gebeurtenis.dataTransfer.setData("text/plain", regel.querySelector(".regel__titel").textContent);
  regel.classList.add("regel--sleept");
});

lijst.addEventListener("dragover", (gebeurtenis) => {
  if (!sleep) return;
  gebeurtenis.preventDefault(); // zonder dit mag je hier niet loslaten
  gebeurtenis.dataTransfer.dropEffect = "move";
  wisSleepstrepen();
  const doel = sleepdoel(gebeurtenis);
  if (doel && doel.regel.dataset.id !== sleep.id) doel.regel.classList.add(doel.na ? "regel--na" : "regel--voor");
});

lijst.addEventListener("drop", (gebeurtenis) => {
  if (!sleep) return;
  gebeurtenis.preventDefault();
  const doel = sleepdoel(gebeurtenis);
  if (doel && doel.regel.dataset.id !== sleep.id) {
    // De nieuwe plek, geteld in de lijst zonder de regel die gesleept wordt.
    let naar = Number(doel.regel.dataset.plek) + (doel.na ? 1 : 0);
    if (sleep.van < naar) naar -= 1;
    if (naar !== sleep.van) stuur({ soort: "nummer-verplaatsen", id: sleep.id, naar });
  }
});

lijst.addEventListener("dragend", async () => {
  sleep = null;
  wisSleepstrepen();
  for (const regel of lijst.children) {
    regel.draggable = false;
    regel.classList.remove("regel--sleept");
  }
  // Tijdens het slepen wordt de lijst niet opnieuw getekend; dat halen we nu in.
  const opslag = await browser.storage.local.get("toestand");
  tekenAlles(herstel(opslag.toestand));
});

// --- Start ---------------------------------------------------------------------

// Opnieuw tekenen zodra de opslag verandert.
browser.storage.onChanged.addListener((wijzigingen, gebied) => {
  if (gebied !== "local") return;
  if (wijzigingen.toestand && !sleep) tekenAlles(herstel(wijzigingen.toestand.newValue));
  if (wijzigingen.melding) toonMelding(wijzigingen.melding.newValue);
  if (wijzigingen.logo) tekenLogo(wijzigingen.logo.newValue ?? null);
});

// Het spelervenster geeft elke seconde de tijd van het nummer door.
browser.runtime.onMessage.addListener((bericht) => {
  if (bericht?.soort !== "voortgang") return undefined;
  voortgang = { videoId: bericht.videoId, positie: Number(bericht.positie) || 0, duur: Number(bericht.duur) || 0 };
  tekenVoortgang();
  return undefined;
});

// En één keer tekenen bij het openen van de zijbalk.
const opgeslagen = await browser.storage.local.get(["toestand", "melding", "logo"]);
tekenAlles(herstel(opgeslagen.toestand));
tekenLogo(opgeslagen.logo ?? null);
toonMelding(opgeslagen.melding);
