// Bewaart de toestand (wachtrij en instellingen) op de computer, zodat alles
// er nog staat als Firefox opnieuw start.
//
// Firefox mag het achtergrondscript stilleggen als het even niets te doen
// heeft. Daarom onthouden we hier niets in een variabele: elke wijziging
// leest eerst de opslag, verandert de toestand en schrijft hem weer weg.

import { herstel } from "../gedeeld/wachtrij.js";

const SLEUTEL_TOESTAND = "toestand";
const SLEUTEL_MELDING = "melding";

export async function leesToestand() {
  const opgeslagen = await browser.storage.local.get(SLEUTEL_TOESTAND);
  return herstel(opgeslagen[SLEUTEL_TOESTAND]);
}

// Wijzigingen gaan netjes één voor één, in de volgorde waarin ze binnenkomen.
// Anders kunnen twee wijzigingen tegelijk elkaars werk overschrijven.
let rij = Promise.resolve();

// Verandert de toestand. "wijzig" krijgt de huidige toestand en geeft de
// nieuwe terug. Voorbeeld:  werkToestandBij((t) => verwijder(t, id))
export function werkToestandBij(wijzig) {
  const klaar = rij.then(async () => {
    const oud = await leesToestand();
    const nieuw = wijzig(oud);
    await browser.storage.local.set({ [SLEUTEL_TOESTAND]: nieuw });
    return nieuw;
  });
  rij = klaar.catch(() => {}); // een mislukte wijziging houdt de volgende niet tegen
  return klaar;
}

// Laat een kort berichtje zien in de zijbalk, zoals "Toegevoegd: Mamma Mia".
// soort is "info" of "fout".
export function zetMelding(tekst, soort = "info") {
  return browser.storage.local.set({ [SLEUTEL_MELDING]: { tekst, soort, tijd: Date.now() } });
}
