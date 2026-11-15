// ALLES wat we weten over hoe YouTube-PAGINA'S in elkaar zitten, staat hier.
//
// YouTube verandert zijn pagina's geregeld. Werkt de knop "+ Wachtrij" of het
// spelervenster ineens niet meer, dan is dit het bestand om te repareren. De
// andere scripts vragen alleen: "waar zijn de thumbnails?", "wat is de video?",
// "speelt er reclame?".
//
// Dit is een gewoon script (geen module) dat in YouTube-pagina's draait. Het
// zet één naam klaar voor de andere scripts: karaokeYouTube.

(() => {
  "use strict";

  if (globalThis.karaokeYouTube) return;

  const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

  // Links naar een video. We zoeken op het adres van de link, niet op de
  // namen van YouTube's onderdelen: die veranderen vaak, een link blijft een link.
  const VIDEOLINKS = 'a[href*="/watch?v="]';

  // Een videolink is een thumbnail als er een van deze plaatjes in zit.
  const PLAATJE = "img, yt-image, yt-thumbnail-view-model, ytd-thumbnail";

  // Hier willen we géén knop:
  // - hoofdstukken binnen een video ("Intro 0:00")
  // - afspeellijsten en mixen (dat is geen losse video)
  const NIET_BINNEN = "ytd-macro-markers-list-item-renderer";
  const NIET_MET = "yt-collection-thumbnail-view-model, ytd-playlist-thumbnail";

  // De video-ID van een link, of null.
  function videoIdVanLink(link) {
    try {
      const adres = new URL(link.href, location.href);
      if (adres.pathname !== "/watch") return null;
      const id = adres.searchParams.get("v");
      return VIDEO_ID.test(id ?? "") ? id : null;
    } catch {
      return null;
    }
  }

  // De video-ID van de pagina zelf (de kijkpagina), of null.
  function videoIdVanPagina() {
    if (location.pathname !== "/watch") return null;
    const id = new URLSearchParams(location.search).get("v");
    return VIDEO_ID.test(id ?? "") ? id : null;
  }

  // Alle videolinks op de pagina: [{ link, videoId, plaatje }].
  // videoId is null als er bij deze link géén knop hoort.
  function thumbnails() {
    const gevonden = [];
    for (const link of document.querySelectorAll(VIDEOLINKS)) {
      const videoId = videoIdVanLink(link);
      const plaatje = link.querySelector(PLAATJE);
      const hoort = videoId && plaatje && !link.closest(NIET_BINNEN) && !link.querySelector(NIET_MET);
      gevonden.push({ link, videoId: hoort ? videoId : null, plaatje });
    }
    return gevonden;
  }

  // Probeert de titel te vinden die bij een thumbnail hoort: een andere link
  // naar dezelfde video, vlakbij, met tekst erin. Lukt het niet, dan "".
  // (Het achtergrondscript vraagt de echte titel toch bij YouTube op; dit is
  // alleen de reserve.)
  function titelBij(link, videoId) {
    let omhulsel = link.parentElement;
    for (let stap = 0; stap < 6 && omhulsel; stap++, omhulsel = omhulsel.parentElement) {
      for (const kandidaat of omhulsel.querySelectorAll(`a[href*="${videoId}"]`)) {
        if (kandidaat === link) continue;
        const tekst = (kandidaat.getAttribute("title") || kandidaat.textContent || "").replace(/\s+/g, " ").trim();
        if (tekst.length >= 3) return tekst.slice(0, 200);
      }
    }
    return "";
  }

  // De titel van de video op de kijkpagina (de tabtitel zonder " - YouTube").
  function titelVanPagina() {
    return document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube\s*$/, "").trim();
  }

  // Het vak van de videospeler op de kijkpagina.
  function spelervak() {
    return document.querySelector("#movie_player");
  }

  // De video zelf (het <video>-element van de hoofdspeler).
  function hoofdvideo() {
    return (
      document.querySelector("video.html5-main-video") ||
      document.querySelector("#movie_player video") ||
      [...document.querySelectorAll("video")].sort((a, b) => b.clientWidth - a.clientWidth)[0] ||
      null
    );
  }

  // Speelt YouTube op dit moment reclame in de speler?
  function reclameBezig() {
    return Boolean(document.querySelector("#movie_player.ad-showing, #movie_player.ad-interrupting"));
  }

  // Staat YouTube's eigen cookievraag ("Voordat je verdergaat naar YouTube") open?
  function cookievraagOpen() {
    if (location.hostname.startsWith("consent.")) return true;
    const venster = document.querySelector("ytd-consent-bump-v2-lightbox tp-yt-paper-dialog");
    return Boolean(venster) && venster.getBoundingClientRect().height > 0;
  }

  globalThis.karaokeYouTube = {
    videoIdVanLink,
    videoIdVanPagina,
    thumbnails,
    titelBij,
    titelVanPagina,
    spelervak,
    hoofdvideo,
    reclameBezig,
    cookievraagOpen,
  };
})();
