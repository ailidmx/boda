/**
 * Lake Chapala anecdotes for the invitation story section.
 *
 * Each anecdote is a small illustrated card (image + icon + eyebrow + title +
 * text) that cycles through a carousel. The images are the couple's approved
 * photos hosted on Cloudinary under the `boda/` folder (cloud name k2ajcgxv),
 * built into optimised delivery URLs at render time via `cloudinaryImage`.
 *
 * The `id`, `icon` and `image` (Cloudinary public id) are language-independent;
 * the `eyebrow`, `title`, `text` and `imageAlt` are provided per language.
 */

import { cloudinaryImage } from "./cloudinary.js";

/** Cloudinary public id prefix for the couple's approved photos. */
const CHAPALA_FOLDER = "boda";

/**
 * Build a Cloudinary delivery URL for a Chapala anecdote image.
 * @param {string} slug  e.g. "couple-new-DSC05180"
 * @param {object} opts  { width, height, crop }
 */
function chapalaImage(slug, opts = {}) {
  return cloudinaryImage(`${CHAPALA_FOLDER}/${slug}`, opts);
}

/**
 * Shared, language-independent fields for each anecdote.
 * `image` is the Cloudinary public id; `imageUrl` is the ready-to-use URL.
 */
const ANECDOTE_META = [
  {
    id: "plus-grand-lac-mexique",
    icon: "🌊",
    image: "couple-new-DSC05180",
  },
  {
    id: "lac-altitude",
    icon: "⛰️",
    image: "couple-new-IMG_20190313_205809",
  },
  {
    id: "ile-mezcala",
    icon: "🏝️",
    image: "couple-new-IMG_20200627_223059",
  },
  {
    id: "peuple-coca",
    icon: "🪶",
    image: "couple-new-IMG_20210211_225341_1",
  },
  {
    id: "nom-ajijic",
    icon: "💧",
    image: "couple-new-IMG_20211030_184411",
  },
  {
    id: "artistes-ajijic",
    icon: "🎨",
    image: "couple-new-IMG_20211228_225516",
  },
  {
    id: "ajijic-international",
    icon: "🌎",
    image: "couple-new-IMG_20220819_095220",
  },
  {
    id: "pueblo-magico",
    icon: "✨",
    image: "couple-new-20230129_214006",
  },
  {
    id: "jocotepec-baies",
    icon: "🍓",
    image: "couple-new-IMG_2690",
  },
  {
    id: "niveau-lac",
    icon: "🌦️",
    image: "couple-new-IMG_3511",
  },
  {
    id: "oiseaux",
    icon: "🦢",
    image: "couple-new-IMG_4241",
  },
  {
    id: "charales",
    icon: "🐟",
    image: "couple-new-IMG_4921",
  },
];

