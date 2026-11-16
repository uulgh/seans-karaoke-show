// Instellingen voor web-ext, het testhulpmiddel van Mozilla.
// Deze gelden voor "npm start", "npm run controle" en "npm run pakket".

import { fileURLToPath } from "node:url";

// Firefox wil het volledige pad naar het testprofiel (bijvoorbeeld
// D:\KaraFox\.testprofiel). Dit rekent dat uit, op welke computer dan ook.
const testprofiel = fileURLToPath(new URL(".testprofiel", import.meta.url));

export default {
  // De map met de extensie zelf.
  sourceDir: "extensie",
  // Hier komen de zip-bestanden van "npm run pakket".
  artifactsDir: "pakketten",

  run: {
    // Een vast testprofiel, zodat de wachtrij, de YouTube-cookiekeuze en
    // straks de autoplay-instelling bewaard blijven tussen twee tests.
    firefoxProfile: testprofiel,
    profileCreateIfMissing: true,
    keepProfileChanges: true,
    // In de test-Firefox mag elke site vanzelf afspelen met geluid. Zo werkt
    // het spelervenster meteen. In een gewone Firefox stel je dit zelf in
    // (zie README, "Automatisch afspelen met geluid").
    pref: ["media.autoplay.default=0"],
    // De test-Firefox opent meteen YouTube met karaokevideo's.
    startUrl: ["https://www.youtube.com/results?search_query=karaoke"],
  },
};
