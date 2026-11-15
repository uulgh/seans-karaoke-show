// Zet een YouTube-video in de wachtrij.

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

// Zet de video van deze link achteraan in de wachtrij.
// Geeft het nieuwe nummer terug, of null als het geen videolink was.
export async function voegVideoToe({ adres, linkTekst = "" }) {
  const videoId = videoIdUit(adres);
  if (!videoId) {
    await zetMelding("Dit is geen link naar een YouTube-video.", "fout");
    return null;
  }

  // Eerst de echte titel bij YouTube opvragen; lukt dat niet, dan de linktekst.
  const videotitel = (await haalVideotitelOp(videoId)) || bruikbareLinktekst(linkTekst);
  const { artiest, titel } = ontleedTitel(videotitel);
  const nummer = maakNummer({ videoId, artiest, titel, aanvrager: "" });

  let stondErAl = false;
  await werkToestandBij((toestand) => {
    stondErAl = staatInWachtrij(toestand, videoId);
    return voegToe(toestand, nummer);
  });

  await zetMelding(
    stondErAl
      ? `Toegevoegd: ${nummer.titel}. Let op: deze video stond al in de wachtrij.`
      : `Toegevoegd: ${nummer.titel}`,
  );
  return nummer;
}