/** Localised copy for each anecdote, keyed by language. */
const ANECDOTE_COPY = {
  es: [
    {
      eyebrow: "¿Lo sabías?",
      title: "Un aire de mar interior",
      text: "Con más de 1 100 km², el lago de Chapala es el lago natural más grande de México. Desde algunas orillas apenas se distingue el otro lado.",
      imageAlt: "Vista panorámica del lago de Chapala",
    },
    {
      eyebrow: "Geografía",
      title: "La playa a 1 500 metros de altitud",
      text: "El lago se encuentra a unos 1 525 metros sobre el nivel del mar, rodeado de montañas que contribuyen al clima templado de la región.",
      imageAlt: "El lago de Chapala rodeado de montañas",
    },
    {
      eyebrow: "Historia",
      title: "La fortaleza del lago",
      text: "Durante la guerra de independencia, combatientes indígenas resistieron varios años en la isla de Mezcala, protegidos por las aguas del lago.",
      imageAlt: "La isla histórica de Mezcala",
    },
    {
      eyebrow: "Orígenes",
      title: "La memoria del pueblo Coca",
      text: "Las orillas de Chapala estuvieron habitadas mucho antes de la llegada de los españoles. Mezcala conserva hoy una fuerte identidad indígena.",
      imageAlt: "Pueblo de Mezcala a orillas del lago",
    },
    {
      eyebrow: "Etimología",
      title: "Un nombre que hace burbujas",
      text: "El nombre antiguo de Ajijic se asocia a la idea de un lugar donde el agua brota o hierve, en referencia a los manantiales de la región.",
      imageAlt: "Fuente en el pueblo de Ajijic",
    },
    {
      eyebrow: "Cultura",
      title: "Mucho antes de Instagram",
      text: "Desde el siglo XX, Ajijic atrajo a artistas, escritores y viajeros seducidos por la luz, los colores y la tranquilidad del lago.",
      imageAlt: "Mural colorido en una calle de Ajijic",
    },
    {
      eyebrow: "Encuentros",
      title: "Bienvenidos a la Riviera de Chapala",
      text: "Mexicanos, canadienses, estadounidenses y europeos conviven aquí, dando a Ajijic un ambiente tan local como cosmopolita.",
      imageAlt: "Plaza animada en el centro de Ajijic",
    },
    {
      eyebrow: "Patrimonio",
      title: "La magia reconocida oficialmente",
      text: "Desde 2020, Ajijic lleva el título de Pueblo Mágico, otorgado a las localidades mexicanas con un patrimonio excepcional.",
      imageAlt: "Letras monumentales de Ajijic",
    },
    {
      eyebrow: "Terruño",
      title: "Fresas con vista al lago",
      text: "Alrededor de Jocotepec, las fresas, frambuesas, moras y arándanos ocupan un lugar importante en la agricultura local.",
      imageAlt: "Frutas rojas cultivadas cerca de Jocotepec",
    },
    {
      eyebrow: "Naturaleza",
      title: "Nunca exactamente el mismo paisaje",
      text: "El nivel del lago varía con las estaciones y los años, transformando continuamente las orillas y los paseos.",
      imageAlt: "Orilla cambiante del lago de Chapala",
    },
    {
      eyebrow: "Biodiversidad",
      title: "Una escala para las aves viajeras",
      text: "Los humedales de Chapala acogen numerosas aves residentes y migratorias, lo que le ha valido al lago un reconocimiento internacional.",
      imageAlt: "Aves acuáticas sobre el lago de Chapala",
    },
    {
      eyebrow: "Gastronomía",
      title: "Una historia de charales",
      text: "Estos pequeños peces del lago se degustan tradicionalmente fritos, con limón, sal y un toque de chile.",
      imageAlt: "Charales, especialidad del lago de Chapala",
    },
  ],
  fr: [
    {
      eyebrow: "Le savais-tu ?",
      title: "Un petit air de mer intérieure",
      text: "Avec plus de 1 100 km², le lac de Chapala est le plus grand lac naturel du Mexique. Depuis certaines rives, on distingue à peine l’autre côté.",
      imageAlt: "Vue panoramique du lac de Chapala",
    },
    {
      eyebrow: "Géographie",
      title: "La plage à 1 500 mètres d’altitude",
      text: "Le lac se trouve à environ 1 525 mètres au-dessus du niveau de la mer, entouré de montagnes qui participent au climat doux de la région.",
      imageAlt: "Le lac de Chapala entouré de montagnes",
    },
    {
      eyebrow: "Histoire",
      title: "La forteresse du lac",
      text: "Pendant la guerre d’indépendance, des combattants autochtones résistèrent plusieurs années sur l’île de Mezcala, protégés par les eaux du lac.",
      imageAlt: "L’île historique de Mezcala",
    },
    {
      eyebrow: "Origines",
      title: "La mémoire du peuple Coca",
      text: "Les rives de Chapala étaient habitées bien avant l’arrivée des Espagnols. Mezcala conserve aujourd’hui encore une forte identité autochtone.",
      imageAlt: "Village de Mezcala au bord du lac",
    },
    {
      eyebrow: "Étymologie",
      title: "Un nom qui fait des bulles",
      text: "Le nom ancien d’Ajijic est associé à l’idée d’un lieu où l’eau jaillit ou bouillonne, en référence aux sources naturelles de la région.",
      imageAlt: "Fontaine dans le village d’Ajijic",
    },
    {
      eyebrow: "Culture",
      title: "Bien avant Instagram",
      text: "Dès le XXe siècle, Ajijic attira artistes, écrivains et voyageurs séduits par la lumière, les couleurs et la tranquillité du lac.",
      imageAlt: "Fresque colorée dans une rue d’Ajijic",
    },
    {
      eyebrow: "Rencontres",
      title: "Bienvenue à la Riviera de Chapala",
      text: "Mexicains, Canadiens, Américains et Européens vivent ici côte à côte, donnant à Ajijic une atmosphère aussi locale que cosmopolite.",
      imageAlt: "Place animée dans le centre d’Ajijic",
    },
    {
      eyebrow: "Patrimoine",
      title: "La magie officiellement reconnue",
      text: "Depuis 2020, Ajijic porte le titre de Pueblo Mágico, décerné aux localités mexicaines possédant un patrimoine exceptionnel.",
      imageAlt: "Lettres monumentales Ajijic",
    },
    {
      eyebrow: "Terroir",
      title: "Des fraises avec vue sur le lac",
      text: "Autour de Jocotepec, fraises, framboises, mûres et myrtilles occupent une place importante dans l’agriculture locale.",
      imageAlt: "Fruits rouges cultivés près de Jocotepec",
    },
    {
      eyebrow: "Nature",
      title: "Jamais exactement le même paysage",
      text: "Le niveau du lac varie avec les saisons et les années, transformant continuellement les rives et les promenades.",
      imageAlt: "Rive changeante du lac de Chapala",
    },
    {
      eyebrow: "Biodiversité",
      title: "Une escale pour les oiseaux voyageurs",
      text: "Les zones humides de Chapala accueillent de nombreux oiseaux résidents et migrateurs, ce qui a valu au lac une reconnaissance internationale.",
      imageAlt: "Oiseaux aquatiques sur le lac de Chapala",
    },
    {
      eyebrow: "Gastronomie",
      title: "Une histoire de charales",
      text: "Ces petits poissons du lac se dégustent traditionnellement frits, avec du citron, du sel et une pointe de piment.",
      imageAlt: "Charales, spécialité du lac de Chapala",
    },
  ],
  en: [
    {
      eyebrow: "Did you know?",
      title: "A hint of an inland sea",
      text: "At over 1,100 km², Lake Chapala is the largest natural lake in Mexico. From some shores, you can barely make out the other side.",
      imageAlt: "Panoramic view of Lake Chapala",
    },
    {
      eyebrow: "Geography",
      title: "A beach at 1,500 metres above sea level",
      text: "The lake sits about 1,525 metres above sea level, surrounded by mountains that help shape the region’s mild climate.",
      imageAlt: "Lake Chapala surrounded by mountains",
    },
    {
      eyebrow: "History",
      title: "The fortress of the lake",
      text: "During the war of independence, indigenous fighters held out for years on the island of Mezcala, protected by the lake’s waters.",
      imageAlt: "The historic island of Mezcala",
    },
    {
      eyebrow: "Origins",
      title: "The memory of the Coca people",
      text: "The shores of Chapala were inhabited long before the Spanish arrived. Mezcala still keeps a strong indigenous identity today.",
      imageAlt: "Village of Mezcala on the lakeshore",
    },
    {
      eyebrow: "Etymology",
      title: "A name that bubbles",
      text: "The old name of Ajijic is linked to the idea of a place where water springs or bubbles up, in reference to the region’s natural springs.",
      imageAlt: "Fountain in the village of Ajijic",
    },
    {
      eyebrow: "Culture",
      title: "Long before Instagram",
      text: "From the 20th century on, Ajijic drew artists, writers and travellers charmed by the light, the colours and the calm of the lake.",
      imageAlt: "Colourful mural in a street of Ajijic",
    },
    {
      eyebrow: "Encounters",
      title: "Welcome to the Riviera of Chapala",
      text: "Mexicans, Canadians, Americans and Europeans live side by side here, giving Ajijic an atmosphere that is both local and cosmopolitan.",
      imageAlt: "Lively square in the centre of Ajijic",
    },
    {
      eyebrow: "Heritage",
      title: "Magic officially recognised",
      text: "Since 2020, Ajijic has held the title of Pueblo Mágico, awarded to Mexican towns with an exceptional heritage.",
      imageAlt: "Monumental Ajijic letters",
    },
    {
      eyebrow: "Terroir",
      title: "Strawberries with a lake view",
      text: "Around Jocotepec, strawberries, raspberries, blackberries and blueberries play an important role in local farming.",
      imageAlt: "Red berries grown near Jocotepec",
    },
    {
      eyebrow: "Nature",
      title: "Never quite the same landscape",
      text: "The lake’s level changes with the seasons and the years, constantly reshaping the shores and the walks.",
      imageAlt: "Ever-changing shore of Lake Chapala",
    },
    {
      eyebrow: "Biodiversity",
      title: "A stopover for travelling birds",
      text: "The wetlands of Chapala host many resident and migratory birds, earning the lake international recognition.",
      imageAlt: "Water birds on Lake Chapala",
    },
    {
      eyebrow: "Gastronomy",
      title: "A story of charales",
      text: "These small lake fish are traditionally enjoyed fried, with lime, salt and a touch of chilli.",
      imageAlt: "Charales, a speciality of Lake Chapala",
    },
  ],
};

/**
 * Build the full anecdote list for a given language.
 * @param {string} language  "es" | "fr" | "en"
 * @returns {ChapalaAnecdote[]}
 */
export function chapalaAnecdotes(language) {
  const copy = ANECDOTE_COPY[language] || ANECDOTE_COPY.es;
  return ANECDOTE_META.map((meta, index) => ({
    id: meta.id,
    icon: meta.icon,
    image: chapalaImage(meta.image, { width: 900 }),
    imageFull: chapalaImage(meta.image),
    ...copy[index],
  }));
}
