// De pop-up "In de wachtrij zetten".
//
// Dit script draait IN de YouTube-pagina (een "content script"). Het toont
// een venstertje met Artiest, Titel en Aangevraagd door, en stuurt het nummer
// naar het achtergrondscript als je op Toevoegen klikt.
//
// De pop-up staat in een afgeschermd stukje van de pagina (een "shadow
// root"). Daardoor kan de opmaak van YouTube onze pop-up niet verstoren, en
// onze opmaak YouTube niet.
//
// Dit bestand weet niets van hoe YouTube-pagina's in elkaar zitten; het
// krijgt alleen een video-ID. Andere scripts openen de pop-up met:
//
//     karaokePopUp.open({ videoId: "dQw4w9WgXcQ", titelHint: "ABBA - Mamma Mia" })

(() => {
  "use strict";

  if (globalThis.karaokePopUp) return; // dit script is al geladen

  const SVG = "http://www.w3.org/2000/svg";
  const ICOON_WISSEL = "M7 4 3 8h3v7h2V8h3L7 4zm10 16 4-4h-3V9h-2v7h-3l4 4z";

  let gastheer = null; // het element in de pagina waar de pop-up in hangt
  let deel = null; // de onderdelen van de pop-up (velden, knoppen ...)
  let stijlKlaar = null; // belofte: de opmaak is geladen
  let videoId = null; // de video waar de pop-up nu over gaat
  let beurt = 0; // telt elke keer dat de pop-up opent of sluit
  let bezig = false; // we wachten op het achtergrondscript
  let toastKlok;

  // --- Bouwen ------------------------------------------------------------------

  // Maakt een element. We gebruiken nergens innerHTML: titels komen van
  // YouTube en zijn dus niet te vertrouwen.
  function maak(soort, eigenschappen = {}, ...kinderen) {
    const element = document.createElement(soort);
    for (const [naam, waarde] of Object.entries(eigenschappen)) {
      if (naam === "tekst") element.textContent = waarde;
      else element.setAttribute(naam, waarde);
    }
    element.append(...kinderen);
    return element;
  }

  function icoon(pad) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const vorm = document.createElementNS(SVG, "path");
    vorm.setAttribute("d", pad);
    svg.append(vorm);
    return svg;
  }

  // Een invulveld met een label erboven.
  function veld(naam, label, extra = {}) {
    const invoer = maak("input", {
      class: "veld__invoer",
      type: "text",
      name: naam,
      maxlength: "200",
      autocomplete: "off",
      spellcheck: "false",
      ...extra,
    });
    const omhulsel = maak("label", { class: "veld" }, maak("span", { class: "veld__label", tekst: label }), invoer);
    return { omhulsel, invoer };
  }

  function wachtOpStijl(link) {
    return new Promise((klaar) => {
      link.addEventListener("load", klaar, { once: true });
      link.addEventListener("error", klaar, { once: true });
    });
  }

  function bouw() {
    gastheer = maak("div", { id: "seans-karaoke-show" });
    const wortel = gastheer.attachShadow({ mode: "closed" });

    // De opmaak: dezelfde huisstijl als de zijbalk, plus de opmaak van de pop-up.
    const stijlen = ["gedeeld/huisstijl.css", "pop-up/pop-up.css"].map((pad) =>
      maak("link", { rel: "stylesheet", href: browser.runtime.getURL(pad) }),
    );
    stijlKlaar = Promise.race([
      Promise.all(stijlen.map(wachtOpStijl)),
      new Promise((klaar) => setTimeout(klaar, 2000)), // niet eeuwig wachten
    ]);

    const artiest = veld("artiest", "Artiest");
    const titel = veld("titel", "Titel");
    const aanvrager = veld("aanvrager", "Aangevraagd door", {
      placeholder: "Naam (mag leeg blijven)",
      list: "namen",
    });
    const namen = maak("datalist", { id: "namen" });
    aanvrager.omhulsel.append(
      namen,
      maak("span", { class: "veld__hulp", tekst: 'Een duet mag ook, bijvoorbeeld "Fatima & Sanne".' }),
    );

    const wissel = maak(
      "button",
      {
        type: "button",
        class: "knop knop--icoon venster__wissel",
        title: "Artiest en titel omwisselen",
        "aria-label": "Artiest en titel omwisselen",
      },
      icoon(ICOON_WISSEL),
    );

    const video = maak("p", { class: "venster__video" });
    const status = maak("p", { class: "venster__status", role: "status", hidden: "" });
    const annuleren = maak("button", { type: "button", class: "knop", tekst: "Annuleren" });
    const toevoegen = maak("button", { type: "submit", class: "knop knop--hoofd", tekst: "Toevoegen" });

    const formulier = maak(
      "form",
      { class: "venster__formulier", novalidate: "" },
      maak("h2", { class: "venster__kop", id: "kop", tekst: "In de wachtrij zetten" }),
      video,
      maak("div", { class: "venster__nummer" }, artiest.omhulsel, wissel, titel.omhulsel),
      aanvrager.omhulsel,
      status,
      maak("div", { class: "venster__knoppen" }, annuleren, toevoegen),
    );

    const dialoog = maak("dialog", { class: "venster", "aria-labelledby": "kop" }, formulier);
    const toast = maak("div", { class: "toast", popover: "manual", role: "status" });

    wortel.append(...stijlen, dialoog, toast);

    deel = {
      dialoog,
      formulier,
      video,
      status,
      namen,
      toast,
      wissel,
      toevoegen,
      artiest: artiest.invoer,
      titel: titel.invoer,
      aanvrager: aanvrager.invoer,
    };

    // --- Wat de knoppen doen ---

    formulier.addEventListener("submit", (gebeurtenis) => {
      gebeurtenis.preventDefault();
      verstuur();
    });

    annuleren.addEventListener("click", sluit);

    wissel.addEventListener("click", () => {
      [deel.artiest.value, deel.titel.value] = [deel.titel.value, deel.artiest.value];
    });

    // Klikken naast het venster (op de donkere achtergrond) sluit de pop-up.
    dialoog.addEventListener("click", (gebeurtenis) => {
      if (gebeurtenis.target !== dialoog) return;
      const rand = dialoog.getBoundingClientRect();
      const ernaast =
        gebeurtenis.clientX < rand.left ||
        gebeurtenis.clientX > rand.right ||
        gebeurtenis.clientY < rand.top ||
        gebeurtenis.clientY > rand.bottom;
      if (ernaast) sluit();
    });

    // Ook bij sluiten met Escape: een antwoord dat nog onderweg is telt niet meer.
    dialoog.addEventListener("close", () => {
      beurt += 1;
      bezig = false;
    });

    // Klikken in de pop-up mogen niet bij YouTube terechtkomen.
    for (const soort of ["click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup", "contextmenu"]) {
      gastheer.addEventListener(soort, (gebeurtenis) => gebeurtenis.stopPropagation());
    }

    document.documentElement.append(gastheer);
  }

  // --- Toetsen afschermen --------------------------------------------------------
  //
  // YouTube heeft sneltoetsen: "k" is pauze, "f" is volledig scherm, enzovoort.
  // Als je in de pop-up een naam typt, mag YouTube die toetsen niet zien.
  // Dit wordt meteen bij het laden aangemeld, zodat wij vóór YouTube aan de
  // beurt zijn. Typen, Enter en Escape blijven gewoon werken: we houden de
  // toets alleen voor andere luisteraars verborgen.

  for (const soort of ["keydown", "keypress", "keyup"]) {
    window.addEventListener(
      soort,
      (gebeurtenis) => {
        if (gastheer && gebeurtenis.target === gastheer) gebeurtenis.stopImmediatePropagation();
      },
      true,
    );
  }

  // --- Tonen en verbergen ---------------------------------------------------------

  function toonStatus(tekst, soort = "info") {
    deel.status.textContent = tekst;
    deel.status.hidden = !tekst;
    deel.status.classList.toggle("venster__status--fout", soort === "fout");
  }

  // Tijdens het wachten kun je niets invullen (maar wel annuleren).
  function zetBezig(aan, plaatshouder = "") {
    bezig = aan;
    for (const onderdeel of [deel.artiest, deel.titel, deel.aanvrager, deel.wissel, deel.toevoegen]) {
      onderdeel.disabled = aan;
    }
    deel.artiest.placeholder = plaatshouder;
    deel.titel.placeholder = plaatshouder;
  }

  function sluit() {
    if (deel?.dialoog.open) deel.dialoog.close();
  }

  function toonToast(tekst) {
    if (typeof deel.toast.showPopover !== "function") return;
    deel.toast.textContent = tekst;
    clearTimeout(toastKlok);
    try {
      deel.toast.hidePopover();
    } catch {
      // stond al uit
    }
    deel.toast.showPopover();
    toastKlok = setTimeout(() => {
      try {
        deel.toast.hidePopover();
      } catch {
        // stond al uit
      }
    }, 3200);
  }

  // Vraagt iets aan het achtergrondscript. Geeft undefined als dat mislukt.
  async function vraag(bericht) {
    try {
      return await browser.runtime.sendMessage(bericht);
    } catch (fout) {
      console.error("Sean's Karaoke Show: geen antwoord van de extensie.", fout);
      return undefined;
    }
  }

  // --- Openen -----------------------------------------------------------------------

  async function open({ videoId: nieuweVideo, titelHint = "" }) {
    if (!gastheer) bouw();
    await stijlKlaar;

    const dezeBeurt = ++beurt;
    videoId = nieuweVideo;

    deel.artiest.value = "";
    deel.titel.value = "";
    deel.aanvrager.value = "";
    deel.video.textContent = "";
    deel.namen.replaceChildren();
    toonStatus("");
    zetBezig(true, "Bezig met ophalen…");
    if (!deel.dialoog.open) deel.dialoog.showModal();

    const gegevens = await vraag({ soort: "videogegevens-opvragen", videoId, titelHint });

    // Is de pop-up intussen gesloten of voor een andere video geopend? Dan niets doen.
    if (dezeBeurt !== beurt || !deel.dialoog.open) return;

    zetBezig(false);
    if (gegevens?.gelukt) {
      deel.artiest.value = gegevens.artiest;
      deel.titel.value = gegevens.titel;
      deel.video.textContent = gegevens.videotitel ? `Video: ${gegevens.videotitel}` : "";
      deel.namen.replaceChildren(...gegevens.namen.map((naam) => maak("option", { value: naam })));
    }

    if (!deel.titel.value) {
      toonStatus("De titel van deze video kon niet worden opgehaald. Vul hem zelf in.");
      deel.titel.focus();
      return;
    }
    if (gegevens.staatAl) {
      toonStatus("Let op: deze video staat al in de wachtrij. Toevoegen kan gewoon.");
    }
    // Artiest en titel staan er al; het enige wat je meestal typt is de naam.
    deel.aanvrager.focus();
  }

  // --- Toevoegen ----------------------------------------------------------------------

  async function verstuur() {
    if (bezig) return;

    const titel = deel.titel.value.trim();
    if (!titel) {
      toonStatus("Vul een titel in.", "fout");
      deel.titel.focus();
      return;
    }

    const dezeBeurt = beurt;
    const nummer = {
      soort: "nummer-toevoegen",
      videoId,
      artiest: deel.artiest.value,
      titel,
      aanvrager: deel.aanvrager.value,
    };
    zetBezig(true);
    const antwoord = await vraag(nummer);
    if (dezeBeurt !== beurt) return; // intussen gesloten

    if (antwoord?.gelukt) {
      sluit();
      toonToast(`Toegevoegd aan de wachtrij: ${titel}`);
    } else {
      zetBezig(false);
      toonStatus(antwoord?.fout || "Toevoegen is niet gelukt. Probeer het nog eens.", "fout");
    }
  }

  // --- Aanmelden -------------------------------------------------------------------------

  globalThis.karaokePopUp = {
    open,
    staatOpen: () => Boolean(deel?.dialoog.open),
  };

  // Het achtergrondscript vraagt (na een klik in het rechtsklikmenu) om de pop-up.
  browser.runtime.onMessage.addListener((bericht) => {
    if (bericht?.soort !== "pop-up-openen") return undefined;
    open(bericht);
    return Promise.resolve({ geopend: true });
  });
})();
