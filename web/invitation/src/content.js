// Trilingual content is split by section under ./content/ (one file per section,
// each exporting its { es, fr, en } block) and composed into the `content`
// object in ./content/index.js. This file is a thin re-export so existing
// imports (`import { content, EVENT, SUPPORTED_LANGUAGES } from "../content.js"`)
// keep working unchanged.

export { content } from "./content/index.js";

export const SUPPORTED_LANGUAGES = ["es", "fr", "en"];

export const EVENT = {
  couple: "David & Aydé",
  date: "2027-02-20T00:00:00-06:00",
  // Anchor for the "married since" reverse counter (20/02 at 2 PM Mexico time)
  weddingDate: "2027-02-20T14:00:00-06:00",
  dateShort: "20 · 02 · 27",


  venue: "Roca Azul",
  place: "Jocotepec · Jalisco · México",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Club+Roca+Azul+Jocotepec",
  contacts: {
    david: {
      label: "David",
      phone: "+52 33 3201 7504",
      whatsapp: "https://wa.me/523332017504",
    },
    ayde: {
      label: "Aydé",
      phone: "+52 33 3661 6738",
      whatsapp: "https://wa.me/523336616738",
    },
  },
  playlists: {
    general: "https://open.spotify.com/playlist/4izmJJXTOnsUz3BQsrkZBh",
    karaoke: "https://open.spotify.com/playlist/6hmu5velXNH68JAhQ3xaU4",
    shared: "https://open.spotify.com/playlist/15OzUIqhOrY5m9yu8qj3Xj?si=9bc8cefe86f646de&pt=f01f85e8d5b1171163c30140263eb9f1",

  },

};
