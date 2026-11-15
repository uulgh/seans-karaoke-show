# Sean's Karaoke Show — afspraken voor Claude

Firefox-extensie (WebExtension, Manifest V3) die van de laptop een
karaoke-regiepaneel maakt en van een tweede scherm een karaokescherm.
Het volledige plan met fases staat in [PLAN.md](PLAN.md).

## Met wie je werkt

Sean heeft **geen programmeerervaring**.

- Leg alles uit in eenvoudig Nederlands, zonder vakjargon (of leg het woord uit).
- Werk in kleine stappen.
- Vertel na elke stap precies hoe Sean kan testen en wat hij dan hoort te zien.

## Werkafspraken

1. **Eén fase per keer.** Laat bij elke nieuwe fase eerst de aanpak zien en
   wacht op akkoord van Sean voordat je bouwt.
2. **Na elke werkende stap:** testuitleg, een commit met een duidelijke
   Nederlandse omschrijving, en een push naar GitHub.
3. **Installeer niets** zonder te zeggen wat het is en waarom.
4. **Nooit wachtwoorden of API-sleutels** in de code of op GitHub. Geheimen
   horen in een `.env`-bestand (staat in `.gitignore`) of in de omgeving.
5. Werk [PLAN.md](PLAN.md) bij als een stap klaar is (⬜ → ✅).
6. Alle tekst in de extensie is **Nederlands**. Ook commentaar in de code en
   namen van mappen en bestanden zijn Nederlands.

## Commando's

