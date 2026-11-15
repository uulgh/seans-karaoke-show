// Vraagt gegevens over een video op bij YouTube zelf (niet via de pagina).
//
// Nu alleen de titel. We vragen die op via "oEmbed": een openbaar adres van
// YouTube dat de titel teruggeeft zonder inloggen en zonder API-sleutel.

import { oembedAdres } from "./youtube-adressen.js";

// Geeft de titel van de video, of "" als het niet lukt (geen internet,
// privévideo, YouTube antwoordt niet binnen 6 seconden ...).
export async function haalVideotitelOp(videoId) {
  try {
    const antwoord = await fetch(oembedAdres(videoId), {
      credentials: "omit",
      signal: AbortSignal.timeout(6000),
    });
    if (!antwoord.ok) return "";
    const gegevens = await antwoord.json();
    return typeof gegevens.title === "string" ? gegevens.title : "";
  } catch {
    return "";
  }
}
