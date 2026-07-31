export const SUPPORTED_LANGUAGES = ["es", "fr", "en"];

export const EVENT = {
  couple: "David & Aydé",
  date: "2027-02-20T00:00:00-06:00",
  // Anchor for the "married since" reverse counter (20/02 at 2 PM Mexico time)
  weddingDate: "2027-02-20T14:00:00-06:00",
  dateShort: "20 · 02 · 2027",

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
    shared: "https://open.spotify.com/playlist/4izmJJXTOnsUz3BQsrkZBh",
  },

};

export const content = {
  es: {
    locale: "es-MX",
    skip: "Saltar al contenido",
    metaDescription:
      "David y Aydé se casan el 20 de febrero de 2027 en Roca Azul, Jocotepec, Jalisco.",
    nav: {
      story: "Nosotros",
      weekend: "El fin de semana",
      venue: "El lugar",
      accommodation: "Alojamiento",
      travel: "Vengo de lejos",
      attire: "Vestuario",
      gift: "Regalos",
      photos: "Fotos",
      rsvp: "Confirmar",
      dashboard: "Panel",
    },
    countdown: {
      prefix: "Nos casamos en",
      years: "años",
      months: "meses",
      days: "días",
      hours: "horas",
      minutes: "min",
      arrived: "Hoy celebramos",
    },


    hero: {
      eyebrow: "Nos casamos",
      invitation: "Queremos celebrar este momento con ustedes",
      scroll: "Descubrir la invitación",
      imageNote: "Aquí irá nuestra fotografía",
      imageAlt: "David y Aydé juntos",
      selectImage: "Mostrar fotografía",
      pause: "Pausar fotos",
      play: "Reanudar fotos",
    },
    story: {
      eyebrow: "Nuestra invitación",
      title: "Un fin de semana para encontrarnos",
      body:
        "Entre México y Francia, entre nuestras familias y amistades, elegimos reunirnos junto al lago de Chapala para celebrar el amor, la amistad y todo lo que nos trajo hasta aquí.",
      note:
        "Nos hará inmensamente felices compartir este fin de semana con ustedes.",
      photosLabel: "Vistas del lago de Chapala y de Jocotepec",
      photoAlts: [
        "Atardecer sobre el lago de Chapala",
        "Vista del lago de Chapala",
        "Iglesia de Jocotepec",
        "Panorámica del lago de Chapala",
      ],
      funFacts: [
        "El lago de Chapala es el lago más grande de México.",
        "Jocotepec significa «lugar de jocotes» en náhuatl.",
        "Nos conocimos entre México y Francia, a miles de kilómetros de distancia.",
        "Roca Azul está a orillas del lago, con vistas al atardecer.",
      ],
      anecdotesLabel: "El lago de Chapala en 12 anécdotas",

    },

    gallery: {
      eyebrow: "Nuestro camino",
      title: "Una historia hecha de viajes y pequeños instantes",
      body:
        "Algunas imágenes de los lugares, las fiestas y los días cotidianos que nos trajeron hasta aquí.",
      alts: [
        "David y Aydé juntos frente al mar",
        "David besa a Aydé durante una celebración",
        "David y Aydé sonríen vestidos para una fiesta",
        "David y Aydé comparten un momento divertido",
        "David besa a Aydé en casa",
        "David y Aydé durante un paseo en México",
        "David y Aydé sonríen durante un viaje",
      ],
    },
    weekend: {
      eyebrow: "Guarden la fecha",
      title: "Tres días para celebrar",
      intro:
        "Nosotros estaremos en Roca Azul desde el jueves. Los invitados pueden llegar desde el viernes alrededor del mediodía y la celebración principal será una boda de tarde el sábado.",
      items: [
        {
          day: "Viernes 19 · desde mediodía",
          title: "Llegada y bienvenida",
          body: "Llegadas, check-in, petanca, pizzas y un primer encuentro relajado.",
        },
        {
          day: "Sábado 20 · cita 13:00",
          title: "Una boda de tarde",
          body: "Aperitivo, marimba, carnitas, ceremonia en el faro, cena y baile.",
        },

        {
          day: "Domingo 21",
          title: "Desayuno y despedida",
          body: "Una última mañana juntos antes de los regresos.",
        },
      ],
      saturday: {
        eyebrow: "Sábado 20 · programa",
        title: "La tarde, paso a paso",
        warning:
          "Quienes vengan desde Guadalajara: salgan con bastante anticipación. Los accesos hacia Jocotepec pueden congestionarse fácilmente y necesitamos que todos estén en Roca Azul a las 13:00. Mejor aún: si pueden, quédense en el lugar y compartan el viernes con nosotros. Hay muchas opciones de alojamiento, de todos los precios y todas las gamas, alrededor del lago de Chapala.",
        items: [
          { time: "13:00", title: "Llegada de invitados", body: "Bienvenida y tiempo para instalarnos." },
          { time: "14:00", title: "Aperitivo", body: "El primer brindis del día." },

          { time: "Al terminar", title: "Marimba", body: "Música en vivo para brindar y convivir." },
          { time: "Después", title: "Comida de carnitas", body: "Una comida mexicana antes de la ceremonia en el faro." },
          { time: "18:00", title: "Ceremonia en el faro", body: "El gran momento de la tarde." },
          { time: "Al terminar", title: "Mariachi y cena", body: "El mariachi abrirá la cena y el siguiente capítulo de la celebración." },
          { time: "Después de cenar", title: "Norteño y baile", body: "El norteño abrirá la pista y la fiesta." },
        ],
      },
    },
    weather: {
      eyebrow: "El clima esperado",
      title: "Sol de tarde, noche fresca",
      body:
        "A finales de febrero, Jocotepec suele vivir días secos, luminosos y templados. La boda comenzará con calor agradable y continuará con un descenso claro de temperatura después del atardecer.",
      facts: [
        { value: "≈ 27 °C", label: "máxima habitual", note: "Durante la tarde" },
        { value: "≈ 8–10 °C", label: "mínima habitual", note: "Al final de la noche" },
        { value: "3–5 %", label: "probabilidad climática de lluvia", note: "En un día típico de febrero" },
        { value: "≈ 18:55", label: "puesta de sol", note: "Muy cerca de la ceremonia en el faro" },
      ],
      moments: [
        { time: "13:00–17:30", title: "Tarde luminosa", body: "Sol y temperatura agradable a cálida; convienen protector solar, lentes y agua." },
        { time: "18:00", title: "Ceremonia y atardecer", body: "La luz comenzará a bajar durante la ceremonia en el faro." },
        { time: "Desde 19:00", title: "La noche refresca", body: "La temperatura puede bajar rápido junto al lago." },
      ],
      adviceTitle: "Qué traer",
      advice: [
        "Una capa ligera, saco, suéter o chal para la cena y el baile.",
        "Protector solar y lentes de sol para las primeras horas.",
        "Calzado cómodo para jardines y espacios exteriores.",
      ],
      disclaimer:
        "Esto es una referencia climática, no un pronóstico. Publicaremos aquí la previsión real aproximadamente diez días antes de la boda.",
    },
    food: {
      eyebrow: "A la mesa",
      title: "Un fin de semana para probar, brindar y compartir",
      body:
        "Queremos que cada comida sea sencilla, generosa y muy mexicana. Este es el menú que estamos imaginando; todavía puede crecer con sus ideas.",
      flavoursEyebrow: "Sabores de Jalisco y México",
      flavoursTitle: "¿Qué vamos a probar?",
      flavours: [
        {
          key: "carnitas",
          title: "Carnitas",
          body: "Cerdo cocido lentamente hasta quedar tierno y dorado, servido con tortillas, cebolla, cilantro, salsas y limón.",
        },
        {
          key: "taquiza",
          title: "Taquiza",
          body: "Una mesa con varios guisos mexicanos, tortillas calientes y acompañamientos para que cada quien arme sus propios tacos.",
        },
        {
          key: "tejuino",
          title: "Tejuino",
          body: "Bebida tapatía de maíz fermentado, dulce y ácida, servida muy fría con limón y sal. También habrá tejuino loco con tequila o mezcal.",
        },
        {
          key: "nopales",
          title: "Ensalada de nopales",
          body: "Nopal tierno con tomate, cebolla, hierbas y queso: una opción fresca, mexicana y vegetariana.",
        },
        {
          key: "guacamole",
          title: "Guacamole y opciones vegetarianas",
          body: "Habrá guacamole, tortillas, salsas y otros acompañamientos sin carne. Podrán indicar sus restricciones en el RSVP.",
        },
      ],
      days: [
        {
          day: "Viernes por la noche",
          title: "Bienvenida con pizzas",
          items: [
            "Pizzas para compartir después de las llegadas y la petanca.",
            "Una primera noche informal para encontrarnos sin prisas.",
          ],
        },
        {
          day: "Sábado",
          title: "De las carnitas a la taquiza",
          items: [
            "Desayuno incluido para quienes se hospedan en las cabañas.",
            "Carnitas para la comida.",
            "Tejuino y opción de tejuino loco con tequila o mezcal.",
            "Taquiza por la noche.",
            "Postre por decidir: ¿jericalla, gelatinas o algo más?",
          ],
        },
        {
          day: "Domingo",
          title: "Último desayuno juntos",
          items: [
            "Desayuno incluido para quienes se hospedan en las cabañas.",
            "Una mañana tranquila antes de las despedidas o de seguir hacia la costa.",
          ],
        },
      ],
      note:
        "Los detalles siguen en preparación. También estamos considerando agua, bebidas sin alcohol, café, opciones para niñas y niños y necesidades alimentarias especiales.",
      photoCredits: "Créditos de las fotografías",
      drinks: {
        eyebrow: "Para brindar",
        title: "La política de municiones",
        body:
          "Tendremos una cantidad razonable de alcohol por invitado, principalmente cerveza y tequila, además de refrescos y opciones sin alcohol.",
        note:
          "Si quieren asegurarse de que su noche quede especialmente bien regada, pueden traer sus propias municiones para compartir y disfrutar responsablemente.",
      },
    },
    music: {
      eyebrow: "Música en vivo",
      title: "Escuchar, bailar y también cantar",
      body:
        "La música acompañará cada cambio de energía del sábado, desde el final de la ceremonia hasta la pista de baile.",
      acts: [
        {
          moment: "Después del aperitivo",
          name: "Marimba",
          note: "Para acompañar el primer brindis antes de las carnitas.",
        },

        {
          moment: "Después de la ceremonia en el faro",
          name: "Mariachi",
          note: "Una entrada festiva para abrir la cena.",
        },
        {
          moment: "Después de la cena",
          name: "Norteño",
          note: "Para abrir la fiesta, cantar y empezar a bailar.",
        },
        {
          moment: "Si se animan",
          name: "Una banda francesa",
          note: "Un pequeño puente musical entre nuestras dos culturas.",
        },
      ],
      stage: {
        eyebrow: "Escena abierta",
        title: "¿Hay una canción que quieran cantar?",
        body:
          "Agreguen aquí sus títulos para el ambiente, el baile o el karaoke. Quizá podamos aprovechar a alguno de los músicos en vivo para acompañarlos y convertir una canción en un momento inolvidable.",
      },
      playlists: {
        eyebrow: "Escuchen desde ahora",
        title: "La banda sonora empieza aquí",
        body:
          "Tres playlists para entrar en ambiente, descubrir canciones y empezar a preparar sus grandes interpretaciones.",
        general: {
          title: "Ambiente de la boda",
          body: "La selección general para viajar, brindar, convivir y bailar.",
        },
        karaoke: {
          title: "Karaoke",
          body: "Las canciones candidatas para tomar el micrófono y cantar juntos.",
        },
        shared: {
          title: "Playlist colaborativa",
          body: "Una lista abierta para que todos agreguen sus canciones favoritas.",
        },
        button: "Abrir en Spotify",
      },
    },
    suggestions: {
      fields: {
        name: "Su nombre",
        dessert: "¿Qué postre prefieren?",
        food: "¿Qué falta o qué les gustaría agregar?",
        song: "Canción sugerida",
        artist: "Artista o versión",
        sing: "¿Quieren cantarla?",
        extra: "Otra idea para la fiesta",
        genres: "¿Qué géneros no pueden faltar?",
      },
      genres: [
        "Cumbia",
        "Salsa",
        "Bachata",
        "Reggaetón",
        "Norteño",
        "Banda",
        "Mariachi",
        "Ranchera",
        "Pop",
        "Rock",
        "Electrónica",
        "Hip-hop",
        "Jazz",
        "Soul / Funk",
        "Disco",
        "Música francesa",
        "Música de los 80",
        "Música de los 90",
        "Baladas",
        "Karaoke",
      ],

      options: {
        dessert: [
          { value: "jericalla", label: "Jericalla" },
          { value: "gelatinas", label: "Gelatinas" },
          { value: "both", label: "¡Las dos!" },
          { value: "other", label: "Tengo otra sugerencia" },
        ],
        sing: [
          { value: "yes", label: "Sí, me gustaría cantarla" },
          { value: "maybe", label: "Tal vez, anímenme" },
          { value: "request", label: "Solo quiero escucharla" },
        ],
      },
      button: "Enviar mis sugerencias",
      previewNote:
        "Sus canciones, votos e ideas se guardarán de forma privada.",
    },
    facilities: {
      eyebrow: "El lugar",
      title: "Todo el club para disfrutar",
      body:
        "Entre un momento y otro, cada quien podrá convivir con sus vecinos, explorar las instalaciones o simplemente descansar en su alojamiento.",
      videoTitle: "Video de presentación de Roca Azul",
      privacyTitle: "Privacidad",
      privacyBody:
        "Todas las cabañas estarán rentadas por los invitados de la boda, unas 80 a 90 personas. Además, otros invitados del matrimonio se alojarán cerca, quizá no muy lejos, o vendrán solo por el día: unas 60 personas según las estimaciones actuales. Aun así, el club no será completamente privado ese fin de semana: algunos espacios aún albergan tiendas de campaña o casas rodantes. Compartiremos el lugar y respetaremos el descanso. La música podrá sonar hasta las 2 de la madrugada; después continuaremos en las cabañas.",

      gallery: [
        { key: "cabins", title: "Cabañas", alt: "Cabañas y habitaciones de Roca Azul" },
        { key: "pool", title: "Albercas", alt: "Alberca y jardines del Club Roca Azul" },
        { key: "courts", title: "Deporte", alt: "Canchas deportivas de Roca Azul" },
        { key: "gardens", title: "Jardines", alt: "Áreas verdes del Club Roca Azul" },
      ],
      gallerySource: "Fotografías del lugar: Club Roca Azul",
      rocaGalleryLabel: "Galería de fotografías del Club Roca Azul",
      rocaGalleryAlts: [
        "Vista del Club Roca Azul",
        "Jardines del Club Roca Azul",
        "Alberca del Club Roca Azul",
        "Cabañas del Club Roca Azul",
        "Lago de Chapala desde Roca Azul",
        "Atardecer en Roca Azul",
      ],
      groups: [
        {
          title: "Agua y bienestar",
          items: [
            "Dos piscinas exteriores, una de ellas climatizada",
            "Baños termales y baños públicos",
            "Baño de vapor y sauna",
            "Sombrillas y zonas con vistas",
          ],
        },
        {
          title: "Deporte y movimiento",
          items: [
            "Pista y equipamiento de tenis",
            "Tours a pie y en bicicleta",
            "Billar con costo adicional",
          ],
        },
        {
          title: "Familias y exteriores",
          items: [
            "Jardines, terrazas y zonas de picnic",
            "Mobiliario y chimenea exterior",
            "Juegos exteriores, juegos de mesa y noches de cine",
            "Zona de juegos para niñas y niños",
          ],
        },
        {
          title: "Servicios prácticos",
          items: [
            "Restaurante y bar",
            "Wi‑Fi y estacionamiento gratuitos",
            "Accesibilidad para personas con movilidad reducida",
            "Habitaciones familiares y sin humo",
            "Mascotas admitidas; pueden aplicar suplementos",
          ],
        },
      ],
      note:
        "Lista basada en los servicios publicados por Roca Azul. Algunos espacios, horarios, actividades o suplementos deberán confirmarse cerca de la fecha.",
    },
    accommodation: {
      eyebrow: "Alojamiento",
      title: "Dormir cerca, organizarnos a tiempo",
      body:
        "Contamos con alojamiento en el lugar para aproximadamente 80 personas. Como necesitamos distribuir las cabañas y las habitaciones con cuidado, les pedimos que nos indiquen cuanto antes si desean aprovechar esta opción.",
      facts: [
        { value: "≈ 80", label: "lugares disponibles" },
        { value: "$500 MXN", label: "por persona y noche" },
        { value: "2", label: "desayunos incluidos" },
      ],
      specialNote:
        "El alojamiento se reserva únicamente como paquete completo de dos noches, del viernes 19 al domingo 21: no es posible reservar una sola noche. El precio estimado es de $500 MXN por persona y por noche e incluye los dos desayunos del fin de semana; compartiremos más detalles próximamente. Nuestros queridos padrinos tienen el alojamiento de regalo. Si prefieren organizar su estancia por su cuenta, no hay ningún problema: solo necesitamos saberlo con anticipación.",
      contactPrompt:
        "Si les interesa este plan, escríbannos directamente por WhatsApp:",
      cabinsShowcase: {
        eyebrow: "Conozcan las cabañas",
        privateVideoEyebrow: "Video privado",
        privateVideoTitle: "Un recorrido por las cabañas",
        key: "azalea",
        title: "Azalea",
        intro:
          "La primera cabaña de nuestro catálogo: amplia, con espacios comunes para convivir y capacidad anunciada para 12 personas.",
        capacity: "12 personas",
        roomsLabel: "3 habitaciones",
        bedsLabel: "7 camas descritas",
        rooms: [
          "Habitación 1 · 2 camas matrimoniales",
          "Habitación 2 · 2 camas matrimoniales",
          "Habitación 3 · 3 camas individuales",
        ],
        amenities:
          "Las fotografías muestran sala, comedor, cocina, barra y baño con ducha.",
        galleryLabel: "Galería de Azalea",
        photoAlts: [
          "Comedor y espacio común de la cabaña Azalea",
          "Sala y comedor de la cabaña Azalea",
          "Sala de la cabaña Azalea",
          "Habitación con dos camas matrimoniales en Azalea",
          "Segunda habitación con dos camas matrimoniales en Azalea",
          "Habitación con tres camas individuales en Azalea",
          "Baño con ducha de la cabaña Azalea",
          "Cocina equipada de la cabaña Azalea",
          "Barra y cocina de la cabaña Azalea",
        ],
        note:
          "La distribución final de huéspedes será confirmada directamente por nosotros.",
        additionalUnits: [
          {
            key: "dalia",
            title: "Dalia",
            intro:
              "Una cabaña luminosa junto a la alberca, con tres habitaciones y diez couchages perfectamente identificados.",
            capacity: "10 personas",
            roomsLabel: "3 habitaciones",
            bedsLabel: "7 camas · 10 lugares",
            rooms: [
              "Habitación 1 · 2 camas matrimoniales",
              "Habitación 2 · 4 camas individuales en 2 literas",
              "Habitación 3 · 1 cama matrimonial",
            ],
            amenities:
              "Las fotografías muestran sala, comedor, baño con ducha y vista hacia la alberca.",
            galleryLabel: "Galería de Dalia",
            photoAlts: [
              "Comedor de la cabaña Dalia junto a la alberca",
              "Sala de la cabaña Dalia",
              "Habitación con dos camas matrimoniales en Dalia",
              "Habitación con cuatro camas individuales en literas en Dalia",
              "Habitación con una cama matrimonial en Dalia",
              "Baño con ducha de la cabaña Dalia",
              "Segunda vista del baño con ducha de la cabaña Dalia",
            ],
            note:
              "El costo interno registrado es de $11,150 MXN por las dos noches; la asignación y el importe final por persona serán confirmados directamente.",
          },
          {
            key: "margarita",
            title: "Margarita",
            intro:
              "Una cabaña alegre en tonos amarillos, con tres habitaciones, espacios comunes luminosos y jardín con fogatero.",
            capacity: "10 personas",
            roomsLabel: "3 habitaciones",
            bedsLabel: "7 camas · 10 lugares",
            rooms: [
              "Habitación 1 · 2 camas matrimoniales",
              "Habitación 2 · 4 camas individuales en 2 literas",
              "Habitación 3 · 1 cama matrimonial",
            ],
            amenities:
              "Las fotografías muestran sala-comedor, cocina con barra, baño con ducha, jardín y fogatero exterior.",
            galleryLabel: "Galería de Margarita",
            photoAlts: [
              "Área común interior de la cabaña Margarita",
              "Habitación con cuatro camas individuales en literas en Margarita",
              "Baño con ducha de la cabaña Margarita",
              "Habitación con dos camas matrimoniales en Margarita",
              "Cocina con barra de la cabaña Margarita",
              "Comedor de la cabaña Margarita",
              "Habitación con una cama matrimonial en Margarita",
              "Jardín y fogatero exterior de la cabaña Margarita",
            ],
            note:
              "El costo interno registrado es de $11,150 MXN por las dos noches; la asignación y el importe final por persona serán confirmados directamente.",
          },
          {
            key: "wooden",
            title: "Cabañas de madera 31–34",
            intro:
              "Cuatro cabañas independientes entre los árboles, ideales para parejas o familias pequeñas que quieren un espacio más íntimo.",
            capacity: "4 cabañas",
            roomsLabel: "2 adultos por unidad",
            bedsLabel: "Hasta 2 menores",
            rooms: [
              "Unidades disponibles · 31, 32, 33 y 34",
              "Cada unidad · 1 cama king size",
              "Cada unidad · 1 sofá cama matrimonial",
            ],
            amenities:
              "Las fotografías y el video muestran terraza, refrigerador, lavabo, televisión y un interior completamente revestido de madera.",
            galleryLabel: "Galería de las cabañas de madera 31 a 34",
            photoAlts: [
              "Exterior de una cabaña de madera entre los árboles",
              "Entrada de la cabaña de madera número 34",
              "Cama king size dentro de una cabaña de madera",
              "Sofá cama y equipamiento interior de una cabaña de madera",
            ],
            videoLabel: "Recorrido en video · 16 s",
            note:
              "Tarifa interna por unidad y por las dos noches: $5,310 MXN para 2 adultos, o $5,790 MXN para 2 adultos y 2 menores. Confirmaremos directamente la asignación y el importe final.",
          },
        ],
      },
      plan: {
        eyebrow: "¿Cómo funciona?",
        title: "Díganos qué prefieren",
        body:
          "Su respuesta nos permitirá reservar las cabañas de manera justa y organizada.",
        steps: [
          "Indiquen su preferencia de alojamiento en el RSVP.",
          "Organizaremos las cabañas según grupos, fechas y disponibilidad.",
          "Confirmaremos directamente la asignación, el precio final y la forma de pago.",
        ],
        button: "Responder al RSVP",
      },
    },
    travel: {
      eyebrow: "Vengo de lejos",
      title: "Su viaje también forma parte de la celebración",
      body:
        "Acompañaremos personalmente a quienes vienen desde Europa y otros lugares: elección de vuelos, llegada a Guadalajara, alojamiento y traslados.",
      points: [
        "Madrid–Guadalajara es la ruta directa prioritaria desde Europa.",
        "Coordinaremos las recogidas cuando tengamos sus números de vuelo.",
        "Cada viajero tendrá un itinerario de llegada, estancia y regreso.",
      ],
      routes: {
        eyebrow: "Mapa de trayectos",
        title: "Llegar a Roca Azul y seguir hacia la costa",
        note:
          "Tiempos aproximados en sábado y sujetos a tráfico. Las rutas de llegada indicadas son libres; los importes de casetas son estimaciones por trayecto.",
        venue: "Roca Azul · Jocotepec",
        originsLabel: "Hacia la boda",
        destinationsLabel: "Después de la boda",
        mapLabel: "Mapa de Roca Azul y sus alrededores",
        directionsLabel: "Cómo llegar (rutas en Google Maps)",
        origins: [
          { place: "Centro de Guadalajara", duration: "≈ 1 h 30", detail: "Ruta libre" },

          { place: "Nuestra casa · Tesistán", duration: "≈ 1 h 45", detail: "Ruta libre" },
          { place: "Aeropuerto GDL", duration: "≈ 1 h", detail: "Ruta libre" },
        ],
        destinations: [
          {
            place: "Barra de Navidad",
            duration: "≈ 5 h",
            detail: "Libre · Cocula → Autlán → Barra",
          },
          {
            place: "Barra de Navidad",
            duration: "≈ 4 h 45",
            detail: "Vía Manzanillo · casetas ≈ $500 MXN",
          },
        {
          place: "Manzanillo",
          duration: "≈ 4 h 30",
          detail: "Casetas ≈ $500 MXN",
        },
      ],
      maps: {
        venueLabel: "Cómo llegar al lugar",
        beachLabel: "Cómo llegar a la playa",
      },
    },
      cta: "Compartir mis datos de viaje",

      ctaNote: "El formulario privado ya está disponible más abajo.",
    },
    attire: {
      eyebrow: "Vestuario",
      title: "Estética mexicana y código de vestimenta",
      body:
        "Hemos elegido una estética mexicana para nuestra boda como un homenaje a la cultura, la comida, la música y el lugar que nos reúne. Queremos que todo se sienta festivo, colorido y profundamente mexicano.",
      dressCode: {
        title: "No hay código de vestimenta",
        body:
          "Queremos que se sientan ustedes mismos, sin disfraces. Si quieren ser elegantes, sean elegantes; si quieren ir relajados, vayan relajados. Lo importante es que se sientan cómodos. Tengan en cuenta que necesitarán un conjunto completo de ropa: habrá natación, baño de vapor, deportes, la ceremonia, el baile y, si la noche se alarga junto a la fogata, un suéter ligero.",
      },
      guestNote:
        "Lo más importante es que se sientan cómodos y celebren con nosotros. Si tienen dudas, escríbanos.",

    },
    gift: {
      eyebrow: "Regalos",
      title: "Lo más importante es su presencia",
      body:
        "Su compañía es el mejor regalo que podemos recibir. Si además desean hacernos un detalle, agradecemos cualquier contribución para nuestra luna de miel o nuestros proyectos de pareja.",
      note:
        "No hay ninguna obligación ni expectativa — lo que realmente nos hace felices es compartir este fin de semana con ustedes.",
      accounts: {
        eur: {
          title: "Transferencia en EUR (SEPA)",
          details: [
            "Nombre: David AILI",
            "IBAN: BE43 9671 3798 6001",
            "Swift/BIC: TRWIBEB1XXX",
            "Banco: Wise, Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium",
          ],
          note: "Solo para transferencias SEPA en EUR.",
        },
        mx: {
          title: "Transferencia en MXN",
          details: [
            "Cuenta Clave: 012 320 01559313382 0",
            "Banco: BBVA",
            "Nombre: David AILI",
          ],
        },
      },
      cta: "Hablar con los novios",
    },
    coast: {
      eyebrow: "¿Y después?",
      title: "Prolongar el gusto de estar juntos",
      body:
        "La fiesta no termina el domingo. Hemos preparado dos planes para seguir disfrutando juntos, y cada quien elige el que mejor le venga.",
      plans: [
        {
          title: "Plan 1 · Quedarse en Roca Azul",
          body:
            "Rentar una cabaña dos noches más, del domingo al martes, para seguir conviviendo en el lugar. Si les interesa, indíquenlo en el RSVP y organizaremos la cabaña para su grupo.",
        },
        {
          title: "Plan 2 · La playa",
          body:
            "Del martes al sábado nos vamos a la costa. No es luna de miel — están todos cordialmente invitados a seguir la fiesta en Barra de Navidad. Podemos organizar transportes en común.",
        },
      ],
      note:
        "Las fechas exactas, el transporte y el presupuesto dependerán del número de personas interesadas. Una noche de hotel en Barra de Navidad en esta temporada ronda los $1,200–$2,500 MXN por persona.",
      form: {
        eyebrow: "Sondeo sin compromiso",
        title: "¿Se apuntan?",
        body:
          "Cuéntennos qué plan les interesa para ir organizando la logística.",
        fields: {
          name: "Nombre",
          interest: "Nivel de interés",
          partySize: "Personas interesadas",
          plan: "Plan que les interesa",
          destination: "Destino preferido",
          style: "Forma de alojarse",
          note: "Fechas, presupuesto o comentarios",
        },
        options: {
          interest: [
            { value: "yes", label: "Sí, me interesa" },
            { value: "maybe", label: "Tal vez, quiero más detalles" },
            { value: "no", label: "No esta vez" },
          ],
          plan: [
            { value: "venue", label: "Plan 1 · Quedarme en Roca Azul (dom–mar)" },
            { value: "playa", label: "Plan 2 · La playa (mar–sáb)" },
            { value: "both", label: "Ambos planes" },
          ],
          destination: [
            { value: "barra", label: "Barra de Navidad" },
            { value: "other", label: "Tengo otra idea" },
          ],
          style: [
            { value: "shared", label: "Hotel o casas organizados en grupo" },
            { value: "independent", label: "Cada quien reserva por su cuenta" },
            { value: "day", label: "Solo reunirme para playa y cena" },
          ],
        },
        button: "Enviar mi interés",
        previewNote:
          "Vista previa: este sondeo se activará junto con el RSVP privado.",
      },
    },

    rsvp: {
      eyebrow: "RSVP",
      title: "¿Nos acompañan?",
      body:
        "Una sola respuesta nos permitirá organizar su asistencia, alojamiento y viaje. Si todavía no tienen sus vuelos, podrán enviarlos más adelante.",
      groups: {
        attendance: "Asistencia y alojamiento",
        travel: "Vengo desde lejos",
        notes: "Un último detalle",
      },
      petanque: {
        eyebrow: "Torneo de petanca",
        intro: "El viernes por la tarde organizaremos un torneo de petanca. ¿Se apuntan?",
        organizerLabel: "Organiza: David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "¿Participan en el torneo?",
          partySize: "¿Cuántas personas?",
          names: "Nombres de los participantes",
          namesPlaceholder: "Ej. David, Aydé, Dimitar…",
          ownBoules: "¿Traen sus propias boules?",
        },
        options: {
          participation: [
            { value: "yes", label: "Sí, queremos jugar" },
            { value: "no", label: "No esta vez" },
            { value: "maybe", label: "Tal vez, decidan por nosotros" },
          ],
          ownBoules: [
            { value: "yes", label: "Sí, traemos" },
            { value: "no", label: "No, necesitamos" },
          ],
        },
      },
      travelNote:
        "Completen esta parte únicamente si viajan desde otra ciudad o país. Necesitamos los datos del trayecto de llegada y de regreso para coordinar los traslados.",
      fields: {
        fullName: "Nombre completo",
        whatsapp: "WhatsApp (para las comunicaciones posteriores)",

        attendance: "¿Nos acompañan?",
        groupMode: "¿Responden solos o en grupo?",
        groupName: "Nombre del grupo o familia",
        partySize: "Personas en su grupo",
        adults: "Adultos de 18 años o más",
        children: "Menores de 18 años",
        guests: "Nombres de acompañantes",
        accommodation: "Plan de alojamiento",
        independentArrival: "¿Cuándo piensan llegar a Roca Azul?",
        sundayMorning: "¿Nos veremos el domingo por la mañana?",
        travelStatus: "Situación de su viaje",
        arrivalFrom: "Llegada desde",
        arrivalTo: "Llegada a",
        arrivalDate: "Fecha de llegada",
        arrivalTime: "Hora estimada de llegada",
        arrivalAirline: "Compañía de llegada",
        arrivalFlight: "Número de vuelo de llegada",
        departureFrom: "Regreso desde",
        departureTo: "Regreso a",
        departureDate: "Fecha de regreso",
        departureTime: "Hora estimada de salida",
        departureAirline: "Compañía de regreso",
        departureFlight: "Número de vuelo de regreso",
        route: "Ruta completa y escalas",
        routePlaceholder: "Ej. Málaga → Madrid → Guadalajara",
        notes: "Restricciones alimentarias, movilidad o comentarios",
      },
      options: {
        attendance: [
          { value: "yes", label: "Sí, con mucho gusto" },
          { value: "no", label: "No podré acompañarlos" },
          { value: "maybe", label: "Todavía no lo sé" },
        ],
        groupMode: [
          { value: "solo", label: "Respondo solo por mí" },
          { value: "group", label: "Respondo por un grupo o familia" },
        ],
        accommodation: [
          {
            value: "onsite_two_nights",
            label: "Sí: paquete completo de 2 noches en Roca Azul",
          },
          {
            value: "independent",
            label: "No: organizaré todo mi alojamiento por mi cuenta",
          },
        ],
        independentArrival: [
          { value: "friday", label: "Desde el viernes" },
          { value: "saturday", label: "Únicamente el sábado" },
        ],
        sundayMorning: [
          { value: "yes", label: "Sí, estaremos ahí" },
          { value: "no", label: "No, nos iremos antes" },
          { value: "maybe", label: "Todavía no lo sabemos" },
        ],
        travelStatus: [
          { value: "booked", label: "Viajo desde lejos y ya tengo billetes" },
          {
            value: "planning",
            label: "Viajo desde lejos, pero aún estoy organizándolo",
          },
          { value: "local", label: "No necesito coordinación de viaje" },
        ],
      },
      button: "Enviar mi respuesta",
      previewNote:
        "Su respuesta se guardará de forma privada y solo los novios podrán consultarla.",
    },
    footer: {
      line: "Con amor, desde México y Francia",
      privacy: "Invitación privada · Respuestas protegidas",
    },
  },
  fr: {
    locale: "fr-FR",
    skip: "Aller au contenu",
    metaDescription:
      "David et Aydé se marient le 20 février 2027 à Roca Azul, Jocotepec, Jalisco.",
    nav: {
      story: "Nous",
      weekend: "Le week-end",
      venue: "Le lieu",
      accommodation: "Hébergement",
      travel: "Je viens de loin",
      attire: "Tenues",
      gift: "Cadeaux",
      photos: "Photos",
      rsvp: "Répondre",
      dashboard: "Tableau",
    },
    countdown: {
      prefix: "Mariés dans",
      years: "ans",
      months: "mois",
      days: "jours",
      hours: "heures",
      minutes: "min",
      arrived: "Aujourd’hui, on célèbre",
    },


    hero: {
      eyebrow: "Nous nous marions",
      invitation: "Nous voulons vivre ce moment avec vous",
      scroll: "Découvrir l’invitation",
      imageNote: "Notre photographie viendra ici",
      imageAlt: "David et Aydé ensemble",
      selectImage: "Afficher la photographie",
      pause: "Pause photos",
      play: "Relancer les photos",
    },
    story: {
      eyebrow: "Notre invitation",
      title: "Un week-end pour se retrouver",
      body:
        "Entre le Mexique et la France, entre nos familles et nos amis, nous avons choisi de nous réunir à Jocotepec, au bord du lac de Chapala, pour célébrer l’amour, l’amitié et tout ce qui nous a conduits jusqu’ici.",

      note:
        "Nous serons immensément heureux de partager ce week-end avec vous.",
      photosLabel: "Vues du lac de Chapala et de Jocotepec",
      photoAlts: [
        "Coucher de soleil sur le lac de Chapala",
        "Vue du lac de Chapala",
        "Église de Jocotepec",
        "Panorama du lac de Chapala",
      ],
      funFacts: [
        "Le lac de Chapala est le plus grand lac du Mexique.",
        "Jocotepec signifie « lieu des jocotes » en nahuatl.",
        "Nous nous sommes rencontrés entre le Mexique et la France, à des milliers de kilomètres.",
        "Roca Azul se trouve au bord du lac, face au coucher de soleil.",
      ],
      anecdotesLabel: "Le lac de Chapala en 12 anecdotes",

    },

    gallery: {
      eyebrow: "Notre chemin",
      title: "Une histoire faite de voyages et de petits instants",
      body:
        "Quelques images des lieux, des fêtes et des jours ordinaires qui nous ont conduits jusqu’ici.",
      alts: [
        "David et Aydé ensemble au bord de la mer",
        "David embrasse Aydé pendant une fête",
        "David et Aydé sourient en tenue de fête",
        "David et Aydé partagent un moment complice",
        "David embrasse Aydé à la maison",
        "David et Aydé pendant une promenade au Mexique",
        "David et Aydé sourient pendant un voyage",
      ],
    },
    weekend: {
      eyebrow: "Réservez la date",
      title: "Trois jours pour célébrer",
      intro:
        "Nous serons à Roca Azul dès le jeudi. Les invités pourront arriver à partir du vendredi vers midi, et la célébration principale sera un mariage d’après-midi le samedi.",
      items: [
        {
          day: "Vendredi 19 · dès midi",
          title: "Arrivée et bienvenue",
          body: "Check-in, pétanque, pizzas et premières retrouvailles.",
        },
        {
          day: "Samedi 20 · rendez-vous 13 h",
          title: "Un mariage d’après-midi",
          body: "Apéro, marimba, carnitas, cérémonie au phare, dîner et danse.",
        },

        {
          day: "Dimanche 21",
          title: "Petit-déjeuner et au revoir",
          body: "Une dernière matinée ensemble avant les départs.",
        },
      ],
      saturday: {
        eyebrow: "Samedi 20 · programme",
        title: "L’après-midi, pas à pas",
        warning:
          "Pour celles et ceux qui viennent de Guadalajara : partez très en avance. Les accès vers Jocotepec peuvent facilement être embouteillés et nous avons besoin que tout le monde soit à Roca Azul à 13 h. Encore mieux : si vous le pouvez, restez sur place et partagez le vendredi avec nous. Il y a de nombreuses offres d’hébergement, à tous les prix et toutes les gammes, autour du lac de Chapala.",
        items: [
          { time: "13 h", title: "Arrivée des invités", body: "Accueil et temps pour s’installer." },
          { time: "14 h", title: "Apéro", body: "Le premier toast de la journée." },

          { time: "À la suite", title: "Marimba", body: "Musique live pour trinquer et se retrouver." },
          { time: "Puis", title: "Déjeuner de carnitas", body: "Un repas mexicain avant la cérémonie au phare." },
          { time: "18 h", title: "Cérémonie au phare", body: "Le grand moment de l’après-midi." },
          { time: "À la suite", title: "Mariachi et dîner", body: "Le mariachi ouvrira le dîner et la suite de la célébration." },
          { time: "Après dîner", title: "Norteño et danse", body: "Le norteño ouvrira la piste et la fête." },
        ],
      },
    },
    weather: {
      eyebrow: "La météo habituelle",
      title: "Soleil l’après-midi, fraîcheur le soir",
      body:
        "Fin février, Jocotepec connaît généralement des journées sèches, lumineuses et douces. Le mariage commencera sous une chaleur agréable, puis la température baissera nettement après le coucher du soleil.",
      facts: [
        { value: "≈ 27 °C", label: "maximale habituelle", note: "Pendant l’après-midi" },
        { value: "≈ 8–10 °C", label: "minimale habituelle", note: "En fin de nuit" },
        { value: "3–5 %", label: "risque climatique de pluie", note: "Pour une journée typique de février" },
        { value: "≈ 18 h 55", label: "coucher du soleil", note: "Presque au même moment que la cérémonie au phare" },
      ],
      moments: [
        { time: "13 h–17 h 30", title: "Après-midi lumineuse", body: "Soleil et douceur à chaleur ; crème solaire, lunettes et eau seront utiles." },
        { time: "18 h", title: "Cérémonie et coucher du soleil", body: "La lumière commencera à baisser pendant la cérémonie au phare." },
        { time: "Dès 19 h", title: "La soirée se rafraîchit", body: "La température peut baisser rapidement au bord du lac." },
      ],
      adviceTitle: "À prévoir",
      advice: [
        "Une veste légère, un pull ou un châle pour le dîner et la danse.",
        "De la crème solaire et des lunettes pour les premières heures.",
        "Des chaussures confortables pour les jardins et les espaces extérieurs.",
      ],
      disclaimer:
        "Il s’agit d’une tendance climatique, pas d’une prévision. La météo réelle sera publiée ici environ dix jours avant le mariage.",
    },
    food: {
      eyebrow: "À table",
      title: "Un week-end pour goûter, trinquer et partager",
      body:
        "Nous voulons que chaque repas soit simple, généreux et profondément mexicain. Voici le menu que nous imaginons ; il peut encore évoluer grâce à vos idées.",
      flavoursEyebrow: "Saveurs du Jalisco et du Mexique",
      flavoursTitle: "Qu’allons-nous goûter ?",
      flavours: [
        {
          key: "carnitas",
          title: "Carnitas",
          body: "Du porc longuement confit jusqu’à devenir tendre et doré, servi avec tortillas, oignon, coriandre, sauces et citron vert.",
        },
        {
          key: "taquiza",
          title: "Taquiza",
          body: "Une table de plusieurs plats mijotés mexicains, tortillas chaudes et garnitures pour que chacun compose ses propres tacos.",
        },
        {
          key: "tejuino",
          title: "Tejuino",
          body: "Une boisson typique de Guadalajara à base de maïs fermenté, douce et acidulée, servie très fraîche avec citron vert et sel. Version « loco » à la tequila ou au mezcal en option.",
        },
        {
          key: "nopales",
          title: "Salade de nopales",
          body: "Du cactus nopal tendre avec tomate, oignon, herbes et fromage : une option fraîche, mexicaine et végétarienne.",
        },
        {
          key: "guacamole",
          title: "Guacamole et options végétariennes",
          body: "Il y aura du guacamole, des tortillas, des sauces et d’autres accompagnements sans viande. Vous pourrez préciser vos restrictions dans le RSVP.",
        },
      ],
      days: [
        {
          day: "Vendredi soir",
          title: "Bienvenue autour des pizzas",
          items: [
            "Des pizzas à partager après les arrivées et la pétanque.",
            "Une première soirée informelle pour se retrouver sans se presser.",
          ],
        },
        {
          day: "Samedi",
          title: "Des carnitas à la taquiza",
          items: [
            "Petit-déjeuner inclus pour les personnes logées dans les cabanes.",
            "Carnitas pour le déjeuner.",
            "Tejuino, avec option tejuino loco à la tequila ou au mezcal.",
            "Taquiza dans la soirée.",
            "Dessert à choisir : jericalla, gelées mexicaines ou autre chose ?",
          ],
        },
        {
          day: "Dimanche",
          title: "Un dernier petit-déjeuner ensemble",
          items: [
            "Petit-déjeuner inclus pour les personnes logées dans les cabanes.",
            "Une matinée tranquille avant les départs ou la suite vers la côte.",
          ],
        },
      ],
      note:
        "Les détails sont encore en préparation. Nous pensons aussi à l’eau, aux boissons sans alcool, au café, aux options pour les enfants et aux besoins alimentaires particuliers.",
      photoCredits: "Crédits photographiques",
      drinks: {
        eyebrow: "Pour trinquer",
        title: "La politique des munitions",
        body:
          "Nous prévoirons une quantité raisonnable d’alcool par invité, principalement de la bière et de la tequila, ainsi que des sodas et des boissons sans alcool.",
        note:
          "Si vous voulez être certains que la soirée soit particulièrement bien arrosée, vous pouvez apporter vos propres munitions, à partager et à savourer avec modération.",
      },
    },
    music: {
      eyebrow: "Musique live",
      title: "Écouter, danser et aussi chanter",
      body:
        "La musique accompagnera chaque changement d’énergie du samedi, de la fin de la cérémonie jusqu’à la piste de danse.",
      acts: [
        {
          moment: "Après l’apéro",
          name: "Marimba",
          note: "Pour accompagner le premier verre avant les carnitas.",
        },

        {
          moment: "Après la cérémonie au phare",
          name: "Mariachi",
          note: "Une entrée festive pour ouvrir le dîner.",
        },
        {
          moment: "Après le dîner",
          name: "Norteño",
          note: "Pour ouvrir la fête, chanter et commencer à danser.",
        },
        {
          moment: "S’ils se lancent",
          name: "Un groupe français",
          note: "Un petit pont musical entre nos deux cultures.",
        },
      ],
      stage: {
        eyebrow: "Scène ouverte",
        title: "Une chanson que vous aimeriez chanter ?",
        body:
          "Ajoutez ici vos titres pour l’ambiance, la danse ou le karaoké. Nous pourrons peut-être profiter de la présence des musiciens pour vous accompagner et en faire un moment inoubliable.",
      },
      playlists: {
        eyebrow: "À écouter dès maintenant",
        title: "La bande-son commence ici",
        body:
          "Trois playlists pour se mettre dans l’ambiance, découvrir des chansons et préparer vos plus belles interprétations.",
        general: {
          title: "Ambiance du mariage",
          body: "La sélection générale pour voyager, trinquer, se retrouver et danser.",
        },
        karaoke: {
          title: "Karaoké",
          body: "Les chansons candidates pour prendre le micro et chanter ensemble.",
        },
        shared: {
          title: "Playlist collaborative",
          body: "Une liste ouverte pour que chacun ajoute ses chansons préférées.",
        },
        button: "Ouvrir dans Spotify",
      },
    },
    suggestions: {
      fields: {
        name: "Votre nom",
        dessert: "Quel dessert préférez-vous ?",
        food: "Que manque-t-il ou qu’aimeriez-vous ajouter ?",
        song: "Chanson proposée",
        artist: "Artiste ou version",
        sing: "Souhaitez-vous la chanter ?",
        extra: "Une autre idée pour la fête",
        genres: "Quels genres ne peuvent pas manquer ?",
      },
      genres: [
        "Cumbia",
        "Salsa",
        "Bachata",
        "Reggaeton",
        "Norteño",
        "Banda",
        "Mariachi",
        "Ranchera",
        "Pop",
        "Rock",
        "Électro",
        "Hip-hop",
        "Jazz",
        "Soul / Funk",
        "Disco",
        "Musique française",
        "Années 80",
        "Années 90",
        "Ballades",
        "Karaoké",
      ],

      options: {
        dessert: [
          { value: "jericalla", label: "Jericalla" },
          { value: "gelatinas", label: "Gelées mexicaines" },
          { value: "both", label: "Les deux !" },
          { value: "other", label: "J’ai une autre suggestion" },
        ],
        sing: [
          { value: "yes", label: "Oui, j’aimerais la chanter" },
          { value: "maybe", label: "Peut-être, encouragez-moi" },
          { value: "request", label: "Je veux simplement l’entendre" },
        ],
      },
      button: "Envoyer mes suggestions",
      previewNote:
        "Vos chansons, votes et idées seront enregistrés de façon privée.",
    },
    facilities: {
      eyebrow: "Le lieu",
      title: "Tout le club à votre disposition",
      body:
        "Entre deux moments, chacun pourra retrouver ses voisins, profiter des installations ou simplement se reposer dans son hébergement.",
      videoTitle: "Vidéo de présentation de Roca Azul",
      privacyTitle: "Intimité",
      privacyBody:
        "Toutes les cabanes seront louées par les invités du mariage, environ 80 à 90 personnes. En outre, d’autres invités du mariage seront logés non loin, peut-être à proximité, ou viendront seulement pour la journée : environ 60 personnes selon les estimations actuelles. Le club ne sera toutefois pas entièrement privé ce week-end : certains espaces accueillent encore des tentes ou des caravanes. Nous partagerons les lieux et respecterons le calme. La musique pourra jouer jusqu’à 2 h du matin, puis nous continuerons dans les cabanes.",

      gallery: [
        { key: "cabins", title: "Cabanes", alt: "Cabanes et chambres de Roca Azul" },
        { key: "pool", title: "Piscines", alt: "Piscine et jardins du Club Roca Azul" },
        { key: "courts", title: "Sport", alt: "Terrains de sport de Roca Azul" },
        { key: "gardens", title: "Jardins", alt: "Espaces verts du Club Roca Azul" },
      ],
      gallerySource: "Photos du lieu : Club Roca Azul",
      rocaGalleryLabel: "Galerie de photos du Club Roca Azul",
      rocaGalleryAlts: [
        "Vue du Club Roca Azul",
        "Jardins du Club Roca Azul",
        "Piscine du Club Roca Azul",
        "Cabanes du Club Roca Azul",
        "Lac de Chapala depuis Roca Azul",
        "Coucher de soleil à Roca Azul",
      ],
      groups: [
        {
          title: "Eau et bien-être",
          items: [
            "Deux piscines extérieures, dont une chauffée",
            "Bains thermaux et bains publics",
            "Bain de vapeur et sauna",
            "Parasols et espaces avec vue",
          ],
        },
        {
          title: "Sport et mouvement",
          items: [
            "Court et équipement de tennis",
            "Promenades à pied et à vélo",
            "Billard avec supplément",
          ],
        },
        {
          title: "Familles et extérieurs",
          items: [
            "Jardins, terrasses et aires de pique-nique",
            "Mobilier et cheminée extérieurs",
            "Jeux extérieurs, jeux de société et soirées cinéma",
            "Aire de jeux pour enfants",
          ],
        },
        {
          title: "Services pratiques",
          items: [
            "Restaurant et bar",
            "Wi‑Fi et parking gratuits",
            "Accessibilité pour les personnes à mobilité réduite",
            "Chambres familiales et non-fumeurs",
            "Animaux acceptés ; supplément possible",
          ],
        },
      ],
      note:
        "Liste fondée sur les services publiés par Roca Azul. Certains espaces, horaires, activités ou suppléments devront être confirmés à l’approche de la date.",
    },
    accommodation: {
      eyebrow: "Hébergement",
      title: "Dormir sur place, nous organiser à temps",
      body:
        "Nous disposons d’environ 80 places sur le lieu. Comme les cabanes et les chambres doivent être réparties avec soin, merci de nous indiquer dès que possible si cette option vous intéresse.",
      facts: [
        { value: "≈ 80", label: "places disponibles" },
        { value: "500 MXN", label: "par personne et par nuit" },
        { value: "2", label: "petits-déjeuners inclus" },
      ],
      specialNote:
        "L’hébergement se réserve uniquement sous la forme d’un forfait complet de deux nuits, du vendredi 19 au dimanche 21 : une seule nuit n’est pas possible. Le tarif estimatif est de 500 MXN par personne et par nuit et comprend les deux petits-déjeuners du week-end ; davantage de détails suivront prochainement. L’hébergement est offert à nos chers padrinos. Si vous préférez organiser votre séjour de votre côté, aucun souci : nous avons simplement besoin de le savoir à l’avance.",
      contactPrompt:
        "Si cette formule vous intéresse, écrivez-nous directement sur WhatsApp :",
      cabinsShowcase: {
        eyebrow: "Découvrez les cabanes",
        privateVideoEyebrow: "Vidéo privée",
        privateVideoTitle: "Une visite des cabanes",
        key: "azalea",
        title: "Azalea",
        intro:
          "La première cabane de notre catalogue : spacieuse, avec de belles pièces communes et une capacité annoncée de 12 personnes.",
        capacity: "12 personnes",
        roomsLabel: "3 chambres",
        bedsLabel: "7 lits décrits",
        rooms: [
          "Chambre 1 · 2 lits doubles",
          "Chambre 2 · 2 lits doubles",
          "Chambre 3 · 3 lits simples",
        ],
        amenities:
          "Les photos montrent un salon, une salle à manger, une cuisine, un comptoir et une salle de bain avec douche.",
        galleryLabel: "Galerie d’Azalea",
        photoAlts: [
          "Salle à manger et espace commun de la cabane Azalea",
          "Salon et salle à manger de la cabane Azalea",
          "Salon de la cabane Azalea",
          "Chambre avec deux lits doubles dans Azalea",
          "Deuxième chambre avec deux lits doubles dans Azalea",
          "Chambre avec trois lits simples dans Azalea",
          "Salle de bain avec douche de la cabane Azalea",
          "Cuisine équipée de la cabane Azalea",
          "Comptoir et cuisine de la cabane Azalea",
        ],
        note:
          "Nous confirmerons directement la répartition finale des invités.",
        additionalUnits: [
          {
            key: "dalia",
            title: "Dalia",
            intro:
              "Une cabane lumineuse près de la piscine, avec trois chambres et dix couchages parfaitement identifiés.",
            capacity: "10 personnes",
            roomsLabel: "3 chambres",
            bedsLabel: "7 lits · 10 couchages",
            rooms: [
              "Chambre 1 · 2 lits doubles",
              "Chambre 2 · 4 lits simples dans 2 lits superposés",
              "Chambre 3 · 1 lit double",
            ],
            amenities:
              "Les photos montrent un salon, une salle à manger, une salle de bain avec douche et une vue vers la piscine.",
            galleryLabel: "Galerie de Dalia",
            photoAlts: [
              "Salle à manger de la cabane Dalia près de la piscine",
              "Salon de la cabane Dalia",
              "Chambre avec deux lits doubles dans Dalia",
              "Chambre avec quatre lits simples superposés dans Dalia",
              "Chambre avec un lit double dans Dalia",
              "Salle de bain avec douche de Dalia",
              "Deuxième vue de la salle de bain avec douche de Dalia",
            ],
            note:
              "Le coût interne enregistré est de 11 150 MXN pour les deux nuits ; l’attribution et le montant final par personne seront confirmés directement.",
          },
          {
            key: "margarita",
            title: "Margarita",
            intro:
              "Une cabane joyeuse aux tons jaunes, avec trois chambres, des espaces communs lumineux et un jardin avec foyer extérieur.",
            capacity: "10 personnes",
            roomsLabel: "3 chambres",
            bedsLabel: "7 lits · 10 couchages",
            rooms: [
              "Chambre 1 · 2 lits doubles",
              "Chambre 2 · 4 lits simples dans 2 lits superposés",
              "Chambre 3 · 1 lit double",
            ],
            amenities:
              "Les photos montrent un salon-salle à manger, une cuisine avec comptoir, une salle de bain avec douche, un jardin et un foyer extérieur.",
            galleryLabel: "Galerie de Margarita",
            photoAlts: [
              "Espace commun intérieur de la cabane Margarita",
              "Chambre avec quatre lits simples superposés dans Margarita",
              "Salle de bain avec douche de Margarita",
              "Chambre avec deux lits doubles dans Margarita",
              "Cuisine avec comptoir de la cabane Margarita",
              "Salle à manger de la cabane Margarita",
              "Chambre avec un lit double dans Margarita",
              "Jardin et foyer extérieur de la cabane Margarita",
            ],
            note:
              "Le coût interne enregistré est de 11 150 MXN pour les deux nuits ; l’attribution et le montant final par personne seront confirmés directement.",
          },
          {
            key: "wooden",
            title: "Cabanes en bois 31–34",
            intro:
              "Quatre cabanes indépendantes sous les arbres, idéales pour les couples ou petites familles qui souhaitent un espace plus intime.",
            capacity: "4 cabanes",
            roomsLabel: "2 adultes par unité",
            bedsLabel: "Jusqu’à 2 mineurs",
            rooms: [
              "Unités disponibles · 31, 32, 33 et 34",
              "Dans chaque unité · 1 lit king size",
              "Dans chaque unité · 1 canapé-lit double",
            ],
            amenities:
              "Les photos et la vidéo montrent une terrasse, un réfrigérateur, un lavabo, une télévision et un intérieur entièrement habillé de bois.",
            galleryLabel: "Galerie des cabanes en bois 31 à 34",
            photoAlts: [
              "Extérieur d’une cabane en bois sous les arbres",
              "Entrée de la cabane en bois numéro 34",
              "Lit king size dans une cabane en bois",
              "Canapé-lit et équipements intérieurs d’une cabane en bois",
            ],
            videoLabel: "Visite vidéo · 16 s",
            note:
              "Tarif interne par unité pour les deux nuits : 5 310 MXN pour 2 adultes, ou 5 790 MXN pour 2 adultes et 2 mineurs. Nous confirmerons directement l’attribution et le montant final.",
          },
        ],
      },
      plan: {
        eyebrow: "Comment ça marche ?",
        title: "Dites-nous ce que vous préférez",
        body:
          "Votre réponse nous permettra de répartir les cabanes de façon juste et organisée.",
        steps: [
          "Indiquez votre préférence d’hébergement dans le RSVP.",
          "Nous organiserons les cabanes selon les groupes, les dates et les disponibilités.",
          "Nous confirmerons directement l’attribution, le tarif final et le paiement.",
        ],
        button: "Répondre au RSVP",
      },
    },
    travel: {
      eyebrow: "Je viens de loin",
      title: "Votre voyage fait aussi partie de la fête",
      body:
        "Nous accompagnerons personnellement celles et ceux qui viennent d’Europe et d’ailleurs : choix des vols, arrivée à Guadalajara, hébergement et transferts.",
      points: [
        "Madrid–Guadalajara est la liaison directe prioritaire depuis l’Europe.",
        "Nous coordonnerons les accueils dès réception de vos numéros de vol.",
        "Chaque voyageur aura un itinéraire d’arrivée, de séjour et de retour.",
      ],
      routes: {
        eyebrow: "Schéma des trajets",
        title: "Rejoindre Roca Azul, puis continuer vers la côte",
        note:
          "Durées approximatives un samedi et variables selon la circulation. Les itinéraires d’arrivée indiqués sont gratuits ; les montants de péage sont estimés par trajet.",
        venue: "Roca Azul · Jocotepec",
        originsLabel: "Vers le mariage",
        destinationsLabel: "Après le mariage",
        mapLabel: "Carte de Roca Azul et de ses environs",
        directionsLabel: "Itinéraires (routes sur Google Maps)",
        origins: [
          { place: "Centre de Guadalajara", duration: "≈ 1 h 30", detail: "Route gratuite" },

          { place: "Notre maison · Tesistán", duration: "≈ 1 h 45", detail: "Route gratuite" },
          { place: "Aéroport GDL", duration: "≈ 1 h", detail: "Route gratuite" },
        ],
        destinations: [
          {
            place: "Barra de Navidad",
            duration: "≈ 5 h",
            detail: "Sans péage · Cocula → Autlán → Barra",
          },
          {
            place: "Barra de Navidad",
            duration: "≈ 4 h 45",
            detail: "Via Manzanillo · péages ≈ 500 MXN",
          },
          {
            place: "Manzanillo",
            duration: "≈ 4 h 30",
            detail: "Péages ≈ 500 MXN",
          },
        ],
        maps: {
          venueLabel: "Comment rejoindre le lieu",
          beachLabel: "Comment rejoindre la plage",
        },
      },
      cta: "Partager mes informations de voyage",

      ctaNote: "Le formulaire privé est maintenant disponible plus bas.",
    },
    attire: {
      eyebrow: "Tenues",
      title: "Esthétique mexicaine et code vestimentaire",
      body:
        "Nous avons choisi une esthétique mexicaine pour notre mariage en hommage à la culture, la cuisine, la musique et le lieu qui nous réunit. Nous voulons que tout soit festif, coloré et profondément mexicain.",
      dressCode: {
        title: "Pas de code vestimentaire",
        body:
          "Nous voulons que vous soyez vous-mêmes, sans déguisement. Si vous voulez être élégants, soyez élégants ; si vous préférez être décontractés, soyez décontractés. L’important est que vous vous sentiez à l’aise. Prévoyez une tenue complète : il y aura de la natation, un bain de vapeur, du sport, la cérémonie, la danse et, si la soirée se prolonge autour du feu, un pull léger.",
      },
      guestNote:
        "Le plus important est que vous soyez à l'aise et que vous célébriez avec nous. Si vous avez des questions, écrivez-nous.",

    },
    gift: {
      eyebrow: "Cadeaux",
      title: "Le plus beau cadeau, c'est votre présence",

      body:
        "Votre présence est le plus beau cadeau que nous puissions recevoir. Si vous souhaitez tout de même nous faire un geste, nous serons touchés par toute contribution pour notre lune de miel ou nos projets de couple.",
      note:
        "Il n'y a aucune obligation ni attente — ce qui nous rend vraiment heureux, c'est de partager ce week-end avec vous.",
      accounts: {
        eur: {
          title: "Virement en EUR (SEPA)",
          details: [
            "Nom : David AILI",
            "IBAN : BE43 9671 3798 6001",
            "Swift/BIC : TRWIBEB1XXX",
            "Banque : Wise, Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium",
          ],
          note: "Uniquement pour les virements SEPA en EUR.",
        },
        mx: {
          title: "Virement en MXN",
          details: [
            "Cuenta Clave : 012 320 01559313382 0",
            "Banque : BBVA",
            "Nom : David AILI",
          ],
        },
      },
      cta: "Parler aux mariés",
    },
    coast: {
      eyebrow: "Et après ?",
      title: "Prolonger le plaisir d’être ensemble",
      body:
        "La fête ne s’arrête pas dimanche. Nous avons préparé deux plans pour continuer à profiter ensemble, et chacun choisit celui qui lui convient le mieux.",
      plans: [
        {
          title: "Plan 1 · Rester à Roca Azul",
          body:
            "Louer une cabane deux nuits de plus, du dimanche au mardi, pour continuer à se retrouver sur place. Si cela vous intéresse, indiquez-le dans le RSVP et nous organiserons la cabane pour votre groupe.",
        },
        {
          title: "Plan 2 · La plage",
          body:
            "Du mardi au samedi, nous partons sur la côte. Ce n’est pas une lune de miel — vous êtes tous cordialement invités à continuer la fête à Barra de Navidad. Nous pouvons organiser des transports en commun.",
        },
      ],
      note:
        "Les dates exactes, le transport et le budget dépendront du nombre de personnes intéressées. Une nuit d’hôtel à Barra de Navidad à cette saison coûte environ 1 200–2 500 MXN par personne.",
      form: {
        eyebrow: "Sondage sans engagement",
        title: "Vous vous inscrivez ?",
        body:
          "Dites-nous quel plan vous intéresse pour qu’on commence à organiser la logistique.",
        fields: {
          name: "Nom",
          interest: "Niveau d’intérêt",
          partySize: "Personnes intéressées",
          plan: "Plan qui vous intéresse",
          destination: "Destination préférée",
          style: "Formule d’hébergement",
          note: "Dates, budget ou commentaires",
        },
        options: {
          interest: [
            { value: "yes", label: "Oui, cela m’intéresse" },
            { value: "maybe", label: "Peut-être, j’aimerais plus de détails" },
            { value: "no", label: "Pas cette fois" },
          ],
          plan: [
            { value: "venue", label: "Plan 1 · Rester à Roca Azul (dim–mar)" },
            { value: "playa", label: "Plan 2 · La plage (mar–sam)" },
            { value: "both", label: "Les deux plans" },
          ],
          destination: [
            { value: "barra", label: "Barra de Navidad" },
            { value: "other", label: "J’ai une autre idée" },
          ],
          style: [
            { value: "shared", label: "Hôtel ou maisons organisés en groupe" },
            { value: "independent", label: "Chacun réserve de son côté" },
            { value: "day", label: "Seulement plage et dîner ensemble" },
          ],
        },
        button: "Envoyer mon intérêt",
        previewNote:
          "Aperçu : ce sondage sera activé avec le RSVP privé.",
      },
    },

    rsvp: {
      eyebrow: "RSVP",
      title: "Serez-vous avec nous ?",
      body:
        "Une seule réponse nous permettra d’organiser votre présence, votre hébergement et votre voyage. Si vos vols ne sont pas encore réservés, vous pourrez nous les transmettre plus tard.",
      groups: {
        attendance: "Présence et hébergement",
        travel: "Je viens de loin",
        notes: "Un dernier détail",
      },
      petanque: {
        eyebrow: "Tournoi de pétanque",
        intro: "Le vendredi après-midi, nous organiserons un tournoi de pétanque. Vous participez ?",
        organizerLabel: "Organise : David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "Participez-vous au tournoi ?",
          partySize: "Combien de personnes ?",
          names: "Noms des participants",
          namesPlaceholder: "Ex. David, Aydé, Dimitar…",
          ownBoules: "Apportez-vous vos propres boules ?",
        },
        options: {
          participation: [
            { value: "yes", label: "Oui, nous voulons jouer" },
            { value: "no", label: "Pas cette fois" },
            { value: "maybe", label: "Peut-être, décidez pour nous" },
          ],
          ownBoules: [
            { value: "yes", label: "Oui, nous apportons" },
            { value: "no", label: "Non, nous avons besoin" },
          ],
        },
      },
      travelNote:
        "Remplissez cette partie uniquement si vous venez d’une autre ville ou d’un autre pays. Nous avons besoin des trajets aller et retour pour organiser les transferts.",
      fields: {
        fullName: "Nom complet",
        whatsapp: "WhatsApp (pour les communications à venir)",

        attendance: "Serez-vous avec nous ?",
        groupMode: "Répondez-vous seul·e ou en groupe ?",
        groupName: "Nom du groupe ou de la famille",
        partySize: "Personnes dans votre groupe",
        adults: "Adultes de 18 ans ou plus",
        children: "Mineurs de moins de 18 ans",
        guests: "Noms des accompagnants",
        accommodation: "Projet d’hébergement",
        independentArrival: "Quand pensez-vous arriver à Roca Azul ?",
        sundayMorning: "Nous verrons-nous dimanche matin ?",
        travelStatus: "État de votre voyage",
        arrivalFrom: "Arrivée depuis",
        arrivalTo: "Arrivée à",
        arrivalDate: "Date d’arrivée",
        arrivalTime: "Heure d’arrivée estimée",
        arrivalAirline: "Compagnie à l’arrivée",
        arrivalFlight: "Numéro du vol d’arrivée",
        departureFrom: "Retour depuis",
        departureTo: "Retour vers",
        departureDate: "Date de retour",
        departureTime: "Heure de départ estimée",
        departureAirline: "Compagnie au retour",
        departureFlight: "Numéro du vol retour",
        route: "Itinéraire complet et escales",
        routePlaceholder: "Ex. Málaga → Madrid → Guadalajara",
        notes: "Régime alimentaire, mobilité ou commentaires",
      },
      options: {
        attendance: [
          { value: "yes", label: "Oui, avec grand plaisir" },
          { value: "no", label: "Je ne pourrai pas être présent·e" },
          { value: "maybe", label: "Je ne sais pas encore" },
        ],
        groupMode: [
          { value: "solo", label: "Je réponds uniquement pour moi" },
          { value: "group", label: "Je réponds pour un groupe ou une famille" },
        ],
        accommodation: [
          {
            value: "onsite_two_nights",
            label: "Oui : forfait complet de 2 nuits à Roca Azul",
          },
          {
            value: "independent",
            label: "Non : j’organiserai tout mon hébergement de mon côté",
          },
        ],
        independentArrival: [
          { value: "friday", label: "Dès le vendredi" },
          { value: "saturday", label: "Uniquement le samedi" },
        ],
        sundayMorning: [
          { value: "yes", label: "Oui, nous serons là" },
          { value: "no", label: "Non, nous partirons avant" },
          { value: "maybe", label: "Nous ne le savons pas encore" },
        ],
        travelStatus: [
          { value: "booked", label: "Je viens de loin et mes billets sont réservés" },
          {
            value: "planning",
            label: "Je viens de loin, mais mon voyage est encore en préparation",
          },
          { value: "local", label: "Je n’ai pas besoin de coordination de voyage" },
        ],
      },
      button: "Envoyer ma réponse",
      previewNote:
        "Votre réponse sera enregistrée de façon privée et accessible uniquement aux mariés.",
    },
    footer: {
      line: "Avec amour, depuis le Mexique et la France",
      privacy: "Invitation privée · Réponses protégées",
    },
  },
  en: {
    locale: "en-GB",
    skip: "Skip to content",
    metaDescription:
      "David and Aydé are getting married on February 20, 2027 at Roca Azul in Jocotepec, Jalisco.",
    nav: {
      story: "Us",
      weekend: "The weekend",
      venue: "The venue",
      accommodation: "Accommodation",
      travel: "Coming from afar",
      attire: "Attire",
      gift: "Gifts",
      photos: "Photos",
      rsvp: "RSVP",
      dashboard: "Dashboard",
    },
    countdown: {
      prefix: "Married in",
      years: "years",
      months: "months",
      days: "days",
      hours: "hours",
      minutes: "min",
      arrived: "Today we celebrate",
    },


    hero: {
      eyebrow: "We are getting married",
      invitation: "We want to celebrate this moment with you",
      scroll: "Discover the invitation",
      imageNote: "Our photograph will go here",
      imageAlt: "David and Aydé together",
      selectImage: "Show photograph",
      pause: "Pause photos",
      play: "Resume photos",
    },
    story: {
      eyebrow: "Our invitation",
      title: "A weekend to come together",
      body:
        "Between Mexico and France, surrounded by our families and friends, we chose the shores of Lake Chapala to celebrate love, friendship, and everything that brought us here.",
      note: "It will make us immensely happy to share this weekend with you.",
      photosLabel: "Views of Lake Chapala and Jocotepec",
      photoAlts: [
        "Sunset over Lake Chapala",
        "View of Lake Chapala",
        "Jocotepec church",
        "Panorama of Lake Chapala",
      ],
      funFacts: [
        "Lake Chapala is the largest lake in Mexico.",
        "Jocotepec means “place of jocotes” in Nahuatl.",
        "We met between Mexico and France, thousands of kilometres apart.",
        "Roca Azul sits on the lake shore, facing the sunset.",
      ],
      anecdotesLabel: "Lake Chapala in 12 anecdotes",

    },

    gallery: {
      eyebrow: "Our journey",
      title: "A story made of travels and little moments",
      body:
        "A few glimpses of the places, celebrations, and ordinary days that brought us here.",
      alts: [
        "David and Aydé together by the sea",
        "David kisses Aydé during a celebration",
        "David and Aydé smile in their party clothes",
        "David and Aydé share a playful moment",
        "David kisses Aydé at home",
        "David and Aydé on an outing in Mexico",
        "David and Aydé smile during a trip",
      ],
    },
    weekend: {
      eyebrow: "Save the date",
      title: "Three days to celebrate",
      intro:
        "We will be at Roca Azul from Thursday. Guests may arrive from around midday on Friday, and Saturday’s main celebration will be an afternoon wedding.",
      items: [
        {
          day: "Friday 19 · from midday",
          title: "Arrival and welcome",
          body: "Check-in, pétanque, pizzas, and a relaxed first evening together.",
        },
        {
          day: "Saturday 20 · arrive at 1 pm",
          title: "An afternoon wedding",
          body: "Aperitif, marimba, carnitas, lighthouse ceremony, dinner, and dancing.",
        },

        {
          day: "Sunday 21",
          title: "Breakfast and farewell",
          body: "One final morning together before the journeys home.",
        },
      ],
      saturday: {
        eyebrow: "Saturday 20 · programme",
        title: "The afternoon, step by step",
        warning:
          "If you are travelling from Guadalajara, please leave plenty of time. The roads into Jocotepec can become congested very easily, and everyone needs to be at Roca Azul by 1 pm. Even better: if you can, stay on site and share Friday with us. There are plenty of accommodation options, at every price and in every range, around Lake Chapala.",
        items: [
          { time: "1 pm", title: "Guest arrival", body: "Welcome and time to settle in." },
          { time: "2 pm", title: "Aperitif", body: "The first toast of the day." },

          { time: "Afterwards", title: "Marimba", body: "Live music for drinks and time together." },
          { time: "Then", title: "Carnitas lunch", body: "A Mexican meal before the lighthouse ceremony." },
          { time: "6 pm", title: "Lighthouse ceremony", body: "The defining moment of the afternoon." },
          { time: "Afterwards", title: "Mariachi and dinner", body: "Mariachi will open dinner and the next chapter of the celebration." },
          { time: "After dinner", title: "Norteño and dancing", body: "Norteño will open the dance floor and the party." },
        ],
      },
    },
    weather: {
      eyebrow: "Typical weather",
      title: "Afternoon sunshine, a cool evening",
      body:
        "Late February in Jocotepec is usually dry, bright, and mild. The wedding should begin in pleasant warmth, followed by a noticeable temperature drop after sunset.",
      facts: [
        { value: "≈ 27 °C", label: "typical high", note: "During the afternoon" },
        { value: "≈ 8–10 °C", label: "typical low", note: "Late at night" },
        { value: "3–5%", label: "climatological rain chance", note: "On a typical February day" },
        { value: "≈ 6:55 pm", label: "sunset", note: "Very close to the lighthouse ceremony" },
      ],
      moments: [
        { time: "1–5:30 pm", title: "A bright afternoon", body: "Sunny and pleasantly warm; sunscreen, sunglasses, and water will help." },
        { time: "6 pm", title: "Ceremony and sunset", body: "The light will begin to fade during the lighthouse ceremony." },
        { time: "From 7 pm", title: "A cooler evening", body: "Temperatures can fall quickly beside the lake." },
      ],
      adviceTitle: "What to bring",
      advice: [
        "A light jacket, sweater, or wrap for dinner and dancing.",
        "Sunscreen and sunglasses for the first part of the day.",
        "Comfortable shoes for gardens and outdoor areas.",
      ],
      disclaimer:
        "This is a climate guide, not a forecast. We will publish the actual weather outlook here around ten days before the wedding.",
    },
    food: {
      eyebrow: "At the table",
      title: "A weekend to taste, toast, and share",
      body:
        "We want every meal to feel simple, generous, and unmistakably Mexican. This is the menu we are imagining, and it can still grow with your ideas.",
      flavoursEyebrow: "Flavours of Jalisco and Mexico",
      flavoursTitle: "What will we be tasting?",
      flavours: [
        {
          key: "carnitas",
          title: "Carnitas",
          body: "Pork cooked slowly until tender and golden, served with tortillas, onion, coriander, salsa, and lime.",
        },
        {
          key: "taquiza",
          title: "Taquiza",
          body: "A spread of Mexican stews, warm tortillas, and toppings so everyone can assemble their own tacos.",
        },
        {
          key: "tejuino",
          title: "Tejuino",
          body: "A sweet-and-tangy Guadalajara drink made from fermented corn, served ice-cold with lime and salt. A tequila or mezcal “tejuino loco” will also be available.",
        },
        {
          key: "nopales",
          title: "Nopal cactus salad",
          body: "Tender nopal cactus with tomato, onion, herbs, and cheese: a fresh, Mexican, vegetarian option.",
        },
        {
          key: "guacamole",
          title: "Guacamole and vegetarian options",
          body: "There will be guacamole, tortillas, salsas, and other meat-free sides. You can share dietary restrictions in the RSVP.",
        },
      ],
      days: [
        {
          day: "Friday evening",
          title: "A pizza welcome",
          items: [
            "Pizzas to share after arrivals and pétanque.",
            "A relaxed first evening to reconnect without rushing.",
          ],
        },
        {
          day: "Saturday",
          title: "From carnitas to taquiza",
          items: [
            "Breakfast included for guests staying in the cabins.",
            "Carnitas for lunch.",
            "Tejuino, with a tejuino loco option using tequila or mezcal.",
            "A taquiza in the evening.",
            "Dessert to decide: jericalla, Mexican jellies, or something else?",
          ],
        },
        {
          day: "Sunday",
          title: "One last breakfast together",
          items: [
            "Breakfast included for guests staying in the cabins.",
            "A peaceful morning before farewells or continuing to the coast.",
          ],
        },
      ],
      note:
        "Details are still being prepared. We are also considering water, alcohol-free drinks, coffee, children’s options, and special dietary needs.",
      photoCredits: "Photo credits",
      drinks: {
        eyebrow: "For the toast",
        title: "Our drinks policy",
        body:
          "We will provide a reasonable amount of alcohol per guest, mainly beer and tequila, together with soft drinks and alcohol-free options.",
        note:
          "If you want to make absolutely sure your evening is especially well supplied, you are welcome to bring your own ammunition to share and enjoy responsibly.",
      },
    },
    music: {
      eyebrow: "Live music",
      title: "Listen, dance, and sing too",
      body:
        "Music will accompany every shift in energy on Saturday, from the end of the ceremony to the dance floor.",
      acts: [
        {
          moment: "After the aperitif",
          name: "Marimba",
          note: "For the first toast before the carnitas.",
        },

        {
          moment: "After the lighthouse ceremony",
          name: "Mariachi",
          note: "A festive opening to dinner.",
        },
        {
          moment: "After dinner",
          name: "Norteño",
          note: "To open the party, sing, and start dancing.",
        },
        {
          moment: "If they are up for it",
          name: "A French band",
          note: "A small musical bridge between our two cultures.",
        },
      ],
      stage: {
        eyebrow: "Open stage",
        title: "Is there a song you would like to sing?",
        body:
          "Add your tracks here for the atmosphere, dancing, or karaoke. We may be able to invite one of the live musicians to accompany you and turn a song into an unforgettable moment.",
      },
      playlists: {
        eyebrow: "Listen from now",
        title: "The soundtrack starts here",
        body:
          "Three playlists to set the mood, discover songs, and prepare your greatest performances.",
        general: {
          title: "Wedding atmosphere",
          body: "The general selection for travelling, toasting, connecting, and dancing.",
        },
        karaoke: {
          title: "Karaoke",
          body: "Candidate songs for taking the microphone and singing together.",
        },
        shared: {
          title: "Collaborative playlist",
          body: "An open list for everyone to add their favourite songs.",
        },
        button: "Open in Spotify",
      },
    },
    suggestions: {
      fields: {
        name: "Your name",
        dessert: "Which dessert would you prefer?",
        food: "What is missing or what would you add?",
        song: "Song suggestion",
        artist: "Artist or version",
        sing: "Would you like to sing it?",
        extra: "Another idea for the celebration",
        genres: "Which genres are a must?",
      },
      genres: [
        "Cumbia",
        "Salsa",
        "Bachata",
        "Reggaeton",
        "Norteño",
        "Banda",
        "Mariachi",
        "Ranchera",
        "Pop",
        "Rock",
        "Electronic",
        "Hip-hop",
        "Jazz",
        "Soul / Funk",
        "Disco",
        "French music",
        "80s music",
        "90s music",
        "Ballads",
        "Karaoke",
      ],

      options: {
        dessert: [
          { value: "jericalla", label: "Jericalla" },
          { value: "gelatinas", label: "Mexican jellies" },
          { value: "both", label: "Both!" },
          { value: "other", label: "I have another suggestion" },
        ],
        sing: [
          { value: "yes", label: "Yes, I would like to sing it" },
          { value: "maybe", label: "Maybe—encourage me" },
          { value: "request", label: "I only want to hear it" },
        ],
      },
      button: "Send my suggestions",
      previewNote:
        "Your songs, votes, and ideas will be saved privately.",
    },
    facilities: {
      eyebrow: "The venue",
      title: "The whole club to enjoy",
      body:
        "Between shared moments, everyone can spend time with their neighbours, explore the facilities, or simply rest in their accommodation.",
      videoTitle: "Roca Azul presentation video",
      privacyTitle: "Privacy",
      privacyBody:
        "All the cabins will be rented by guests of the wedding, around 80 to 90 people. In addition, other wedding guests will be staying nearby, perhaps not far away, or will come only for the day: around 60 people according to current estimates. Even so, the club will not be entirely private that weekend: some areas still host tents or trailers. We will share the space and respect the quiet. Music can play until 2 am, after which we will continue in the cabins.",

      gallery: [
        { key: "cabins", title: "Cabins", alt: "Cabins and guest rooms at Roca Azul" },
        { key: "pool", title: "Pools", alt: "Pool and gardens at Club Roca Azul" },
        { key: "courts", title: "Sport", alt: "Sports courts at Roca Azul" },
        { key: "gardens", title: "Gardens", alt: "Green spaces at Club Roca Azul" },
      ],
      gallerySource: "Venue photographs: Club Roca Azul",
      rocaGalleryLabel: "Club Roca Azul photo gallery",
      rocaGalleryAlts: [
        "View of Club Roca Azul",
        "Gardens at Club Roca Azul",
        "Pool at Club Roca Azul",
        "Cabins at Club Roca Azul",
        "Lake Chapala from Roca Azul",
        "Sunset at Roca Azul",
      ],
      groups: [
        {
          title: "Water and wellness",
          items: [
            "Two outdoor pools, one of them heated",
            "Thermal and public baths",
            "Steam room and sauna",
            "Sun umbrellas and areas with views",
          ],
        },
        {
          title: "Sport and movement",
          items: [
            "Tennis court and equipment",
            "Walking and cycling tours",
            "Billiards at an additional cost",
          ],
        },
        {
          title: "Families and outdoors",
          items: [
            "Gardens, terraces, and picnic areas",
            "Outdoor furniture and fireplace",
            "Outdoor games, board games, and movie nights",
            "Children’s play area",
          ],
        },
        {
          title: "Practical services",
          items: [
            "Restaurant and bar",
            "Free Wi‑Fi and parking",
            "Accessibility for guests with reduced mobility",
            "Family and non-smoking rooms",
            "Pets allowed; supplements may apply",
          ],
        },
      ],
      note:
        "This list is based on services published by Roca Azul. Some spaces, opening hours, activities, or supplements will need confirmation closer to the date.",
    },
    accommodation: {
      eyebrow: "Accommodation",
      title: "Stay close, help us plan ahead",
      body:
        "We have accommodation at the venue for approximately 80 people. As the cabins and rooms need to be allocated carefully, please let us know as soon as possible if you would like to use this option.",
      facts: [
        { value: "≈ 80", label: "places available" },
        { value: "MXN 500", label: "per person, per night" },
        { value: "2", label: "breakfasts included" },
      ],
      specialNote:
        "Accommodation is available only as a complete two-night package, from Friday 19 to Sunday 21; one-night bookings are not possible. The estimated price is MXN 500 per person, per night and includes both weekend breakfasts; more details will follow soon. Accommodation is our gift to our beloved padrinos. If you prefer to arrange your own accommodation, that is absolutely fine—we simply need to know in advance.",
      contactPrompt:
        "If you are interested in this plan, contact us directly on WhatsApp:",
      cabinsShowcase: {
        eyebrow: "Explore the cabins",
        privateVideoEyebrow: "Private video",
        privateVideoTitle: "A tour of the cabins",
        key: "azalea",
        title: "Azalea",
        intro:
          "The first cabin in our catalogue: spacious, with generous shared areas and an advertised capacity of 12 guests.",
        capacity: "12 guests",
        roomsLabel: "3 bedrooms",
        bedsLabel: "7 listed beds",
        rooms: [
          "Bedroom 1 · 2 double beds",
          "Bedroom 2 · 2 double beds",
          "Bedroom 3 · 3 single beds",
        ],
        amenities:
          "The photographs show a living room, dining room, kitchen, breakfast bar, and bathroom with shower.",
        galleryLabel: "Azalea gallery",
        photoAlts: [
          "Dining room and shared area in the Azalea cabin",
          "Living and dining room in the Azalea cabin",
          "Living room in the Azalea cabin",
          "Bedroom with two double beds in Azalea",
          "Second bedroom with two double beds in Azalea",
          "Bedroom with three single beds in Azalea",
          "Bathroom with shower in the Azalea cabin",
          "Equipped kitchen in the Azalea cabin",
          "Breakfast bar and kitchen in the Azalea cabin",
        ],
        note:
          "We will confirm the final guest allocation directly.",
        additionalUnits: [
          {
            key: "dalia",
            title: "Dalia",
            intro:
              "A bright cabin beside the pool, with three bedrooms and ten clearly identified sleeping places.",
            capacity: "10 guests",
            roomsLabel: "3 bedrooms",
            bedsLabel: "7 beds · sleeps 10",
            rooms: [
              "Bedroom 1 · 2 double beds",
              "Bedroom 2 · 4 single beds in 2 bunk beds",
              "Bedroom 3 · 1 double bed",
            ],
            amenities:
              "The photographs show a living room, dining room, bathroom with shower, and a view towards the pool.",
            galleryLabel: "Dalia gallery",
            photoAlts: [
              "Dining room in the Dalia cabin beside the pool",
              "Living room in the Dalia cabin",
              "Bedroom with two double beds in Dalia",
              "Bedroom with four single bunk beds in Dalia",
              "Bedroom with one double bed in Dalia",
              "Bathroom with shower in Dalia",
              "Second view of the bathroom with shower in Dalia",
            ],
            note:
              "The recorded internal cost is MXN 11,150 for both nights; allocation and the final per-person amount will be confirmed directly.",
          },
          {
            key: "margarita",
            title: "Margarita",
            intro:
              "A cheerful yellow-toned cabin with three bedrooms, bright shared spaces, and a garden with an outdoor fire pit.",
            capacity: "10 guests",
            roomsLabel: "3 bedrooms",
            bedsLabel: "7 beds · sleeps 10",
            rooms: [
              "Bedroom 1 · 2 double beds",
              "Bedroom 2 · 4 single beds in 2 bunk beds",
              "Bedroom 3 · 1 double bed",
            ],
            amenities:
              "The photographs show a living-dining room, kitchen with breakfast bar, bathroom with shower, garden, and outdoor fire pit.",
            galleryLabel: "Margarita gallery",
            photoAlts: [
              "Indoor shared area in the Margarita cabin",
              "Bedroom with four single bunk beds in Margarita",
              "Bathroom with shower in Margarita",
              "Bedroom with two double beds in Margarita",
              "Kitchen with breakfast bar in Margarita",
              "Dining room in the Margarita cabin",
              "Bedroom with one double bed in Margarita",
              "Garden and outdoor fire pit at the Margarita cabin",
            ],
            note:
              "The recorded internal cost is MXN 11,150 for both nights; allocation and the final per-person amount will be confirmed directly.",
          },
          {
            key: "wooden",
            title: "Wooden cabins 31–34",
            intro:
              "Four independent cabins beneath the trees, ideal for couples or small families looking for a more private space.",
            capacity: "4 cabins",
            roomsLabel: "2 adults per unit",
            bedsLabel: "Up to 2 minors",
            rooms: [
              "Available units · 31, 32, 33, and 34",
              "Each unit · 1 king-size bed",
              "Each unit · 1 double sofa bed",
            ],
            amenities:
              "The photographs and video show a terrace, refrigerator, washbasin, television, and a fully wood-lined interior.",
            galleryLabel: "Wooden cabins 31 to 34 gallery",
            photoAlts: [
              "Exterior of a wooden cabin beneath the trees",
              "Entrance to wooden cabin number 34",
              "King-size bed inside a wooden cabin",
              "Sofa bed and interior amenities in a wooden cabin",
            ],
            videoLabel: "Video tour · 16 sec",
            note:
              "Internal rate per unit for both nights: MXN 5,310 for 2 adults, or MXN 5,790 for 2 adults and 2 minors. Allocation and the final amount will be confirmed directly.",
          },
        ],
      },
      plan: {
        eyebrow: "How does it work?",
        title: "Tell us what you prefer",
        body:
          "Your response will help us allocate the cabins fairly and thoughtfully.",
        steps: [
          "Select your accommodation preference in the RSVP.",
          "We will arrange cabins according to groups, dates, and availability.",
          "We will confirm the allocation, final price, and payment details directly.",
        ],
        button: "Answer the RSVP",
      },
    },
    travel: {
      eyebrow: "Coming from afar",
      title: "Your journey is part of the celebration too",
      body:
        "We will personally support everyone travelling from Europe and beyond with flights, arrival in Guadalajara, accommodation, and transfers.",
      points: [
        "Madrid–Guadalajara is the priority nonstop route from Europe.",
        "We will coordinate airport pickups once we have your flight numbers.",
        "Every traveller will have an arrival, stay, and return itinerary.",
      ],
      routes: {
        eyebrow: "Journey map",
        title: "Getting to Roca Azul, then travelling on to the coast",
        note:
          "Approximate Saturday driving times, subject to traffic. The listed arrival routes are toll-free; toll amounts are estimates per journey.",
        venue: "Roca Azul · Jocotepec",
        originsLabel: "To the wedding",
        destinationsLabel: "After the wedding",
        mapLabel: "Map of Roca Azul and its surroundings",
        directionsLabel: "Getting there (routes on Google Maps)",
        origins: [
          { place: "Central Guadalajara", duration: "≈ 1 hr 30", detail: "Toll-free route" },

          { place: "Our home · Tesistán", duration: "≈ 1 hr 45", detail: "Toll-free route" },
          { place: "GDL Airport", duration: "≈ 1 hr", detail: "Toll-free route" },
        ],
        destinations: [
          {
            place: "Barra de Navidad",
            duration: "≈ 5 hr",
            detail: "Toll-free · Cocula → Autlán → Barra",
          },
          {
            place: "Barra de Navidad",
            duration: "≈ 4 hr 45",
            detail: "Via Manzanillo · tolls ≈ MXN 500",
          },
          {
            place: "Manzanillo",
            duration: "≈ 4 hr 30",
            detail: "Tolls ≈ MXN 500",
          },
        ],
        maps: {
          venueLabel: "Getting to the venue",
          beachLabel: "Getting to the beach",
        },
      },
      cta: "Share my travel details",

      ctaNote: "The private form is now available below.",
    },
    attire: {
      eyebrow: "Attire",
      title: "Mexican aesthetic and dress code",
      body:
        "We have chosen a Mexican aesthetic for our wedding as a tribute to the culture, the food, the music, and the place that brings us together. We want everything to feel festive, colorful, and deeply Mexican.",
      dressCode: {
        title: "No dress code",
        body:
          "We want you to be yourselves, not dressed up. If you want to be elegant, be elegant; if you prefer to be relaxed, be relaxed. What matters is that you feel comfortable. Do bring a full set of clothes: there will be swimming, a steam bath, sports, the ceremony, dancing, and, if the night runs long around the fire, a light sweater.",
      },
      guestNote:
        "The most important thing is that you feel comfortable and celebrate with us. If you have any questions, write to us.",

    },
    gift: {
      eyebrow: "Gifts",
      title: "Your presence is the greatest gift",
      body:
        "Your company is the best present we could receive. If you would also like to give a token of affection, we would be grateful for any contribution towards our honeymoon or our shared projects as a couple.",
      note:
        "There is absolutely no obligation or expectation — what truly makes us happy is sharing this weekend with you.",
      accounts: {
        eur: {
          title: "Transfer in EUR (SEPA)",
          details: [
            "Name: David AILI",
            "IBAN: BE43 9671 3798 6001",
            "Swift/BIC: TRWIBEB1XXX",
            "Bank: Wise, Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium",
          ],
          note: "For SEPA transfers in EUR only.",
        },
        mx: {
          title: "Transfer in MXN",
          details: [
            "Cuenta Clave: 012 320 01559313382 0",
            "Bank: BBVA",
            "Name: David AILI",
          ],
        },
      },
      cta: "Talk to the couple",
    },
    coast: {
      eyebrow: "And afterwards?",
      title: "Keep enjoying being together",
      body:
        "The party doesn’t end on Sunday. We have prepared two plans to keep enjoying time together, and everyone chooses whichever suits them best.",
      plans: [
        {
          title: "Plan 1 · Stay at Roca Azul",
          body:
            "Rent a cabin for two more nights, from Sunday to Tuesday, to keep spending time together at the venue. If you are interested, let us know in the RSVP and we will arrange a cabin for your group.",
        },
        {
          title: "Plan 2 · The beach",
          body:
            "From Tuesday to Saturday we head to the coast. It’s not a honeymoon — everyone is cordially invited to keep the party going in Barra de Navidad. We can organise shared transport.",
        },
      ],
      note:
        "The exact dates, transport, and budget will depend on the number of interested guests. A hotel night in Barra de Navidad during this season is around MXN 1,200–2,500 per person.",
      form: {
        eyebrow: "No-obligation survey",
        title: "Are you in?",
        body:
          "Tell us which plan interests you so we can start organising the logistics.",
        fields: {
          name: "Name",
          interest: "Interest level",
          partySize: "Interested guests",
          plan: "Plan you are interested in",
          destination: "Preferred destination",
          style: "Accommodation style",
          note: "Dates, budget, or comments",
        },
        options: {
          interest: [
            { value: "yes", label: "Yes, I’m interested" },
            { value: "maybe", label: "Maybe—I’d like more details" },
            { value: "no", label: "Not this time" },
          ],
          plan: [
            { value: "venue", label: "Plan 1 · Stay at Roca Azul (Sun–Tue)" },
            { value: "playa", label: "Plan 2 · The beach (Tue–Sat)" },
            { value: "both", label: "Both plans" },
          ],
          destination: [
            { value: "barra", label: "Barra de Navidad" },
            { value: "other", label: "I have another idea" },
          ],
          style: [
            { value: "shared", label: "Group-organised hotel or houses" },
            { value: "independent", label: "Everyone books independently" },
            { value: "day", label: "Only join for the beach and dinner" },
          ],
        },
        button: "Send my interest",
        previewNote:
          "Preview: this survey will open with the private RSVP.",
      },
    },

    rsvp: {
      eyebrow: "RSVP",
      title: "Will you join us?",
      body:
        "One response will help us organise your attendance, accommodation, and journey. If your flights are not booked yet, you can share them later.",
      groups: {
        attendance: "Attendance and accommodation",
        travel: "Coming from afar",
        notes: "One last detail",
      },
      petanque: {
        eyebrow: "Pétanque tournament",
        intro: "On Friday afternoon we will organise a pétanque tournament. Would you like to join?",
        organizerLabel: "Organised by: David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "Will you participate in the tournament?",
          partySize: "How many people?",
          names: "Names of participants",
          namesPlaceholder: "E.g. David, Aydé, Dimitar…",
          ownBoules: "Will you bring your own boules?",
        },
        options: {
          participation: [
            { value: "yes", label: "Yes, we want to play" },
            { value: "no", label: "Not this time" },
            { value: "maybe", label: "Maybe—decide for us" },
          ],
          ownBoules: [
            { value: "yes", label: "Yes, we bring our own" },
            { value: "no", label: "No, we need some" },
          ],
        },
      },
      travelNote:
        "Complete this part only if you are travelling from another city or country. We need both arrival and return details to coordinate transfers.",
      fields: {
        fullName: "Full name",
        whatsapp: "WhatsApp (for further communication)",

        attendance: "Will you join us?",
        groupMode: "Are you replying alone or as a group?",
        groupName: "Group or family name",
        partySize: "People in your group",
        adults: "Adults aged 18 or over",
        children: "Children under 18",
        guests: "Names of accompanying guests",
        accommodation: "Accommodation plan",
        independentArrival: "When do you plan to arrive at Roca Azul?",
        sundayMorning: "Will we see you on Sunday morning?",
        travelStatus: "Travel status",
        arrivalFrom: "Arriving from",
        arrivalTo: "Arriving at",
        arrivalDate: "Arrival date",
        arrivalTime: "Estimated arrival time",
        arrivalAirline: "Arrival airline",
        arrivalFlight: "Arrival flight number",
        departureFrom: "Returning from",
        departureTo: "Returning to",
        departureDate: "Return date",
        departureTime: "Estimated departure time",
        departureAirline: "Return airline",
        departureFlight: "Return flight number",
        route: "Full route and connections",
        routePlaceholder: "E.g. Málaga → Madrid → Guadalajara",
        notes: "Dietary, mobility, or other comments",
      },
      options: {
        attendance: [
          { value: "yes", label: "Yes, with pleasure" },
          { value: "no", label: "I won’t be able to attend" },
          { value: "maybe", label: "I’m not sure yet" },
        ],
        groupMode: [
          { value: "solo", label: "I’m replying only for myself" },
          { value: "group", label: "I’m replying for a group or family" },
        ],
        accommodation: [
          {
            value: "onsite_two_nights",
            label: "Yes: complete 2-night package at Roca Azul",
          },
          {
            value: "independent",
            label: "No: I’ll arrange all accommodation independently",
          },
        ],
        independentArrival: [
          { value: "friday", label: "From Friday" },
          { value: "saturday", label: "Saturday only" },
        ],
        sundayMorning: [
          { value: "yes", label: "Yes, we’ll be there" },
          { value: "no", label: "No, we’ll leave beforehand" },
          { value: "maybe", label: "We don’t know yet" },
        ],
        travelStatus: [
          { value: "booked", label: "I’m travelling from afar and have tickets" },
          {
            value: "planning",
            label: "I’m travelling from afar but still planning",
          },
          { value: "local", label: "I don’t need travel coordination" },
        ],
      },
      button: "Send my response",
      previewNote:
        "Your response will be stored privately and only the couple can view it.",
    },
    footer: {
      line: "With love, from Mexico and France",
      privacy: "Private invitation · Protected responses",
    },
  },
};
