# Sean's Karaoke Show

Een Firefox-extensie die van je laptop een **karaoke-regiepaneel** maakt en
van een tweede scherm (tv, beamer of monitor) een **karaokescherm**.

- Op YouTube zet je karaokevideo's met één klik in de wachtrij.
- In de zijbalk van Firefox regel je de avond: starten, pauzeren, overslaan,
  de volgorde aanpassen.
- Op het tweede scherm zien je gasten wie er aan de beurt is, en daarna de
  video schermvullend.
- Je laptop blijft stil; het geluid komt alleen van het karaokescherm.

> **Stand van zaken:** fase 1 van 8 is klaar en fase 2 is bijna af. Je kunt
> via het rechtsklikmenu op YouTube nummers in de wachtrij zetten, met de
> naam van de aanvrager, en ze weer verwijderen. De wachtrij blijft bewaard.
> De knop "+ Wachtrij" en het tweede scherm komen nog. Zie [PLAN.md](PLAN.md).

## Wat je nodig hebt

- [Firefox](https://www.mozilla.org/nl/firefox/new/) (versie 142 of nieuwer)
- [Node.js](https://nodejs.org/nl) (alleen om te testen en te bouwen)
- Windows, macOS of Linux

## Testen

1. Open een terminal in de projectmap.
2. De allereerste keer (haalt het testhulpmiddel `web-ext` op):

   ```bash
   npm install
   ```

3. Start de test-Firefox:

   ```bash
   npm start
   ```

Er opent een aparte test-Firefox met de extensie er al in, op een
YouTube-pagina met karaokevideo's. De zijbalk "Sean's Karaoke Show" gaat
vanzelf open. Zie je hem niet? Klik dan op het roze microfoon-icoon in de
werkbalk.

- De eerste keer vraagt YouTube om cookietoestemming. Maak je keuze; de
  test-Firefox onthoudt die.
- **Een nummer toevoegen:** klik met de rechtermuisknop op een video en kies
  "Zet in de karaoke-wachtrij". Er verschijnt een pop-up met Artiest, Titel
  en Aangevraagd door. Typ de naam en druk op Enter.
- De test-Firefox heeft een eigen, vast profiel (de map `.testprofiel`). De
  wachtrij staat er dus nog als je later opnieuw `npm start` doet. Wil je
  helemaal opnieuw beginnen, gooi dan de map `.testprofiel` weg.

Tip: sleep de rand van de zijbalk tot hij ongeveer 420 pixels breed is; daar
is hij voor ontworpen.

Als je een bestand aanpast, laadt de test-Firefox de extensie vanzelf opnieuw.
Stoppen doe je door de test-Firefox te sluiten of in de terminal op `Ctrl+C`
te drukken.

### Andere commando's

| Commando | Wat het doet |
| --- | --- |
| `npm test` | Draait de automatische tests (bijvoorbeeld: wordt "ABBA - Mamma Mia (Karaoke)" goed gesplitst?) |
| `npm run controle` | Controleert de extensie op fouten |
| `npm run pakket` | Maakt een zip van de extensie in de map `pakketten/` |

## Mappen

| Map | Wat erin zit |
| --- | --- |
| `extensie/` | De extensie zelf: alles wat Firefox laadt |
| `extensie/zijbalk/` | Het regiepaneel |
| `extensie/pop-up/` | De pop-up "In de wachtrij zetten" op YouTube |
| `extensie/achtergrond/` | Het achtergrondscript: beheert de wachtrij en bewaart hem |
| `extensie/gedeeld/` | De huisstijl en de regels van de wachtrij |
| `extensie/youtube/` | Alles wat met YouTube te maken heeft |
| `tests/` | Automatische tests |
| `extensie/lettertypes/` | De lettertypes en hun licenties |
| `ontwerp/` | De ontwerpafbeeldingen |

## Automatisch afspelen met geluid (nodig vanaf fase 3)

Firefox blokkeert standaard video's die vanzelf met geluid starten. Voor de
karaokeshow moet YouTube dat wél mogen. De precieze stappen komen hier te
staan zodra het spelervenster gebouwd is (fase 3). In het kort: in Firefox bij
**Instellingen → Privacy & Beveiliging → Automatisch afspelen** stel je voor
`https://www.youtube.com` in: **Audio en video toestaan**.

## Lettertypes

De extensie bevat drie lettertypes, zodat er niets van internet geladen hoeft
te worden. Alle drie vallen onder de SIL Open Font License 1.1; de
licentieteksten staan in `extensie/lettertypes/licenties/`.

| Lettertype | Gebruikt voor | Makers |
| --- | --- | --- |
| Monoton | Logo en het neonwoord VOLGENDE | Vernon Adams |
| Rubik | Koppen | The Rubik Project Authors |
| Inter | Overige tekst | The Inter Project Authors |

## Privacy

De extensie verzamelt niets en stuurt niets door. De wachtrij en de
instellingen blijven op je eigen computer staan. Het enige contact met
internet is met YouTube zelf: als je een video toevoegt, vraagt de extensie
bij YouTube de titel van die video op.
