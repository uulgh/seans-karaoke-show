# Plan — Sean's Karaoke Show

Een Firefox-extensie die van de laptop een karaoke-regiepaneel maakt en van een
tweede scherm (tv, beamer of monitor) een karaokescherm.

**Zo werken we:** één fase per keer. Bij elke nieuwe fase laat Claude eerst de
aanpak zien en wacht op akkoord van Sean. Na elke werkende stap volgt een
testuitleg, een commit met Nederlandse omschrijving en een push naar GitHub.

Legenda: ✅ klaar · 🔨 mee bezig · ⬜ nog te doen

---

## Fase 1 — Basis en zijbalk in huisstijl ✅

Doel: de extensie bestaat, laadt in Firefox en de zijbalk ziet eruit zoals het
ontwerp (optie A, Neonbar). Er werkt nog niets "echt"; de zijbalk toont
voorbeeldgegevens zodat de vormgeving te beoordelen is.

- ✅ Projectmap, Git, GitHub-repository, `web-ext` als testhulpmiddel
- ✅ `manifest.json` (Manifest V3, vaste Gecko-ID, zijbalk, werkbalkknop)
- ✅ Lettertypes Monoton, Rubik en Inter in de extensie, met licentiebestanden
- ✅ Huisstijl als losse bouwsteen (kleuren, gloed, knoppen, schakelaars)
- ✅ Zijbalk: kop met logo, "NU BEZIG", "VOLGENDE", "Wachtrij", "Achtergrondmuziek"
- ✅ Icoon van de extensie

**Klaar als:** `npm start` een Firefox opent met de zijbalk in neonstijl, en
`npm run controle` geen fouten geeft.

## Fase 2 — Wachtrij en knop 🔨

Doel: nummers vanaf YouTube in een echte, bewaarde wachtrij zetten.

- ✅ **Stap 1 — Artiest en titel uit de videotitel halen**
  ("ABBA - Mamma Mia (Karaoke)" → ABBA / Mamma Mia), met automatische tests
  (`npm test`)
- ✅ **Stap 2 — De echte wachtrij**: leeft in het achtergrondscript en wordt
  bewaard (`storage.local`); de zijbalk toont de echte wachtrij en de
  voorbeeldgegevens zijn weg; het rechtsklikmenu "Zet in de
  karaoke-wachtrij" voegt een nummer toe (de titel wordt bij YouTube
  opgevraagd); verwijderen werkt al; de schakelaars onthouden hun stand;
  `npm start` heeft een vast testprofiel zodat "blijft bewaard" te testen is
- ⬜ **Stap 3 — Pop-up "In de wachtrij zetten"** met Artiest, Titel en
  Aangevraagd door, plus een knop om artiest en titel om te wisselen
- ⬜ **Stap 4 — Knop "+ Wachtrij"** op elke YouTube-thumbnail (pil rechtsboven)

Afgesproken keuzes voor deze fase:

- De pop-up staat in de YouTube-pagina zelf, afgeschermd van YouTube's opmaak.
- Thumbnails vinden we via de videolink, niet via YouTube's onderdeelnamen.
- Dezelfde video mag twee keer in de wachtrij (met een melding).
- Shorts krijgen geen knop.
- De schakelaars onthouden hun stand, maar doen nog niets.
- Nieuwe toestemmingen: opslag, menu's en toegang tot youtube.com.

**Klaar als:** een nummer toevoegen op YouTube direct in de zijbalk verschijnt
en er na het herstarten van Firefox nog staat.

## Fase 3 — Spelervenster, wachtscherm, aftellen en stille laptop ⬜

Doel: het tweede scherm werkt.

- Knop "Spelerscherm openen": apart venster zonder adresbalk
- Venster onthoudt zijn plek; eerst positie zetten, dán volledig scherm
  (Firefox kan dat niet in één keer)
- Knop "Opnieuw plaatsen" voor als het scherm verandert
- Wachtscherm: VOLGENDE, artiest, titel, "Gevraagd door", lijst "Daarna",
  feestnaam, "maak je klaar!"
- Start → (optioneel) aftellen 5-4-3-2-1 → video schermvullend, zonder
  YouTube-knoppen eromheen
- Na afloop automatisch terug naar het wachtscherm; YouTube start zelf niets
- YouTube-tabbladen in het laptopvenster worden gedempt
- Uitleg: automatisch afspelen met geluid toestaan voor youtube.com

**Klaar als:** een hele ronde werkt: toevoegen → Start → aftellen → video op
het tweede scherm → wachtscherm met het volgende nummer.

