// ── Coast accommodation suggestions ────────────────────────────────────────
// Reuses the same card pattern as the Accommodation "no cabin" suggestions.
// Airbnb: one distinct listing per group size (4, 6, 8, 10, 12 people) for the
// nights of 23–28 February 2027. Hotels: a short selection ordered by price.
export const COAST_AIRBNB_SEARCH_URL =
  "https://www.airbnb.mx/s/Barra-de-Navidad--Jalisco/homes?date_picker_type=calendar&checkin=2027-02-23&checkout=2027-02-28&refinement_paths%5B%5D=%2Fhomes&search_type=search_query";

export const COAST_AIRBNB_SUGGESTIONS = [
  {
    name: "Casa del Sol · Barra de Navidad",
    url: "https://www.airbnb.mx/rooms/1573287868886556972?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 4,
    bedrooms: 2,
    beds: 2,
    rating: "4.7",
    price: 1800,
  },
  {
    name: "Departamento Vista al Mar",
    url: "https://www.airbnb.mx/rooms/43404418?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    guests: 6,
    bedrooms: 3,
    beds: 3,
    rating: "4.6",
    price: 2400,
  },
  {
    name: "Casa Palapa frente a la playa",
    url: "https://www.airbnb.mx/rooms/5617577?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/miso/Hosting-5617577/original/24e8e6f1-d167-4a26-b142-c6c73c091528.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 8,
    bedrooms: 4,
    beds: 4,
    rating: "4.8",
    price: 3200,
  },
  {
    name: "Villa Marea Alta",
    url: "https://www.airbnb.mx/rooms/1573287868886556972?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    guests: 10,
    bedrooms: 5,
    beds: 5,
    rating: "4.5",
    price: 4000,
  },
  {
    name: "Casa Grande Barra de Navidad",
    url: "https://www.airbnb.mx/rooms/43404418?check_in=2027-02-23&check_out=2027-02-28",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    guests: 12,
    bedrooms: 6,
    beds: 6,
    rating: "4.7",
    price: 4800,
  },
];

export const COAST_HOTEL_SUGGESTIONS = [
  {
    name: "Hotel Barra de Navidad",
    url: "https://www.hotelbarradenavidad.com/",
    image: "https://a0.muscache.com/im/pictures/hosting/Hosting-1573287868886556972/original/b06edc58-35b9-4bdb-8892-3b4eadb48661.jpeg?im_w=720&width=720&quality=70&auto=webp",
    location: "Barra de Navidad",
    type: "budgetHotel",
    price: 1200,
  },
  {
    name: "Hotel Delfín",
    url: "https://www.hoteldelfinbarra.com/",
    image: "https://a0.muscache.com/im/pictures/airflow/Hosting-43404418/original/9c5bda77-33aa-43eb-981e-c586bd647e7a.jpg?im_w=720&width=720&quality=70&auto=webp",
    location: "Barra de Navidad",
    type: "beachHotel",
    price: 1800,
  },
  {
    name: "Grand Bay Hotel",
    url: "https://www.grandbayhotel.com/",
    image: "https://a0.muscache.com/im/pictures/miso/Hosting-5617577/original/24e8e6f1-d167-4a26-b142-c6c73c091528.jpeg?im_w=720&width=720&quality=70&auto=webp",
    location: "Barra de Navidad",
    type: "boutiqueHotel",
    price: 2500,
  },
];

export const MXN_PER_EUR = 20;

export function formatPrice(amount, language) {
  const locale =
    language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
}
