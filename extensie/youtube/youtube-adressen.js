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

// --- Het spelervenster ----------------------------------------------------------

// Aan dit woord achter het # in het adres herkent ons script in de pagina
// meteen (nog vóór YouTube iets tekent) dat het in het spelervenster zit.
export const SPELERMERK = "karaoke-speler";

// Een heel lichte pagina van YouTube (alleen een stukje tekst). Hier staat
// het spelervenster op als er geen video nodig is: het wachtscherm ligt
// eroverheen en er laadt verder niets.
const RUSTPAGINA = "https://www.youtube.com/robots.txt";

// Plakt het spelermerk achter een adres, met erbij welke rol de pagina heeft:
// "nummer" (er wordt gezongen), "muziek" (achtergrondmuziek) of "rust".
// Het tijdstip zorgt dat Firefox de pagina ook echt opnieuw laadt als het
// adres verder hetzelfde is.
function metMerk(adres, rol, nu = Date.now()) {
  return `${adres}#${SPELERMERK}-${rol}-${nu}`;
}

// Het adres waarop een nummer in het spelervenster wordt afgespeeld.
export function speleradres(videoId, nu) {
  return metMerk(kijkadres(videoId), "nummer", nu);
}

// Het adres voor het wachtscherm zonder achtergrondmuziek.
export function rustadres(nu) {
  return metMerk(RUSTPAGINA, "rust", nu);
}

// --- Achtergrondmuziek -------------------------------------------------------------

// Een ID van een afspeellijst: letters, cijfers, - en _.
const LIJST_ID = /^[A-Za-z0-9_-]{10,80}$/;

// Haalt uit een YouTube-link de video en/of de afspeellijst.
//
//   https://www.youtube.com/watch?v=VIDEO              →  { videoId: "VIDEO", lijstId: null }
//   https://www.youtube.com/watch?v=VIDEO&list=LIJST   →  { videoId: "VIDEO", lijstId: "LIJST" }
//   https://www.youtube.com/playlist?list=LIJST        →  { videoId: null, lijstId: "LIJST" }
//
// Geeft null als de link geen video en geen afspeellijst is.
export function muziekUit(adres) {
  const videoId = videoIdUit(adres);
  let lijstId = null;
  try {
    const link = new URL(adres);
    const host = link.hostname.toLowerCase();
    const isYouTube = host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
    const kandidaat = link.searchParams.get("list");
    if (isYouTube && kandidaat && LIJST_ID.test(kandidaat)) lijstId = kandidaat;
  } catch {
    return null;
  }
  return videoId || lijstId ? { videoId, lijstId } : null;
}

// Het adres waarop de achtergrondmuziek in het spelervenster speelt.
// "hervat" is waar de muziek de vorige keer was gebleven: { videoId, tijd }.
export function muziekadres({ videoId, lijstId }, hervat = null, nu) {
  const video = hervat?.videoId ?? videoId;
  if (!video) {
    // Alleen een afspeellijst: YouTube kiest zelf de eerste video.
    return metMerk(`https://www.youtube.com/playlist?list=${lijstId}&playnext=1`, "muziek", nu);
  }
  const delen = [`v=${video}`];
  if (lijstId) delen.push(`list=${lijstId}`);
  if (hervat?.tijd > 0) delen.push(`t=${Math.floor(hervat.tijd)}s`);
  return metMerk(`https://www.youtube.com/watch?${delen.join("&")}`, "muziek", nu);
}
