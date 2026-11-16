// Stuurt de extensie naar Mozilla om te laten ondertekenen ("unlisted":
// hij komt niet in de winkel). Het ondertekende bestand (.xpi) komt daarna in
// de map pakketten/.
//
// Gebruik:  npm.cmd run onderteken        (op macOS en Linux: npm run onderteken)
//
// De twee sleutels van Mozilla leest dit script uit het bestand .env. Ze
// worden nergens getoond en komen niet op GitHub.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectmap = fileURLToPath(new URL("..", import.meta.url));
const envBestand = fileURLToPath(new URL("../.env", import.meta.url));
const webExt = fileURLToPath(new URL("../node_modules/web-ext/bin/web-ext.js", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("../extensie/manifest.json", import.meta.url), "utf8"));

function stop(tekst) {
  console.error(`\n${tekst}\n`);
  process.exit(1);
}

// --- 1. Zijn de sleutels er? ----------------------------------------------------

if (!existsSync(envBestand)) {
  stop(
    "Het bestand .env ontbreekt.\n" +
      "Maak een kopie van .env.voorbeeld, noem die .env en vul je twee sleutels van Mozilla in.\n" +
      'De uitleg staat in README.md onder "Ondertekenen bij Mozilla".',
  );
}

process.loadEnvFile(envBestand);

for (const [naam, uitleg] of [
  ["WEB_EXT_API_KEY", "de JWT issuer"],
  ["WEB_EXT_API_SECRET", "de JWT secret"],
]) {
  if (!process.env[naam]?.trim()) {
    stop(`In .env is ${naam} (${uitleg}) nog leeg. Vul hem in en probeer het opnieuw.`);
  }
}

// --- 2. Eerst zelf controleren --------------------------------------------------

function draaiWebExt(argumenten) {
  return spawnSync(process.execPath, [webExt, ...argumenten], { cwd: projectmap, stdio: "inherit" });
}

console.log(`\nSean's Karaoke Show, versie ${manifest.version}`);
console.log("Stap 1 van 2: de extensie controleren op fouten...\n");

if (draaiWebExt(["lint"]).status !== 0) {
  stop("De controle geeft fouten. Er is niets naar Mozilla gestuurd. Los de fouten eerst op.");
}

// --- 3. Naar Mozilla sturen ------------------------------------------------------

console.log("\nStap 2 van 2: de extensie naar Mozilla sturen en wachten op de handtekening.");
console.log("Dit duurt meestal een paar minuten. Laat dit venster open staan.\n");

const uitkomst = draaiWebExt(["sign", "--channel", "unlisted"]);

if (uitkomst.status !== 0) {
  stop(
    "Het ondertekenen is niet gelukt. Lees de melding hierboven.\n" +
      "Veelvoorkomende oorzaken:\n" +
      `  - Versie ${manifest.version} is al eens ingestuurd. Elke inzending heeft een nieuw versienummer nodig.\n` +
      "  - Een sleutel in .env klopt niet (let op spaties en ontbrekende tekens).\n" +
      "  - Mozilla is nog bezig. Kijk dan later op addons.mozilla.org bij je extensies;\n" +
      "    daar kun je het ondertekende bestand ook downloaden.",
  );
}

console.log("\nGelukt! Het ondertekende bestand (.xpi) staat in de map pakketten.");
console.log("Sleep dat bestand in Firefox en klik op Toevoegen.\n");
