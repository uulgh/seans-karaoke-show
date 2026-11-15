// Voorbeeldgegevens voor fase 1.
//
// Hiermee is de zijbalk te bekijken voordat de echte wachtrij bestaat.
// In fase 2 komt de toestand uit het achtergrondscript en verdwijnt dit bestand.
//
// De vorm van dit object is alvast de vorm die de echte toestand krijgt:
// - nuBezig:  het nummer dat nu speelt (of null als er niets speelt)
// - wachtrij: alle wachtende nummers; het eerste is "Volgende"

export const voorbeeldToestand = {
  spelerscherm: { actief: true },

  nuBezig: {
    titel: "Mamma Mia",
    artiest: "ABBA",
    aanvrager: "Lisa",
    positie: 102, // seconden
    duur: 215, // seconden
  },

  wachtrij: [
    { id: "v1", titel: "Zij gelooft in mij", artiest: "André Hazes", aanvrager: "Tom", zelfVerplaatst: false },
    { id: "v2", titel: "Dancing Queen", artiest: "ABBA", aanvrager: "Fatima & Sanne", zelfVerplaatst: false },
    { id: "v3", titel: "Bohemian Rhapsody", artiest: "Queen", aanvrager: "Lisa", zelfVerplaatst: false },
    { id: "v4", titel: "Het is een nacht (Levensecht)", artiest: "Guus Meeuwis & Vagant", aanvrager: "", zelfVerplaatst: false },
    { id: "v5", titel: "Total Eclipse of the Heart", artiest: "Bonnie Tyler", aanvrager: "Tom", zelfVerplaatst: true },
    { id: "v6", titel: "I Will Survive", artiest: "Gloria Gaynor", aanvrager: "Lisa", zelfVerplaatst: false },
  ],

  instellingen: {
    aftellen: true,
    eerlijkeBeurt: true,
    achtergrondmuziek: true,
  },
};
