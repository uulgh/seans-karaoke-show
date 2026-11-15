// Zet de knop "+ Wachtrij" op elke video-thumbnail op YouTube, en op de
// video zelf als je een video aan het bekijken bent.
//
// Dit script draait in YouTube-pagina's in het laptopvenster. Waar de
// thumbnails zitten weet youtube-kiezers.js; de pop-up die opent staat in
// pop-up/pop-up.js.

(() => {
  "use strict";

  if (globalThis.karaokeKnoppen) return; // dit script is al geladen
  if (globalThis.karaokeIsSpeler) return; // in het spelervenster horen geen knoppen
  if (window.top !== window) return; // niet in ingesloten pagina's
  globalThis.karaokeKnoppen = true;

  const YouTube = globalThis.karaokeYouTube;
  const KLASSE = "sks-wachtrijknop";

  function maakKnop(extraKlasse = "") {
    const knop = document.createElement("button");
    knop.type = "button";
    knop.className = `${KLASSE} ${extraKlasse}`.trim();
    knop.textContent = "+ Wachtrij";
    knop.title = "Zet in de karaoke-wachtrij";
    return knop;
  }

  // --- Knoppen plaatsen ------------------------------------------------------------

  function werkBij() {
    if (globalThis.karaokeIsSpeler) return;

    // 1. Op elke thumbnail.
    for (const { link, videoId, plaatje } of YouTube.thumbnails()) {
      const knop = link.querySelector(`:scope > .${KLASSE}`);
      if (!videoId) {
        knop?.remove(); // YouTube hergebruikt links; deze wijst niet meer naar een video
        continue;
      }
      if (knop) continue;
      // De knop staat rechtsboven in de thumbnail; daarvoor moet de link zelf
      // het "ankerpunt" zijn.
      if (getComputedStyle(link).position === "static") link.classList.add("sks-anker");
      const nieuw = maakKnop();
      link.append(nieuw);
      // De link is soms iets groter dan het plaatje. De knop hoort in de
      // hoek van het plaatje, dus we meten het verschil.
      const vak = link.getBoundingClientRect();
      const beeld = plaatje.getBoundingClientRect();
      if (vak.width > 0 && beeld.width > 0) {
        nieuw.style.top = `${Math.max(0, beeld.top - vak.top) + 8}px`;
        nieuw.style.right = `${Math.max(0, vak.right - beeld.right) + 8}px`;
      }
    }

    // 2. Op de video die je aan het bekijken bent.
    const vak = YouTube.spelervak();
    const knopOpVideo = vak?.querySelector(`:scope > .${KLASSE}`);
    if (vak && YouTube.videoIdVanPagina()) {
      if (!knopOpVideo) vak.append(maakKnop(`${KLASSE}--video`));
    } else {
      knopOpVideo?.remove();
    }
  }

  // YouTube laadt steeds nieuwe video's bij (bij scrollen, bij een andere
  // pagina). We kijken opnieuw zodra er iets verandert, maar hooguit een paar
  // keer per seconde.
  let gepland = false;
  function plan() {
    if (gepland) return;
    gepland = true;
    setTimeout(() => {
      gepland = false;
      werkBij();
    }, 300);
  }

  function begin() {
    new MutationObserver(plan).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
    plan();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", begin, { once: true });
  else begin();

  // --- Klikken ------------------------------------------------------------------------
  //
  // De knop staat ín de link van de thumbnail. Een klik op de knop mag de
  // video niet openen. Daarom vangen we de klik helemaal bovenaan af, voordat
  // YouTube of de link hem ziet.

  function knopBij(gebeurtenis) {
    const doel = gebeurtenis.target;
    return doel instanceof Element ? doel.closest(`.${KLASSE}`) : null;
  }

  document.addEventListener(
    "click",
    (gebeurtenis) => {
      const knop = knopBij(gebeurtenis);
      if (!knop) return;
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();

      const link = knop.closest("a");
      const videoId = link ? YouTube.videoIdVanLink(link) : YouTube.videoIdVanPagina();
      if (!videoId) return;
      const titelHint = link ? YouTube.titelBij(link, videoId) : YouTube.titelVanPagina();
      globalThis.karaokePopUp?.open({ videoId, titelHint });
    },
    true,
  );

  // Ook de andere muisgebeurtenissen op de knop houden we bij YouTube weg
  // (anders start bijvoorbeeld de voorvertoning of opent een nieuw tabblad).
  for (const soort of ["mousedown", "mouseup", "pointerdown", "pointerup", "auxclick", "dblclick"]) {
    document.addEventListener(
      soort,
      (gebeurtenis) => {
        if (!knopBij(gebeurtenis)) return;
        gebeurtenis.stopImmediatePropagation();
        if (soort === "auxclick" || soort === "mousedown") gebeurtenis.preventDefault();
      },
      true,
    );
  }
})();