| Commando | Wat het doet |
| --- | --- |
| `npm start` | Start een test-Firefox met de extensie erin (`web-ext run`) |
| `npm test` | Draait de automatische tests uit `tests/` (ingebouwd in Node, niets extra's nodig) |
| `npm run controle` | Controleert de extensie op fouten (`web-ext lint`) |
| `npm run pakket` | Maakt een zip van de extensie in `pakketten/` |

Draai `npm test` en `npm run controle` vóór elke commit; er mogen geen fouten zijn.

Code zonder Firefox of YouTube erin (zoals het ontleden van titels en straks
de eerlijke beurtverdeling) staat in een eigen bestand en krijgt tests in
`tests/`. Gaat er op een avond een titel verkeerd, zet hem dan als nieuw geval
in `tests/titel-ontleden.test.js`.

## Mappen

```
extensie/                 ← alles wat Firefox laadt (geen bouwstap)
  manifest.json           ← het "paspoort" van de extensie
  achtergrond/            ← achtergrondscript: de ene waarheid (wachtrij, instellingen)
    achtergrond.js        ←   luisteraars: werkbalkknop, rechtsklikmenu, berichten
    opslag.js             ←   lezen/schrijven van de toestand in storage.local
    toevoegen.js          ←   een YouTube-video in de wachtrij zetten
  zijbalk/                ← het regiepaneel op de laptop
  pop-up/                 ← de pop-up "In de wachtrij zetten" (draait in YouTube-pagina's)
  gedeeld/                ← voor alle schermen: huisstijl.css, lettertypes.css,
                            wachtrij.js (de toestand en de regels), titel-ontleden.js
  lettertypes/            ← Monoton, Rubik, Inter + licenties/
  iconen/                 ← icoon van de extensie
  youtube/                ← ALLE kennis over YouTube: adressen, gegevens opvragen
                            en (vanaf stap 4) de code die in YouTube-pagina's draait
tests/                    ← automatische tests (komen niet in de extensie)
web-ext-config.mjs        ← instellingen van web-ext (o.a. het vaste testprofiel)
.testprofiel/             ← het Firefox-profiel van `npm start` (niet in Git)
ontwerp/                  ← ontwerpafbeeldingen van Sean (optie A, Neonbar)
```

## Technische regels

- **Manifest V3**, vaste Gecko-ID `seans-karaoke-show@karafox`. Die ID mag
  nooit meer veranderen, anders is bewaarde data weg.
- Firefox gebruikt bij MV3 `background.scripts` (geen service worker). Het
  achtergrondscript kan door Firefox worden stilgelegd: bewaar toestand dus
  altijd in `browser.storage.local`, nooit alleen in een variabele.
- **Het achtergrondscript is de enige waarheid.** Alleen het achtergrondscript
  schrijft de toestand (sleutel `toestand` in `storage.local`). Zijbalk en
  spelervenster lezen die sleutel, tekenen opnieuw bij `storage.onChanged` en
  sturen een bericht (`runtime.sendMessage`, veld `soort`) als er iets moet
  veranderen. Ze bewaren zelf niets.
- Korte berichtjes voor de zijbalk ("Toegevoegd: ...") zet het
  achtergrondscript in de sleutel `melding`.
- De achtergrond is een **module** (`"type": "module"`); luisteraars staan
  bovenaan, buiten functies. Code zonder Firefox erin (`gedeeld/wachtrij.js`,
  `gedeeld/titel-ontleden.js`, `youtube/youtube-adressen.js`) werkt met
  toestand-in, nieuwe-toestand-uit en heeft tests.
- **Scripts in YouTube-pagina's** (content scripts) zijn gewone scripts, geen
  modules. Ze delen één afgeschermde wereld en praten met elkaar via een
  globale naam, bijvoorbeeld `karaokePopUp.open({ videoId, titelHint })`.
  Code die ook het achtergrondscript nodig heeft (zoals titel-ontleden) blijft
  in de achtergrond; het pagina-script vraagt het op met een bericht.
- **Alles wat we in een YouTube-pagina tonen** staat in een gesloten shadow
  root, in de "top layer" (`<dialog>.showModal()` of `popover`), en laadt
  `gedeeld/huisstijl.css` via een `<link>`. Die bestanden moeten in
  `web_accessible_resources` staan. `@font-face` werkt niet binnen een shadow
  root; daarom voegt het manifest `gedeeld/lettertypes.css` aan de pagina toe.
- Toetsen die in onze pop-up worden getypt, schermen we af van YouTube's
  sneltoetsen met een `stopImmediatePropagation` op `window` (capture,
  aangemeld bij `document_start`).
- Firefox start niet met een relatief pad naar een profiel; daarom rekent
  `web-ext-config.mjs` het volledige pad uit.
- **YouTube-code staat apart** in `extensie/youtube/`. Kiezers (selectors)
  voor YouTube-elementen staan samen in één bestand, zodat een wijziging bij
  YouTube op één plek te repareren is.
- In het spelervenster de **gewone YouTube-kijkpagina**, geen ingesloten
  speler (embed), want sommige video's mogen niet buiten YouTube spelen.
- Een nieuw venster kan in Firefox niet tegelijk een positie én fullscreen
  krijgen: eerst plaatsen, daarna `windows.update({ state: "fullscreen" })`.
- **Laad niets van internet** (geen CDN's, geen Google Fonts-links).
- Gebruik **geen `innerHTML`** met veranderlijke tekst; bouw elementen met
  `createElement`/`textContent` of een `<template>`. Titels en namen komen van
  YouTube en van gasten en zijn dus niet te vertrouwen.
- Vraag alleen de rechten (permissions) die de fase echt nodig heeft.
- Moet werken op Windows, macOS en Linux.

## Testen in de echte Firefox (voor Claude)

`npm test` en `npm run controle` vangen niet alles. Wat met Firefox of
YouTube zelf te maken heeft, test Claude zo, in een tijdelijke map buiten het
project:

1. Kopieer `extensie/` en voeg aan de kopie een extra achtergrondscript en
   content script toe die de échte functies van de extensie aanroepen (via
   `import` uit de achtergrond) en de uitkomst teruggeven.
2. Start de kopie met `web-ext run --arg=-headless
   --arg=--remote-debugging-port=9333` en een eigen wegwerpprofiel.
3. Bestuur Firefox met WebDriver BiDi over een WebSocket
   (`ws://127.0.0.1:9333/session`, Node heeft `WebSocket` ingebouwd):
   `script.evaluate`, `input.performActions` (echte toetsaanslagen) en
   `browsingContext.captureScreenshot` (schermafbeelding bekijken).
4. Stop daarna alle `firefox.exe` met `-headless` in de opdrachtregel.

Niet na te doen op deze manier: klikken in het rechtsklikmenu van Firefox en
alles met een echt tweede scherm. Zeg dat er eerlijk bij.

## Huisstijl (optie A, Neonbar)

De variabelen staan in `extensie/gedeeld/huisstijl.css`. Gebruik altijd de
variabelen, nooit losse kleurcodes.

| Wat | Waarde |
| --- | --- |
| Achtergrond | `#0C0A1A` |
| Zijbalk | `#120E26` |
| Kaarten | `#1A1536` |
| Randen | `#2C2550` |
| Tekst | `#EDEBFA` |
| Gedempte tekst | `#A39FC2` |
| Neonroze (hoofdaccent, knoppen) | `#FF4FA3`, tekst erop `#1A0614` |
| Neoncyaan (tweede accent) | `#3DDCEB` |

- Roze en cyaan krijgen een subtiele gloed.
- **Monoton**: logo en het neonwoord VOLGENDE. **Rubik** (500, 700, 800):
  koppen. **Inter**: overige tekst.
- Knoppen zijn minstens **44 px** hoog.
- Zijbalk is ontworpen voor ongeveer 420 px breed, maar moet ook smaller werken.
- Wachtscherm is ontworpen voor 1920×1080, maar moet op elke resolutie
  werken; lange titels en namen worden zo nodig kleiner.

## Eerlijke beurtverdeling (fase 4)

Elk verzoek krijgt een rondenummer = het hoeveelste nummer van die aanvrager
(gezongen + wachtend). Sorteer op ronde, daarbinnen op volgorde van aanvragen.
Namen vergelijken zonder hoofdlettergevoeligheid; geen naam = "Iedereen".
Zelf verplaatste nummers krijgen het label "zelf verplaatst" en blijven staan.
Test: Lisa 3 nummers, daarna Tom 1 → Lisa, Tom, Lisa, Lisa.
