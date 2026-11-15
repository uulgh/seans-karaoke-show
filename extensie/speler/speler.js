// Het spelervenster: dit script bestuurt de YouTube-pagina op het tweede scherm.
//
// Het draait in elke YouTube-pagina, maar doet alleen iets in het tabblad
// van het spelervenster. Daar zorgt het voor:
//   - het wachtscherm tussen de nummers (getekend door wachtscherm.js);
//   - het aftellen 5-4-3-2-1;
//   - de video schermvullend, zonder knoppen en menu's van YouTube;
//   - melden aan het achtergrondscript: begonnen, gepauzeerd, afgelopen;
//   - de achtergrondmuziek, zacht, zolang het wachtscherm er staat.
//
// Wat er moet gebeuren leest het uit de opslag (de "toestand"). Het
// achtergrondscript stuurt het venster steeds naar de juiste pagina: een
// nummer, de achtergrondmuziek of een lege rustpagina.
//
// Waar de video in de pagina zit, weet youtube/youtube-kiezers.js.

(() => {
  "use strict";

  const MERK = "karaoke-speler";
  const html = document.documentElement;

  // Zit dit tabblad (waarschijnlijk) in het spelervenster? Het
  // achtergrondscript zet het merk achter het # in het adres; binnen hetzelfde
  // tabblad onthouden we het daarna. Dit moet METEEN bekend zijn, zodat de
  // pagina donker is voordat YouTube iets tekent.
  let misschien = false;
  try {
    misschien = location.hash.includes(MERK) || sessionStorage.getItem(MERK) === "1";
  } catch {
    misschien = location.hash.includes(MERK);
  }
  if (!misschien || window.top !== window) return;

  // Welke rol heeft deze pagina? Het achtergrondscript zet dat in het adres:
  // "nummer" (er wordt gezongen), "muziek" (achtergrondmuziek) of "rust".
  // We onthouden het hier, want binnen een afspeellijst verandert YouTube het
  // adres zonder de pagina opnieuw te laden.
  const ROL = /karaoke-speler-(nummer|muziek|rust)/.exec(location.hash)?.[1] ?? "";

  html.classList.add("sks-speler");
  globalThis.karaokeIsSpeler = true;

  const YouTube = globalThis.karaokeYouTube;
  const scherm = globalThis.karaokeWachtscherm;

  let toestand = null; // de toestand uit de opslag
  let logo = null; // eigen logo (data-adres) of null
  let video = null; // de video in deze pagina
  let nummerGestart = false; // hebben wij de video van dit nummer al gestart?
  let gemeldBegonnen = false;
  let gemeldAfgelopen = false;
  let gemeldProbleem = "";
  let gemeldMuziek = null;
  let laatsteVoortgang = 0;
  let laatstePositie = 0;
  let laatstePoging = 0; // wanneer we voor het laatst probeerden af te spelen
  let geladenOp = Date.now();

  // --- Praten met het achtergrondscript -------------------------------------------

  async function stuur(bericht) {
    try {
      return await browser.runtime.sendMessage(bericht);
    } catch {
      return undefined; // de extensie is net herladen; niets aan te doen
    }
  }

  function meld(gebeurtenis, gegevens = {}) {
    return stuur({ soort: "speler-meldt", gebeurtenis, gegevens });
  }

  function meldProbleem(code) {
    if (gemeldProbleem === code) return;
    gemeldProbleem = code;
    meld("probleem", { code });
  }

  // --- De video ----------------------------------------------------------------------

  // De video-ID van deze pagina (verandert vanzelf mee in een afspeellijst).
  const paginaVideo = () => YouTube.videoIdVanPagina();

  // Is deze pagina de pagina van het nummer dat nu bezig is?
  function isNummerpagina() {
    return ROL !== "muziek" && Boolean(toestand?.nuBezig) && paginaVideo() === toestand.nuBezig.videoId;
  }

  // Is deze pagina de pagina van de achtergrondmuziek? (En dus niet de pagina
  // van een nummer dat net is afgelopen.)
  function isMuziekpagina() {
    return ROL === "muziek" && Boolean(paginaVideo());
  }

  // Laat de video het hele scherm vullen: de video en elk vak waar hij in
  // zit krijgen het kenmerk "sks-pad"; de opmaak staat in youtube-pagina.css.
  function vulScherm() {
    if (!video) return;
    let veranderd = !html.classList.contains("sks-toont-video");
    for (let vak = video; vak && vak !== html; vak = vak.parentElement) {
      if (!vak.classList.contains("sks-pad")) {
        vak.classList.add("sks-pad");
        veranderd = true;
      }
    }
    html.classList.add("sks-toont-video");
    // YouTube's speler laten merken dat hij nu groter is (voor de beeldkwaliteit).
    if (veranderd) window.dispatchEvent(new Event("resize"));
  }

  function toonWachtlaag() {
    html.classList.remove("sks-toont-video");
  }

  async function speelAf() {
    laatstePoging = Date.now();
    try {
      await video.play();
      // Het afspelen is gelukt: een eerder gemeld probleem is opgelost.
      if (toestand?.speler.probleem === "autoplay") {
        gemeldProbleem = "";
        meld("probleem", { code: "" });
      }
      return true;
    } catch (fout) {
      // Firefox blokkeert automatisch afspelen met geluid.
      if (fout?.name === "NotAllowedError") meldProbleem("autoplay");
      return false;
    }
  }

  function zetVolume(waarde) {
    if (!video) return;
    if (video.muted) video.muted = false;
    if (Math.abs(video.volume - waarde) > 0.01) video.volume = waarde;
  }

  // Luistert naar de video: pauze, verder, afgelopen.
  function koppelVideo(nieuw) {
    if (nieuw === video) return;
    video = nieuw;
    if (!video) return;

    video.addEventListener("ended", () => {
      if (YouTube.reclameBezig()) return; // dat was het einde van een reclame
      if (isNummerpagina() && nummerGestart) nummerAfgelopen();
      else if (isMuziekpagina() && !toestand?.nuBezig) muziekAfgelopen();
    });
    video.addEventListener("pause", () => {
      // Even wachten: bij "afgelopen" en bij reclame komt er ook een pauze voorbij.
      setTimeout(() => {
        if (!video.paused || video.ended || YouTube.reclameBezig()) return;
        if (isNummerpagina() && gemeldBegonnen && toestand.speler.fase === "speelt") meld("gepauzeerd");
      }, 250);
    });
    video.addEventListener("playing", () => {
      if (isNummerpagina() && gemeldBegonnen && toestand.speler.fase === "gepauzeerd") meld("verder");
    });
  }

  function nummerAfgelopen() {
    if (gemeldAfgelopen) return;
    gemeldAfgelopen = true;
    video?.pause(); // YouTube mag zelf geen volgende video starten
    toonWachtlaag();
    meld("afgelopen");
  }

  // --- Een nummer: aftellen en afspelen ---------------------------------------------------

  function tikNummer(nu) {
    const { speler, nuBezig, wachtrij, instellingen } = toestand;
    koppelVideo(YouTube.hoofdvideo());
    const reclame = YouTube.reclameBezig();

    // 1. Aftellen: de video ligt klaar maar speelt nog niet.
    const resterend = Math.ceil((speler.aftellenTot - nu) / 1000);
    if (!nummerGestart && speler.fase === "aftellen" && resterend > 0) {
      if (video && !video.paused) video.pause();
      toonWachtlaag();
      scherm.teken({
        nummer: nuBezig,
        daarna: wachtrij,
        feestnaam: instellingen.feestnaam,
        logo,
        aftelgetal: instellingen.aftellen ? resterend : null,
      });
      return;
    }

    // 2. Starten: zodra de video er is.
    if (!nummerGestart) {
      const klaar = video && video.readyState >= 2;
      if (!klaar) {
        toonWachtlaag();
        scherm.teken({ nummer: nuBezig, daarna: wachtrij, feestnaam: instellingen.feestnaam, logo, bezig: "Daar gaan we…" });
        // Na 12 seconden nog niets? Dan is er iets mis.
        if (nu - Math.max(geladenOp, speler.aftellenTot) > 12000) {
          meldProbleem(YouTube.cookievraagOpen() ? "cookies" : "start");
        }
        return;
      }
      nummerGestart = true;
      if (speler.fase === "gepauzeerd") {
        // De pagina is opnieuw geladen terwijl het nummer op pauze stond.
        gemeldBegonnen = true;
      } else {
        if (!reclame && video.currentTime > 2) video.currentTime = 0; // altijd bij het begin beginnen
        zetVolume(1);
        speelAf();
      }
    }

    // 3. De video is te zien, schermvullend.
    vulScherm();
    scherm.verberg();
    if (reclame) {
      // YouTube speelt eerst reclame. Het nummer begint daarna vanzelf.
      if (!gemeldBegonnen) meldProbleem("reclame");
      return;
    }

    zetVolume(1);

    if (!gemeldBegonnen && !video.paused && video.currentTime > 0) {
      gemeldBegonnen = true;
      meld("begonnen");
    }
    // De video zou moeten spelen maar staat stil (en wij hebben hem niet gepauzeerd).
    // Dan proberen we het om de paar seconden opnieuw.
    if (!gemeldBegonnen && video.paused && speler.fase !== "gepauzeerd" && nu - laatstePoging > 3000) {
      speelAf();
    }

    // Vangnet: soms komt het "afgelopen"-signaal van de video niet door.
    if (gemeldBegonnen && video.ended) nummerAfgelopen();

    // Elke seconde de tijd doorgeven aan de zijbalk.
    if (gemeldBegonnen && nu - laatsteVoortgang >= 1000 && Number.isFinite(video.duration)) {
      laatsteVoortgang = nu;
      stuur({ soort: "voortgang", videoId: nuBezig.videoId, positie: video.currentTime, duur: video.duration });
    }
  }

  // --- Het wachtscherm, met of zonder achtergrondmuziek ---------------------------------------

  function muziekAfgelopen() {
    // Een losse video begint opnieuw. In een afspeellijst gaat YouTube zelf
    // door naar de volgende video.
    const inLijst = new URLSearchParams(location.search).has("list");
    if (!inLijst && video && toestand?.instellingen.achtergrondmuziek) {
      video.currentTime = 0;
      speelAf();
    }
  }

  function meldMuziek(speelt) {
    if (gemeldMuziek === speelt) return;
    gemeldMuziek = speelt;
    meld("muziek", { speelt });
  }

  function tikWacht(nu) {
    const { speler, nuBezig, wachtrij, instellingen } = toestand;
    toonWachtlaag();
    koppelVideo(YouTube.hoofdvideo());

    // Er is op Start gedrukt, maar het venster is nog niet op de pagina van
    // het nummer: het aftellen begint hier alvast en de muziek stopt.
    const startBezig = Boolean(nuBezig) && !gemeldAfgelopen;
    const resterend = Math.ceil((speler.aftellenTot - nu) / 1000);

    const muziekAan = !startBezig && instellingen.achtergrondmuziek && isMuziekpagina();
    if (video) {
      if (muziekAan) {
        // Het volume geldt ook voor reclame die YouTube tussendoor laat horen.
        zetVolume(instellingen.muziekVolume / 100);
        if (video.paused && !video.ended && nu - laatstePoging > 3000) speelAf();
        // Onthouden waar de muziek is, om straks verder te kunnen gaan.
        if (!video.paused && !YouTube.reclameBezig() && nu - laatstePositie >= 5000) {
          laatstePositie = nu;
          meld("muziek-positie", { videoId: paginaVideo(), tijd: video.currentTime });
        }
      } else if (!muziekAan && !video.paused) {
        video.pause();
      }
    }
    const muziekSpeelt = Boolean(muziekAan && video && !video.paused && !video.muted && video.currentTime > 0);
    meldMuziek(muziekSpeelt);

    // De muziek zou moeten spelen, maar er gebeurt niets.
    if (muziekAan && !muziekSpeelt && nu - geladenOp > 12000 && YouTube.cookievraagOpen()) {
      meldProbleem("cookies");
    }

    html.classList.toggle("sks-plaatsen", !speler.vastgezet);
    scherm.teken({
      nummer: startBezig ? nuBezig : (wachtrij[0] ?? null),
      daarna: startBezig ? wachtrij : wachtrij.slice(1),
      feestnaam: instellingen.feestnaam,
      logo,
      muziek: muziekSpeelt,
      aftelgetal: startBezig && instellingen.aftellen && resterend > 0 ? resterend : null,
      bezig: startBezig && resterend <= 0 ? "Daar gaan we…" : "",
      plaatsen: !speler.vastgezet,
    });
  }

  // --- De klok: vier keer per seconde kijken wat er moet gebeuren ----------------------------

  function tik() {
    if (!toestand) return;
    const nu = Date.now();
    if (isNummerpagina() && !gemeldAfgelopen) {
      html.classList.toggle("sks-plaatsen", false);
      tikNummer(nu);
    } else {
      tikWacht(nu);
    }
  }

  // --- Opdrachten van het achtergrondscript (pauze, verder) -----------------------------------

  browser.runtime.onMessage.addListener((bericht) => {
    if (bericht?.soort !== "speler-opdracht" || !globalThis.karaokeIsSpeler) return undefined;
    if (bericht.opdracht === "pauze") video?.pause();
    if (bericht.opdracht === "verder" && video) speelAf();
    return Promise.resolve({ gelukt: Boolean(video) });
  });

  // --- Start ------------------------------------------------------------------------------------

  async function begin() {
    const antwoord = await stuur({ soort: "speler-aanmelden" });
    if (!antwoord?.isSpeler) {
      // Toch niet het spelervenster (bijvoorbeeld een gekopieerd adres): alles terugdraaien.
      html.classList.remove("sks-speler", "sks-toont-video", "sks-plaatsen");
      globalThis.karaokeIsSpeler = false;
      try {
        sessionStorage.removeItem(MERK);
      } catch {
        // geen opslag beschikbaar
      }
      return;
    }
    try {
      sessionStorage.setItem(MERK, "1");
    } catch {
      // geen opslag beschikbaar
    }

    const opslag = await browser.storage.local.get(["toestand", "logo"]);
    toestand = opslag.toestand ?? null;
    logo = opslag.logo ?? null;

    browser.storage.onChanged.addListener((wijzigingen, gebied) => {
      if (gebied !== "local") return;
      if (wijzigingen.toestand) toestand = wijzigingen.toestand.newValue ?? null;
      if (wijzigingen.logo) logo = wijzigingen.logo.newValue ?? null;
      tik();
    });

    scherm.bijVastzetten(() => meld("vastzetten"));

    // Meteen reageren als de video begint te spelen of het volume verandert,
    // en niet pas bij de volgende tik van de klok. Zo hoor je nooit een flard
    // geluid op het verkeerde moment of op het verkeerde volume.
    for (const soort of ["play", "playing", "volumechange", "loadedmetadata"]) {
      document.addEventListener(soort, tik, true);
    }

    geladenOp = Date.now();
    setInterval(tik, 250);
    tik();
  }

  begin();
})();
