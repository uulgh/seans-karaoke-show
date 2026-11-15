// Achtergrondscript van Sean's Karaoke Show.
//
// Dit script draait onzichtbaar op de achtergrond. In latere fases wordt dit
// "de ene waarheid": hier leven de wachtrij en de instellingen, en van hieruit
// worden de zijbalk en het spelervenster aangestuurd.
//
// Fase 1: alleen de knop in de werkbalk. Een klik opent of sluit de zijbalk.

browser.action.onClicked.addListener(() => {
  // Firefox staat dit alleen toe als directe reactie op een klik van de
  // gebruiker. Daarom gebeurt het meteen hier, zonder iets ervoor.
  browser.sidebarAction.toggle();
});
