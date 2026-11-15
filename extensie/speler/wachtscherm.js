// Het wachtscherm: wat het publiek op het tweede scherm ziet tussen de nummers.
//
// VOLGENDE, de artiest, de titel, "Gevraagd door", de lijst "Daarna", de
// feestnaam en tijdens het aftellen een roze cirkel met het getal.
//
// Dit script tekent alleen. Wanneer het wachtscherm te zien is en wat erop
// staat, bepaalt speler.js. Het wachtscherm ligt als een laag over de
// YouTube-pagina in het spelervenster, in een afgeschermd stukje van de
// pagina (een "shadow root"), net als de pop-up.
//
// Gebruik vanuit speler.js:
//     karaokeWachtscherm.teken({ nummer, daarna, feestnaam, logo, stand, ... })

(() => {
  "use strict";

  if (globalThis.karaokeWachtscherm) return;

  let gastheer = null;
  let deel = null;
  let bijVastzetten = () => {};
  let laatstGetekend = ""; // om niet vier keer per seconde hetzelfde te tekenen

  function maak(soort, eigenschappen = {}, ...kinderen) {
    const element = document.createElement(soort);
    for (const [naam, waarde] of Object.entries(eigenschappen)) {
      if (naam === "tekst") element.textContent = waarde;
      else element.setAttribute(naam, waarde);
    }
    element.append(...kinderen);
    return element;
  }

  function bouw() {
    gastheer = maak("div", { id: "seans-karaoke-wachtscherm" });
    const wortel = gastheer.attachShadow({ mode: "closed" });

    const stijlen = ["gedeeld/huisstijl.css", "speler/wachtscherm.css"].map((pad) =>
      maak("link", { rel: "stylesheet", href: browser.runtime.getURL(pad) }),
    );

    // --- Bovenaan: logo links, feestnaam rechts ---
    const feestLogo = maak("img", { class: "feest__logo", alt: "", hidden: "" });
    const feestNaam = maak("span", { class: "feest__naam" });
    const kop = maak(
      "header",
      { class: "scherm__kop" },
      maak(
        "div",
        { class: "logo scherm__logo" },
        maak("span", { class: "logo__naam", tekst: "Sean's" }),
        maak("span", { class: "logo__show", tekst: "Karaoke Show" }),
      ),
      maak("div", { class: "feest" }, feestLogo, feestNaam),
    );

    // --- Links: het volgende nummer ---
    const artiest = maak("p", { class: "volgende__artiest" });
    const titel = maak("h1", { class: "volgende__titel" });
    const naam = maak("p", { class: "volgende__naam" });
    const door = maak("div", { class: "volgende__door" }, maak("p", { class: "volgende__label", tekst: "Gevraagd door" }), naam);
    const volgende = maak(
      "section",
      { class: "volgende" },
      maak("p", { class: "volgende__woord", tekst: "Volgende" }),
      artiest,
      titel,
      door,
    );

    // --- Rechts: de lijst "Daarna" ---
    const lijst = maak("ol", { class: "daarna__lijst" });
    const daarnaLeeg = maak("p", { class: "daarna__leeg", tekst: "Nog niemand. Vraag je nummer aan!" });
    const daarna = maak("aside", { class: "daarna" }, maak("h2", { class: "daarna__kop", tekst: "Daarna" }), lijst, daarnaLeeg);

    // --- Als de wachtrij leeg is ---
    const leeg = maak(
      "section",
      { class: "leeg", hidden: "" },
      maak("p", { class: "leeg__groot", tekst: "Wie zingt er?" }),
      maak("p", { class: "leeg__klein", tekst: "Vraag je nummer aan!" }),
    );

    // --- Onderaan: muziek links, "maak je klaar" of de aftelcirkel rechts ---
    const muziek = maak("p", { class: "voet__muziek", hidden: "" }, maak("span", { class: "voet__noot", tekst: "♪" }), " Achtergrondmuziek speelt");
    const klaar = maak("p", { class: "voet__klaar", hidden: "" });
    const getal = maak("span", { class: "aftel__getal" });
    const aftel = maak("div", { class: "aftel", hidden: "" }, getal);
    const voet = maak("footer", { class: "scherm__voet" }, muziek, klaar, aftel);

    // --- Het venster is nog niet geplaatst ---
    const knop = maak("button", { type: "button", class: "knop knop--hoofd plaatsen__knop", tekst: "Dit scherm gebruiken" });
    const plaatsen = maak(
      "section",
      { class: "plaatsen", hidden: "" },
      maak("p", { class: "plaatsen__kop", tekst: "Sleep dit venster naar het tweede scherm" }),
      maak("p", { class: "plaatsen__tekst", tekst: "Staat het op de tv, beamer of monitor? Klik dan op de knop. Het venster wordt schermvullend en onthoudt deze plek." }),
      knop,
    );
    knop.addEventListener("click", () => bijVastzetten());

    const scherm = maak(
      "div",
      { class: "scherm" },
      maak("div", { class: "scherm__gloed", "aria-hidden": "true" }),
      kop,
      maak("main", { class: "scherm__midden" }, volgende, daarna),
      leeg,
      voet,
      plaatsen,
    );

    wortel.append(...stijlen, scherm);
    deel = { scherm, feestLogo, feestNaam, volgende, artiest, titel, door, naam, daarna, lijst, daarnaLeeg, leeg, muziek, klaar, aftel, getal, plaatsen };

    // Pas tonen als de opmaak geladen is, anders zie je heel even kale tekst.
    scherm.style.visibility = "hidden";
    let geladen = 0;
    const toon = () => {
      scherm.style.removeProperty("visibility");
      pasTekstAan();
    };
    for (const stijl of stijlen) {
      stijl.addEventListener("load", () => ++geladen === stijlen.length && toon());
      stijl.addEventListener("error", toon);
    }
    setTimeout(toon, 1500);

    document.documentElement.append(gastheer);
    window.addEventListener("resize", pasTekstAan);
    document.fonts?.ready.then(pasTekstAan);
    document.fonts?.addEventListener?.("loadingdone", pasTekstAan);
  }

  // --- Lange teksten passend maken ---------------------------------------------------
  //
  // Een lange titel of naam mag niet buiten beeld vallen. We maken de letters
  // stap voor stap kleiner tot de tekst past.

  function pasEen(element, kleinste = 0.35) {
    element.style.removeProperty("--krimp");
    let krimp = 1;
    // Past de tekst niet in de breedte of in de hoogte? Dan iets kleiner.
    // Grote letters steken altijd een klein beetje boven en onder hun regel
    // uit; dat beetje (een kwart van de lettergrootte) telt niet als "past niet".
    const pastNiet = () => {
      const speling = parseFloat(getComputedStyle(element).fontSize) * 0.25;
      return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + speling;
    };
    while (krimp > kleinste && pastNiet()) {
      krimp -= 0.05;
      element.style.setProperty("--krimp", krimp.toFixed(2));
    }
  }

  function pasTekstAan() {
    if (!deel || deel.scherm.hidden) return;
    pasEen(deel.titel);
    pasEen(deel.artiest);
    pasEen(deel.naam);
    pasEen(deel.feestNaam);
  }

  // --- Tekenen -------------------------------------------------------------------------

  // Eén regel in "Daarna": de titel, en daaronder de naam met de artiest erachter.
  function regel(nummer, plek) {
    const wie = maak("span", { class: nummer.aanvrager ? "naam" : "naam naam--geen", tekst: nummer.aanvrager || "Geen naam" });
    const onder = maak("span", { class: "daarna__onder" }, wie);
    if (nummer.artiest) onder.append(maak("span", { class: "daarna__artiest", tekst: ` · ${nummer.artiest}` }));
    return maak(
      "li",
      { class: "daarna__regel" },
      maak("span", { class: "daarna__nummer", tekst: String(plek) }),
      maak("div", { class: "daarna__tekst" }, maak("span", { class: "daarna__titel", tekst: nummer.titel }), onder),
    );
  }

  // Tekent het wachtscherm.
  //   nummer     het nummer dat als VOLGENDE groot in beeld staat (of null)
  //   daarna     de nummers daarna (hooguit 4 worden getoond)
  //   feestnaam  de naam van het feest
  //   logo       eigen logo als data-adres, of null
  //   muziek     true als de achtergrondmuziek speelt
  //   aftelgetal 5, 4, 3, 2, 1 tijdens het aftellen; anders null
  //   bezig      een korte tekst rechtsonder ("Daar gaan we…"), of ""
  //   plaatsen   true als het venster nog naar het tweede scherm moet
  function teken({ nummer, daarna = [], feestnaam = "", logo = null, muziek = false, aftelgetal = null, bezig = "", plaatsen = false }) {
    if (!gastheer) bouw();

    // Is er niets veranderd sinds de vorige keer? Dan hoeft er niets te gebeuren.
    const sleutel = JSON.stringify([nummer, daarna.slice(0, 4), feestnaam, logo?.length ?? 0, muziek, aftelgetal, bezig, plaatsen]);
    if (sleutel === laatstGetekend && !deel.scherm.hidden) return;
    laatstGetekend = sleutel;
    deel.scherm.hidden = false;

    deel.feestNaam.textContent = feestnaam;
    if (logo) {
      if (deel.feestLogo.src !== logo) deel.feestLogo.src = logo;
      deel.feestLogo.hidden = false;
    } else {
      deel.feestLogo.hidden = true;
      deel.feestLogo.removeAttribute("src");
    }

    const isEr = Boolean(nummer);
    deel.volgende.hidden = !isEr;
    deel.daarna.hidden = !isEr;
    deel.leeg.hidden = isEr;

    if (isEr) {
      deel.artiest.textContent = nummer.artiest;
      deel.artiest.hidden = !nummer.artiest;
      deel.titel.textContent = nummer.titel;
      deel.naam.textContent = nummer.aanvrager;
      deel.door.hidden = !nummer.aanvrager;

      const eerste = daarna.slice(0, 4);
      deel.lijst.replaceChildren(...eerste.map((volgend, index) => regel(volgend, index + 1)));
      deel.daarnaLeeg.hidden = eerste.length > 0;
    }

    deel.muziek.hidden = !muziek;

    const teltAf = aftelgetal !== null;
    deel.aftel.hidden = !teltAf;
    if (teltAf && deel.getal.textContent !== String(aftelgetal)) {
      deel.getal.textContent = String(aftelgetal);
      // De cirkel "klopt" bij elk nieuw getal.
      deel.aftel.classList.remove("aftel--tik");
      void deel.aftel.offsetWidth;
      deel.aftel.classList.add("aftel--tik");
    }

    const klaarTekst = teltAf ? "" : bezig || (isEr && nummer.aanvrager ? `${nummer.aanvrager}, maak je klaar!` : "");
    deel.klaar.textContent = klaarTekst;
    deel.klaar.hidden = !klaarTekst;

    deel.plaatsen.hidden = !plaatsen;
    deel.scherm.classList.toggle("scherm--plaatsen", plaatsen);

    pasTekstAan();
  }

  function verberg() {
    if (deel) deel.scherm.hidden = true;
  }

  globalThis.karaokeWachtscherm = {
    teken,
    verberg,
    zichtbaar: () => Boolean(deel) && !deel.scherm.hidden,
    bijVastzetten: (functie) => {
      bijVastzetten = functie;
    },
  };
})();
