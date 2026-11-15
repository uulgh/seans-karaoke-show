// Zet een YouTube-video in de wachtrij.
//
// De gewone weg:  rechtsklik of knop op YouTube  →  pop-up  →  wachtrij.
// De reserveweg:  kan de pop-up niet open (de link stond bijvoorbeeld niet op
// een YouTube-pagina), dan gaat het nummer meteen in de wachtrij, zonder naam.

import { ontleedTitel } from "../gedeeld/titel-ontleden.js";
import { maakNummer, staatInWachtrij, voegToe } from "../gedeeld/wachtrij.js";
import { videoIdUit } from "../youtube/youtube-adressen.js";
import { haalVideotitelOp } from "../youtube/youtube-gegevens.js";
import { werkToestandBij, zetMelding } from "./opslag.js";

// De tekst van de link waarop is geklikt is soms de titel, maar soms ook
// alleen de speelduur ("3:35") of een hele lap tekst. Alleen bruikbaar als
// het op een titel lijkt.
function bruikbareLinktekst(linkTekst) {
  const tekst = String(linkTekst ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const isSpeelduur = /^\d{1,2}(:\d{2}){1,2}$/.test(tekst);
  return tekst.length >= 3 && tekst.length <= 150 && !isSpeelduur ? tekst : "";
}

// Zoekt de titel van een video op en splitst hem in artiest en titel.
// Eerst vragen we de echte titel bij YouTube op; lukt dat niet, dan gebruiken
// we de hint (de tekst van de link waarop is geklikt).
export async function zoekVideogegevens(videoId, titelHint = "") {
  const videotitel = (await haalVideotitelOp(videoId)) || bruikbareLinktekst(titelHint);
  return { videotitel, ...ontleedTitel(videotitel) };
}

// Zet een nummer achteraan in de wachtrij en toont een melding in de zijbalk.
// gegevens = { videoId, artiest, titel, aanvrager }
export async function voegNummerToe(gegevens) {
  const nummer = maakNummer(gegevens);

  let stondErAl = false;
  await werkToestandBij((toestand) => {
    stondErAl = staatInWachtrij(toestand, nummer.videoId);
    return voegToe(toestand, nummer);
  });

  const wie = nummer.aanvrager ? ` (${nummer.aanvrager})` : "";
  await zetMelding(
    stondErAl
      ? `Toegevoegd: ${nummer.titel}${wie}. Let op: deze video stond al in de wachtrij.`
      : `Toegevoegd: ${nummer.titel}${wie}`,
  );
  return { nummer, stondErAl };
}

// De reserveweg: meteen toevoegen, zonder pop-up en dus zonder naam.
// Geeft het nieuwe nummer terug, of null als het geen videolink was.
export async function voegVideoToe({ adres, linkTekst = "" }) {
  const videoId = videoIdUit(adres);
  if (!videoId) {
    await zetMelding("Dit is geen link naar een YouTube-video.", "fout");
    return null;
  }
  const { artiest, titel } = await zoekVideogegevens(videoId, linkTekst);
  const { nummer } = await voegNummerToe({ videoId, artiest, titel, aanvrager: "" });
  return nummer;
}

// Opent de pop-up "In de wachtrij zetten" in het tabblad waar is geklikt.
// Lukt dat niet, dan nemen we de reserveweg.
// Geeft "pop-up", "direct" of "geen-video" terug.
export async function openPopUpOfVoegToe({ adres, linkTekst = "", tabId }) {
  const videoId = videoIdUit(adres);
  if (!videoId) {
    await zetMelding("Dit is geen link naar een YouTube-video.", "fout");
    return "geen-video";
  }

  try {
    const antwoord = await browser.tabs.sendMessage(
      tabId,
      { soort: "pop-up-openen", videoId, titelHint: bruikbareLinktekst(linkTekst) },
      { frameId: 0 },
    );
    if (antwoord?.geopend) return "pop-up";
  } catch {
    // Er luistert niemand in dat tabblad (het is geen YouTube-pagina).
  }

  await voegVideoToe({ adres, linkTekst });
  return "direct";
}
