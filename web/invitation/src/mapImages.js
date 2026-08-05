import { cloudinaryImage } from "./cloudinary.js";

// Shared map images used by both the Travel section (route maps) and the
// Story section (map to the venue). Keeping them in one place avoids
// duplicating the Cloudinary URLs across components.
export const MAP_IMAGES = {
  venue: [
    {
      src: cloudinaryImage("maparoca_pfi6fb", { width: 1200 }),
      full: cloudinaryImage("maparoca_pfi6fb", { width: 2000 }),
      alt: "Mapa · ruta hacia Roca Azul",
    },
  ],
  beach: [
    {
      src: cloudinaryImage("mapabarra_oipjde", { width: 1200 }),
      full: cloudinaryImage("mapabarra_oipjde", { width: 2000 }),
      alt: "Mapa · ruta hacia Barra de Navidad",
    },
  ],
};
