// Alles wat we weten over YouTube-ADRESSEN (links) staat hier bij elkaar.
//
// Verandert YouTube ooit hoe zijn links eruitzien, dan is dit het enige
// bestand dat aangepast hoeft te worden. Dit bestand gebruikt niets van
// Firefox en is dus los te testen (tests/youtube-adressen.test.js).

// Een video-ID is altijd 11 tekens: letters, cijfers, - en _.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

// Bij deze links verschijnt "Zet in de karaoke-wachtrij" in het rechtsklikmenu.
export const LINKPATRONEN = ["*://*.youtube.com/watch*", "*://youtu.be/*"];

export function isVideoId(waarde) {
  return typeof waarde === "string" && VIDEO_ID.test(waarde);
}

// Haalt de video-ID uit een YouTube-link. Geeft null als het geen videolink is.
//
//   https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=...  →  "dQw4w9WgXcQ"
//   https://youtu.be/dQw4w9WgXcQ?t=10                     →  "dQw4w9WgXcQ"
export function videoIdUit(adres) {
  let link;
  try {
    link = new URL(adres);
  } catch {
    return null;
  }
  if (link.protocol !== "https:" && link.protocol !== "http:") return null;

  const host = link.hostname.toLowerCase();
  let id = null;

  if (host === "youtu.be") {
    id = link.pathname.split("/")[1];
  } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (link.pathname === "/watch") {
      id = link.searchParams.get("v");
    } else {
      // Ook /embed/ID en /live/ID zijn gewone video's. Shorts doen niet mee.
      const [, soort, deel] = link.pathname.split("/");
      if (soort === "embed" || soort === "live") id = deel;
    }
  }

  return isVideoId(id) ? id : null;
}

// De gewone kijkpagina van een video.
export function kijkadres(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Adres waar YouTube de titel van een video teruggeeft (zonder in te loggen
// en zonder API-sleutel). Dit heet "oEmbed".
export function oembedAdres(videoId) {
  return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(kijkadres(videoId))}`;
}