## Fase 4 — Bediening en eerlijke beurt ⬜

- "Nu bezig" met echte voortgangsbalk en tijd; Pauze, Stop en Overslaan
- Wachtrij: pijltjes, slepen en verwijderen
- Eerlijke beurtverdeling aan/uit, met rondenummers per aanvrager
- Label "zelf verplaatst" voor nummers die Sean met de hand verzet
- Automatische test: Lisa vraagt 3 nummers aan, daarna Tom 1 →
  volgorde Lisa, Tom, Lisa, Lisa

## Fase 5 — Achtergrondmuziek en feestnaam ⬜

- Instelbare YouTube-link (video of afspeellijst) als achtergrondmuziek
- Speelt zacht op het wachtscherm, stopt bij het aftellen, gaat daarna verder
- Volumeregelaar en schakelaar in de zijbalk
- Instellingenpagina: feestnaam (standaard "Karaoke-avond") en eigen logo

## Fase 6 — Ondertekenen bij Mozilla (unlisted) ⬜

- Account bij addons.mozilla.org, API-sleutels veilig bewaren (nooit in de code)
- `web-ext sign --channel unlisted` → een ondertekend `.xpi`-bestand
- Dat bestand is in elke gewone Firefox te installeren

## Fase 7 — Installatiescripts en GitHub-release ⬜

- Scripts voor Windows, macOS en Linux die:
  - een apart Firefox-profiel "Karaoke" maken
  - een snelkoppeling met icoon neerzetten
  - uBlock Origin installeren via `policies.json`
  - de eigen extensie installeren
- Een GitHub-release met het ondertekende bestand en de scripts

## Fase 8 — Proefavond ⬜

- Generale repetitie met tv of beamer en de losse speaker
- Checklist voor de avond zelf (kabels, geluid, autoplay, wachtrij leeg)
- Gevonden problemen oplossen

---

## Technische keuzes (en waarom)

| Keuze | Waarom |
| --- | --- |
| **Manifest V3 met vaste Gecko-ID** (`seans-karaoke-show@karafox`) | Zonder vaste ID ziet Firefox elke installatie als een nieuwe extensie en raak je bewaarde gegevens kwijt. Voor ondertekenen is hij verplicht. |
| **Minimaal Firefox 142** | Alles wat we nodig hebben zit erin, en elke Firefox die nu nog updates krijgt is nieuwer. |
| **Geen bouwstap** | De extensie is gewone HTML, CSS en JavaScript. Wat in de map `extensie/` staat, is precies wat Firefox laadt. Minder dat stuk kan. |
| **Eén "waarheid" in het achtergrondscript** | Wachtrij en instellingen staan op één plek en worden bewaard met `storage.local`. Zijbalk en spelervenster tonen alleen wat het achtergrondscript zegt. Zo kunnen ze nooit uit elkaar lopen. |
| **YouTube-code apart** (map `extensie/youtube/`, vanaf fase 2) | YouTube verandert geregeld zijn pagina's. Alle "waar staat de video, waar staat de titel" staat straks in één bestand, zodat een reparatie maar één plek raakt. |
| **Gewone YouTube-kijkpagina in het spelervenster** | Sommige video's mogen niet ingesloten worden afgespeeld. De gewone kijkpagina werkt altijd. |
| **Wachtscherm als laag over de YouTube-pagina** (voorlopige keuze, definitief in fase 3) | Dan zit alles in één tabblad: de achtergrondmuziek speelt op dezelfde gewone YouTube-pagina, het venster blijft op volledig scherm en de autoplay-toestemming geldt maar voor één site. |
| **Lettertypes in de extensie** | Niets wordt van internet geladen; het werkt dus ook als de wifi hapert en het is privacyvriendelijk. |
| **Rechten pas vragen als ze nodig zijn** | Fase 1 vraagt geen enkele toestemming. Elke fase voegt alleen toe wat die fase nodig heeft. |

## Regel voor eerlijke beurtverdeling (fase 4)

1. Elk verzoek krijgt een **rondenummer**: het hoeveelste nummer van die
   aanvrager het is (al gezongen + nog wachtend).
2. De wachtrij staat op volgorde van ronde, en binnen een ronde op volgorde
   van aanvragen.
3. Namen worden vergeleken zonder op hoofdletters te letten. Geen naam telt
   als aanvrager "Iedereen".
4. Een nummer dat Sean zelf verplaatst, krijgt het label "zelf verplaatst" en
   blijft op die plek.
