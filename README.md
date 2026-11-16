# Sean's Karaoke Show

Een Firefox-extensie die van je laptop een **karaoke-regiepaneel** maakt en
van een tweede scherm (tv, beamer of monitor) een **karaokescherm**.

- Op YouTube zet je karaokevideo's met één klik in de wachtrij.
- In de zijbalk van Firefox regel je de avond: starten, pauzeren, overslaan,
  de volgorde aanpassen.
- Op het tweede scherm zien je gasten wie er aan de beurt is, en daarna de
  video schermvullend.
- Je laptop blijft stil; het geluid komt alleen van het karaokescherm.

> **Stand van zaken:** fase 1 tot en met 5 van de 8 zijn gebouwd: de
> wachtrij, de knop op YouTube, het spelervenster met wachtscherm en aftellen,
> de bediening, de eerlijke beurtverdeling en de achtergrondmuziek. Het is
> getest in een test-Firefox zonder echt tweede scherm; de test met een tv of
> beamer moet nog. Daarna volgen ondertekenen bij Mozilla, de
> installatiescripts en de proefavond. Zie [PLAN.md](PLAN.md).

## Wat je nodig hebt

- [Firefox](https://www.mozilla.org/nl/firefox/new/) (versie 142 of nieuwer)
- [Node.js](https://nodejs.org/nl) (alleen om te testen en te bouwen)
- Windows, macOS of Linux
- Een tweede scherm en een speaker

## Zo werkt een avond

1. **Spelerscherm openen.** Klik rechtsboven in de zijbalk op "Spelerscherm
   openen". Er opent een apart venster.
2. **Naar het tweede scherm.** De eerste keer sleep je dat venster naar de tv,
   beamer of monitor en klik je op "Dit scherm gebruiken". Het venster wordt
   schermvullend en onthoudt die plek; de volgende keer gaat het vanzelf.
   Staat het op het verkeerde scherm, klik dan op "Opnieuw plaatsen".
3. **Nummers toevoegen.** Zoek op YouTube een karaokevideo en klik op de roze
   knop "+ Wachtrij" op het plaatje. Vul de naam van de zanger in en druk op
   Enter. (Rechtsklikken op een video en "Zet in de karaoke-wachtrij" kiezen
   kan ook.)
4. **Start.** Klik op de grote roze Start-knop. Op het tweede scherm telt een
   cirkel af van 5 naar 1 en dan speelt de video schermvullend.
5. **Na het nummer** komt vanzelf het wachtscherm terug met wie er daarna aan
   de beurt is.

Verder in de zijbalk:

- **Pauze / Verder, Stop, Overslaan.** Stop zet het nummer terug vooraan in de
  wachtrij. Overslaan telt het nummer als gezongen.
- **Eerlijke beurt.** Staat dit aan, dan komt iemand die al een paar keer
  heeft gezongen na iemand die nog niet is geweest. Verplaats je een nummer
  zelf (met de pijltjes of door te slepen aan de zes puntjes), dan krijgt het
  het label "zelf verplaatst" en blijft het daar staan. Een klik op dat label
  deelt het weer eerlijk in.
- **Achtergrondmuziek.** Onderin zet je hem aan of uit en regel je het volume.
  De link stel je in bij de instellingen.
- **Instellingen** (het tandwiel onderin): de naam van het feest, een eigen
  logo, de YouTube-link voor de achtergrondmuziek (een video of een
  afspeellijst) en de knop om een nieuwe avond te beginnen.

Zolang het spelerscherm open is, zijn YouTube-tabbladen op je laptop gedempt.
Wil je toch iets voorluisteren, zet dan zelf het geluid van dat tabblad aan
(het luidsprekertje op het tabblad); de extensie blijft er dan vanaf.

## Automatisch afspelen met geluid

Firefox blokkeert standaard video's die vanzelf met geluid starten. Voor de
karaokeshow moet dat wél mogen, anders blijft het wachtscherm staan en meldt
de zijbalk "Firefox blokkeert het afspelen met geluid".

In de test-Firefox van `npm start` is dit al geregeld. In een gewone Firefox
stel je het één keer in:

1. Open het menu (de drie streepjes rechtsboven) en kies **Instellingen**.
2. Klik links op **Privacy & Beveiliging**.
3. Scrol naar het kopje **Toestemmingen**.
4. Klik naast **Automatisch afspelen** op **Instellingen…**
5. Kies bovenaan bij "Standaard voor alle websites": **Audio en video
   toestaan**.
6. Klik op **Wijzigingen opslaan**.

Wil je het alleen voor YouTube toestaan? Open dan youtube.com, druk op
`Ctrl+I`, ga naar het tabblad **Toestemmingen**, haal bij "Automatisch
afspelen" het vinkje "Standaard gebruiken" weg en kies **Audio en video
toestaan**.

## Reclame van YouTube

De extensie blokkeert zelf geen reclame. Speelt YouTube vóór een nummer
reclame, dan is die op het tweede scherm te zien en meldt de zijbalk "YouTube
toont eerst reclame". Het nummer begint daarna vanzelf. Met een
reclameblokker zoals uBlock Origin gebeurt dit niet; die kun je in de
test-Firefox zelf installeren en hij komt later in het installatiescript.

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
  test-Firefox onthoudt die. Zolang je die keuze niet hebt gemaakt, speelt er
  niets af.
- De test-Firefox heeft een eigen, vast profiel (de map `.testprofiel`). De
  wachtrij staat er dus nog als je later opnieuw `npm start` doet. Wil je
  helemaal opnieuw beginnen, gooi dan de map `.testprofiel` weg.
- Heb je geen tweede scherm bij de hand? Dan kun je het spelerscherm ook
  gewoon op je laptop vastzetten om het te bekijken.

Tip: sleep de rand van de zijbalk tot hij ongeveer 420 pixels breed is; daar
is hij voor ontworpen.

Als je een bestand aanpast, laadt de test-Firefox de extensie vanzelf opnieuw.
Stoppen doe je door de test-Firefox te sluiten of in de terminal op `Ctrl+C`
te drukken.

### Andere commando's

| Commando | Wat het doet |
| --- | --- |
| `npm test` | Draait de automatische tests (bijvoorbeeld: klopt de eerlijke beurtverdeling?) |
| `npm run controle` | Controleert de extensie op fouten |
| `npm run pakket` | Maakt een zip van de extensie in de map `pakketten/` |

## Als YouTube iets verandert

YouTube past zijn pagina's geregeld aan. Verdwijnt de knop "+ Wachtrij" of
vult de video het scherm niet meer, dan staat alles wat de extensie over
YouTube's pagina's weet in één bestand:
`extensie/youtube/youtube-kiezers.js`. Daar hoeft de reparatie te gebeuren.

## Mappen

| Map | Wat erin zit |
| --- | --- |
| `extensie/` | De extensie zelf: alles wat Firefox laadt |
| `extensie/zijbalk/` | Het regiepaneel, met de instellingen |
| `extensie/pop-up/` | De pop-up "In de wachtrij zetten" op YouTube |
| `extensie/speler/` | Het spelervenster: wachtscherm, aftellen en afspelen |
| `extensie/achtergrond/` | Het achtergrondscript: beheert de wachtrij en het spelervenster |
| `extensie/gedeeld/` | De huisstijl en de regels van de wachtrij |
| `extensie/youtube/` | Alles wat met YouTube te maken heeft |
| `extensie/lettertypes/` | De lettertypes en hun licenties |
| `tests/` | Automatische tests |
| `ontwerp/` | De ontwerpafbeeldingen |

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

De extensie verzamelt niets en stuurt niets door. De wachtrij, de
instellingen en je logo blijven op je eigen computer staan. Het enige contact
met internet is met YouTube zelf: de extensie vraagt bij YouTube de titel op
van een video die je toevoegt, en speelt de video's en de achtergrondmuziek
af op YouTube's eigen pagina.
