// ── Accommodation external-lodging data ─────────────────────────────────
// Static data for the "external lodging" suggestions (Airbnb + hotels) shown
// in the Accommodation section. Extracted from Accommodation.jsx so the data
// is separated from the component logic. Pure data — no behavior.

export const AIRBNB_SEARCH_URL = "https://www.airbnb.mx/s/roca-azul/homes?date_picker_type=calendar&checkin=2027-02-19&checkout=2027-02-21&refinement_paths%5B%5D=%2Fhomes&search_type=search_query";

export const AIRBNB_SUGGESTIONS = [
  {
    name: "Casa Roca Azul en Jocotepec, Lago Chapala",
    url: "https://www.airbnb.mx/rooms/1573287868886556972?check_in=2027-02-19&check_out=2027-02-21",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 8,
    bedrooms: 3,
    beds: 5,
    rating: "4.0",
  },
  {
    name: "Casa Vista Roca Azul Jocotepec",
    url: "https://www.airbnb.mx/rooms/43404418?check_in=2027-02-19&check_out=2027-02-21",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    guests: 12,
    bedrooms: 4,
    beds: 6,
    rating: "4.54",
  },
  {
    name: "Roca Azul, vecindario agradable cerca de Ajijic",
    url: "https://www.airbnb.mx/rooms/5617577?check_in=2027-02-19&check_out=2027-02-21",
    image: "https://a0.muscache.com/im/pictures/miso/Hosting-5617577/original/24e8e6f1-d167-4a26-b142-c6c73c091528.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 5,
    bedrooms: 2,
    beds: 3,
    rating: "4.68",
  },
];

export const HOTEL_SUGGESTIONS = [
  {
    name: "El Chante Spa Hotel",
    url: "https://www.elchantespa.com/",
    image: "https://www.elchantespa.com/img/bg_chapala.jpg",
    location: "Jocotepec",
    type: "spaHotel",
    price: 2000,
  },
  {
    name: "Cosalá Grand Boutique Resort & Spa",
    url: "https://www.cosalagrand.com/",
    image: "https://images-new.pxsol.com/2A1m2dNdG2XVEBIghDhfc1AMd4n5SfERbAkax-Hop0Q/rs:fill:630:430:1/q:80/plain/https%3A%2F%2Ffiles-p.pxsol.com%2F25150%2Fcompany%2Flibrary%2Fuser%2F14205952368dd68e4f0c0cefe337e8b050b752607dd.png@png",
    location: "San Juan Cosalá",
    type: "boutiqueSpa",
    price: 3700,
  },
  {
    name: "Hotel Balneario San Juan Cosalá",
    url: "https://www.hotelspacosala.com/",
    image: "https://static.wixstatic.com/media/a38016_f23f8b18b81a424381d7a612c2988396.jpg/v1/fill/w_696,h_304,al,c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/a38016_f23f8b18b81a424381d7a612c2988396.jpg",
    location: "San Juan Cosalá",
    type: "thermalHotel",
    price: 3300,
  },
];
