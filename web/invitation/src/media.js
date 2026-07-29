import couple002 from "./assets/approved/couple-002.webp";
import couple003 from "./assets/approved/couple-003.webp";
import couple005 from "./assets/approved/couple-005.webp";
import couple009 from "./assets/approved/couple-009.webp";
import couple012 from "./assets/approved/couple-012.webp";
import couple013 from "./assets/approved/couple-013.webp";
import couple014 from "./assets/approved/couple-014.webp";
import couple018 from "./assets/approved/couple-018.webp";
import venueCabins from "./assets/approved/venue-cabins.webp";
import venueCourts from "./assets/approved/venue-courts.webp";
import venueGardens from "./assets/approved/venue-gardens.webp";
import venuePool from "./assets/approved/venue-pool.webp";
import foodCarnitas from "./assets/approved/food-carnitas.webp";
import foodGuacamole from "./assets/approved/food-guacamole.webp";
import foodNopales from "./assets/approved/food-nopales.webp";
import foodTaquiza from "./assets/approved/food-taquiza.webp";
import foodTejuino from "./assets/approved/food-tejuino.webp";
import cabinAzalea01 from "./assets/approved/cabin-azalea-01.webp";
import cabinAzalea02 from "./assets/approved/cabin-azalea-02.webp";
import cabinAzalea03 from "./assets/approved/cabin-azalea-03.webp";
import cabinAzalea04 from "./assets/approved/cabin-azalea-04.webp";
import cabinAzalea05 from "./assets/approved/cabin-azalea-05.webp";
import cabinAzalea06 from "./assets/approved/cabin-azalea-06.webp";
import cabinAzalea07 from "./assets/approved/cabin-azalea-07.webp";
import cabinAzalea08 from "./assets/approved/cabin-azalea-08.webp";
import cabinAzalea09 from "./assets/approved/cabin-azalea-09.webp";
import cabinDalia01 from "./assets/approved/cabin-dalia-01.webp";
import cabinDalia02 from "./assets/approved/cabin-dalia-02.webp";
import cabinDalia03 from "./assets/approved/cabin-dalia-03.webp";
import cabinDalia04 from "./assets/approved/cabin-dalia-04.webp";
import cabinDalia05 from "./assets/approved/cabin-dalia-05.webp";
import cabinDalia06 from "./assets/approved/cabin-dalia-06.webp";
import cabinDalia07 from "./assets/approved/cabin-dalia-07.webp";
import cabinMargarita01 from "./assets/approved/cabin-margarita-01.webp";
import cabinMargarita02 from "./assets/approved/cabin-margarita-02.webp";
import cabinMargarita03 from "./assets/approved/cabin-margarita-03.webp";
import cabinMargarita04 from "./assets/approved/cabin-margarita-04.webp";
import cabinMargarita05 from "./assets/approved/cabin-margarita-05.webp";
import cabinMargarita06 from "./assets/approved/cabin-margarita-06.webp";
import cabinMargarita07 from "./assets/approved/cabin-margarita-07.webp";
import cabinMargarita08 from "./assets/approved/cabin-margarita-08.webp";
import cabinWooden01 from "./assets/approved/cabin-wooden-01.webp";
import cabinWooden02 from "./assets/approved/cabin-wooden-02.webp";
import cabinWooden03 from "./assets/approved/cabin-wooden-03.webp";
import cabinWooden04 from "./assets/approved/cabin-wooden-04.webp";
import cabinWoodenTour from "./assets/approved/cabin-wooden-tour.mp4";

/*
 * Public invitation media registry. Only files imported here are included in
 * the production build. The remaining approved derivatives stay available for
 * later compositions without exposing the private originals.
 */
export const MEDIA = {
  hero: [couple014, couple018, couple003, couple013],
  gallery: [
    couple003,
    couple009,
    couple014,
    couple005,
    couple018,
    couple002,
    couple012,
  ],
  venue: {
    cabins: venueCabins,
    courts: venueCourts,
    gardens: venueGardens,
    pool: venuePool,
  },
  food: {
    carnitas: foodCarnitas,
    guacamole: foodGuacamole,
    nopales: foodNopales,
    taquiza: foodTaquiza,
    tejuino: foodTejuino,
  },
  cabins: {
    azalea: [
      cabinAzalea01,
      cabinAzalea02,
      cabinAzalea03,
      cabinAzalea04,
      cabinAzalea05,
      cabinAzalea06,
      cabinAzalea07,
      cabinAzalea08,
      cabinAzalea09,
    ],
    dalia: [
      cabinDalia01,
      cabinDalia02,
      cabinDalia03,
      cabinDalia04,
      cabinDalia05,
      cabinDalia06,
      cabinDalia07,
    ],
    margarita: [
      cabinMargarita01,
      cabinMargarita02,
      cabinMargarita03,
      cabinMargarita04,
      cabinMargarita05,
      cabinMargarita06,
      cabinMargarita07,
      cabinMargarita08,
    ],
    wooden: [
      cabinWooden01,
      cabinWooden02,
      cabinWooden03,
      cabinWooden04,
    ],
  },
  cabinVideos: {
    wooden: cabinWoodenTour,
  },
};
