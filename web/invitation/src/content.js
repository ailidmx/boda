export const SUPPORTED_LANGUAGES = ["es", "fr", "en"];

export const EVENT = {
  couple: "David & Aydé",
  date: "2027-02-20T00:00:00-06:00",
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
      rsvp: "Confirmar",
    },
    countdown: {
      prefix: "Faltan",
      days: "días",
      hours: "horas",
      minutes: "min",
      seconds: "seg",
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
        "La celebración comienza el viernes y termina el domingo. Los horarios definitivos se publicarán aquí.",
      items: [
        {
          day: "Viernes 19",
          title: "Llegada y bienvenida",
          body: "Check-in, petanca, pizzas y un primer encuentro relajado.",
        },
        {
          day: "Sábado 20",
          title: "El gran día",
          body: "Ceremonia, comida, música y una larga noche para bailar.",
        },
        {
          day: "Domingo 21",
          title: "Desayuno y despedida",
          body: "Una última mañana juntos antes de los regresos.",
        },
      ],
    },
    food: {
      eyebrow: "A la mesa",
      title: "Un fin de semana para probar, brindar y compartir",
      body:
        "Queremos que cada comida sea sencilla, generosa y muy mexicana. Este es el menú que estamos imaginando; todavía puede crecer con sus ideas.",
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
    },
    music: {
      eyebrow: "Música en vivo",
      title: "Escuchar, bailar y también cantar",
      body:
        "La música acompañará cada cambio de energía del sábado, desde el final de la ceremonia hasta la pista de baile.",
      acts: [
        {
          moment: "Después de la ceremonia",
          name: "Marimba",
          note: "Para acompañar el encuentro y las primeras copas.",
        },
        {
          moment: "Aperitivo o apertura de la cena",
          name: "Mariachi",
          note: "Una entrada festiva antes de sentarnos a la mesa.",
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
          "Mándennos su sugerencia. Quizá podamos aprovechar a alguno de los músicos en vivo para acompañarlos y convertirla en un momento inolvidable.",
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
      },
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
        "Vista previa: las sugerencias se enviarán al mismo sistema privado del RSVP.",
    },
    venue: {
      eyebrow: "El lugar",
      title: "Roca Azul",
      body:
        "Nos encontraremos en Jocotepec, a orillas del lago de Chapala. El alojamiento del fin de semana estará organizado en las cabañas del lugar.",
      location: "Jocotepec, Jalisco, México",
      map: "Abrir en Google Maps",
      visualTitle: "Lago de Chapala",
      visualBody: "Jardines, agua y atardeceres de Jalisco",
    },
    facilities: {
      eyebrow: "El sábado a su ritmo",
      title: "Todo el club para disfrutar",
      body:
        "Entre un momento y otro, cada quien podrá convivir con sus vecinos, explorar las instalaciones o simplemente descansar en su alojamiento.",
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
            "Campo de golf a menos de 3 km, con costo adicional",
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
      cta: "Compartir mis datos de viaje",
      ctaNote: "El formulario privado estará disponible próximamente.",
    },
    attire: {
      eyebrow: "Vestuario",
      title: "Una celebración con raíz oaxaqueña",
      body:
        "Nuestros atuendos dialogarán a través de una estética oaxaqueña coordinada. Queremos que la celebración se sienta elegante, festiva y profundamente nuestra.",
      guestNote:
        "El código de vestimenta para invitados se confirmará más adelante.",
    },
    coast: {
      eyebrow: "¿Y después?",
      title: "Prolongar el gusto de estar juntos",
      body:
        "Para quienes puedan y quieran, estamos imaginando salir directamente el domingo hacia un lugar cercano, bonito, relajado y accesible de Costalegre, como Barra de Navidad o Manzanillo. Sin compromiso: primero queremos saber a quién le interesaría.",
      ideas: [
        {
          title: "Juntos bajo el mismo techo",
          body: "Buscar un hotel o varias casas y Airbnb cercanos.",
        },
        {
          title: "Cada quien a su ritmo",
          body: "Reservar por su cuenta y encontrarnos para algunos momentos.",
        },
        {
          title: "Un programa muy ligero",
          body: "Una tarde en la playa, una cena en el malecón y tiempo libre.",
        },
      ],
      note:
        "El destino, las fechas exactas, el transporte y el presupuesto dependerán del número de personas interesadas.",
      form: {
        eyebrow: "Sondeo sin compromiso",
        title: "¿Les interesa la playa?",
        body:
          "Cuéntennos qué formato les gustaría para diseñar una propuesta sencilla.",
        fields: {
          name: "Nombre",
          interest: "Nivel de interés",
          partySize: "Personas interesadas",
          nights: "Noches posibles",
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
          destination: [
            { value: "barra", label: "Barra de Navidad" },
            { value: "manzanillo", label: "Manzanillo" },
            { value: "either", label: "Cualquiera de los dos" },
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
      travelNote:
        "Completen esta parte únicamente si viajan desde otra ciudad o país. Necesitamos los datos del trayecto de llegada y de regreso para coordinar los traslados.",
      fields: {
        firstName: "Nombre",
        lastName: "Apellidos",
        contact: "Correo o WhatsApp",
        attendance: "¿Nos acompañan?",
        groupMode: "¿Responden solos o en grupo?",
        groupName: "Nombre del grupo o familia",
        partySize: "Personas en su grupo",
        adults: "Adultos de 18 años o más",
        children: "Menores de 18 años",
        guests: "Nombres de acompañantes",
        accommodation: "Plan de alojamiento",
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
        "Vista previa: conectaremos el envío privado antes de publicar la invitación.",
    },
    footer: {
      line: "Con amor, desde México y Francia",
      privacy: "Sitio público · Sin información privada de invitados",
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
      rsvp: "Répondre",
    },
    countdown: {
      prefix: "Plus que",
      days: "jours",
      hours: "heures",
      minutes: "min",
      seconds: "sec",
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
        "Entre le Mexique et la France, entre nos familles et nos amis, nous avons choisi de nous réunir au bord du lac de Chapala pour célébrer l’amour, l’amitié et tout ce qui nous a conduits jusqu’ici.",
      note:
        "Nous serons immensément heureux de partager ce week-end avec vous.",
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
        "La célébration commence le vendredi et se termine le dimanche. Les horaires définitifs seront publiés ici.",
      items: [
        {
          day: "Vendredi 19",
          title: "Arrivée et bienvenue",
          body: "Check-in, pétanque, pizzas et premières retrouvailles.",
        },
        {
          day: "Samedi 20",
          title: "Le grand jour",
          body: "Cérémonie, repas, musique et une longue nuit de fête.",
        },
        {
          day: "Dimanche 21",
          title: "Petit-déjeuner et au revoir",
          body: "Une dernière matinée ensemble avant les départs.",
        },
      ],
    },
    food: {
      eyebrow: "À table",
      title: "Un week-end pour goûter, trinquer et partager",
      body:
        "Nous voulons que chaque repas soit simple, généreux et profondément mexicain. Voici le menu que nous imaginons ; il peut encore évoluer grâce à vos idées.",
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
    },
    music: {
      eyebrow: "Musique live",
      title: "Écouter, danser et aussi chanter",
      body:
        "La musique accompagnera chaque changement d’énergie du samedi, de la fin de la cérémonie jusqu’à la piste de danse.",
      acts: [
        {
          moment: "Après la cérémonie",
          name: "Marimba",
          note: "Pour accompagner les retrouvailles et les premiers verres.",
        },
        {
          moment: "Apéritif ou ouverture du dîner",
          name: "Mariachi",
          note: "Une entrée festive avant de passer à table.",
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
          "Envoyez-nous votre suggestion. Nous pourrons peut-être profiter de la présence des musiciens pour vous accompagner et en faire un moment inoubliable.",
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
      },
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
        "Aperçu : les suggestions rejoindront le même système privé que le RSVP.",
    },
    venue: {
      eyebrow: "Le lieu",
      title: "Roca Azul",
      body:
        "Nous nous retrouverons à Jocotepec, au bord du lac de Chapala. L’hébergement du week-end sera organisé dans les cabanes du lieu.",
      location: "Jocotepec, Jalisco, Mexique",
      map: "Ouvrir dans Google Maps",
      visualTitle: "Lac de Chapala",
      visualBody: "Jardins, eau et couchers de soleil du Jalisco",
    },
    facilities: {
      eyebrow: "Le samedi à votre rythme",
      title: "Tout le club à votre disposition",
      body:
        "Entre deux moments, chacun pourra retrouver ses voisins, profiter des installations ou simplement se reposer dans son hébergement.",
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
            "Golf à moins de 3 km, avec supplément",
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
      cta: "Partager mes informations de voyage",
      ctaNote: "Le formulaire privé sera bientôt disponible.",
    },
    attire: {
      eyebrow: "Tenues",
      title: "Une célébration aux racines oaxaqueñas",
      body:
        "Nos tenues dialogueront à travers une esthétique oaxaqueña coordonnée. Nous souhaitons une célébration élégante, festive et profondément personnelle.",
      guestNote:
        "Le code vestimentaire des invités sera confirmé ultérieurement.",
    },
    coast: {
      eyebrow: "Et après ?",
      title: "Prolonger le plaisir d’être ensemble",
      body:
        "Pour celles et ceux qui le peuvent et le souhaitent, nous imaginons partir directement le dimanche vers un endroit proche, joli, détendu et accessible de la Costalegre, comme Barra de Navidad ou Manzanillo. Sans engagement : nous voulons d’abord connaître les personnes intéressées.",
      ideas: [
        {
          title: "Ensemble sous le même toit",
          body: "Chercher un hôtel ou plusieurs maisons et Airbnb proches.",
        },
        {
          title: "Chacun à son rythme",
          body: "Réserver de son côté et se retrouver pour certains moments.",
        },
        {
          title: "Un programme très léger",
          body: "Un après-midi à la plage, un dîner sur le malecón et du temps libre.",
        },
      ],
      note:
        "La destination, les dates exactes, le transport et le budget dépendront du nombre de personnes intéressées.",
      form: {
        eyebrow: "Sondage sans engagement",
        title: "La plage vous tente ?",
        body:
          "Dites-nous quelle formule vous plairait pour construire une proposition simple.",
        fields: {
          name: "Nom",
          interest: "Niveau d’intérêt",
          partySize: "Personnes intéressées",
          nights: "Nuits possibles",
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
          destination: [
            { value: "barra", label: "Barra de Navidad" },
            { value: "manzanillo", label: "Manzanillo" },
            { value: "either", label: "L’un ou l’autre" },
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
      travelNote:
        "Remplissez cette partie uniquement si vous venez d’une autre ville ou d’un autre pays. Nous avons besoin des trajets aller et retour pour organiser les transferts.",
      fields: {
        firstName: "Prénom",
        lastName: "Nom de famille",
        contact: "E-mail ou WhatsApp",
        attendance: "Serez-vous avec nous ?",
        groupMode: "Répondez-vous seul·e ou en groupe ?",
        groupName: "Nom du groupe ou de la famille",
        partySize: "Personnes dans votre groupe",
        adults: "Adultes de 18 ans ou plus",
        children: "Mineurs de moins de 18 ans",
        guests: "Noms des accompagnants",
        accommodation: "Projet d’hébergement",
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
        "Aperçu : l’envoi privé sera connecté avant la publication de l’invitation.",
    },
    footer: {
      line: "Avec amour, depuis le Mexique et la France",
      privacy: "Site public · Aucune donnée privée des invités",
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
      rsvp: "RSVP",
    },
    countdown: {
      prefix: "Only",
      days: "days",
      hours: "hours",
      minutes: "min",
      seconds: "sec",
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
        "The celebration starts on Friday and ends on Sunday. Final timings will be published here.",
      items: [
        {
          day: "Friday 19",
          title: "Arrival and welcome",
          body: "Check-in, pétanque, pizzas, and a relaxed first evening together.",
        },
        {
          day: "Saturday 20",
          title: "The big day",
          body: "Ceremony, food, music, and a long night of dancing.",
        },
        {
          day: "Sunday 21",
          title: "Breakfast and farewell",
          body: "One final morning together before the journeys home.",
        },
      ],
    },
    food: {
      eyebrow: "At the table",
      title: "A weekend to taste, toast, and share",
      body:
        "We want every meal to feel simple, generous, and unmistakably Mexican. This is the menu we are imagining, and it can still grow with your ideas.",
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
    },
    music: {
      eyebrow: "Live music",
      title: "Listen, dance, and sing too",
      body:
        "Music will accompany every shift in energy on Saturday, from the end of the ceremony to the dance floor.",
      acts: [
        {
          moment: "After the ceremony",
          name: "Marimba",
          note: "For reconnecting and enjoying the first drinks.",
        },
        {
          moment: "Aperitif or dinner opening",
          name: "Mariachi",
          note: "A festive entrance before everyone sits down to eat.",
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
          "Send us your suggestion. We may be able to invite one of the live musicians to accompany you and turn it into an unforgettable moment.",
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
      },
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
        "Preview: suggestions will use the same private system as the RSVP.",
    },
    venue: {
      eyebrow: "The venue",
      title: "Roca Azul",
      body:
        "We will meet in Jocotepec, on the shores of Lake Chapala. Weekend accommodation will be arranged in the venue’s cabins.",
      location: "Jocotepec, Jalisco, Mexico",
      map: "Open in Google Maps",
      visualTitle: "Lake Chapala",
      visualBody: "Gardens, water, and Jalisco sunsets",
    },
    facilities: {
      eyebrow: "Saturday at your own pace",
      title: "The whole club to enjoy",
      body:
        "Between shared moments, everyone can spend time with their neighbours, explore the facilities, or simply rest in their accommodation.",
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
            "Golf less than 3 km away, at an additional cost",
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
      cta: "Share my travel details",
      ctaNote: "The private form will be available soon.",
    },
    attire: {
      eyebrow: "Attire",
      title: "A celebration with Oaxacan roots",
      body:
        "Our outfits will speak to one another through a coordinated Oaxacan aesthetic. We want the celebration to feel elegant, festive, and deeply personal.",
      guestNote: "The guest dress code will be confirmed later.",
    },
    coast: {
      eyebrow: "And afterwards?",
      title: "Keep enjoying being together",
      body:
        "For those who can and would like to, we are imagining leaving directly on Sunday for somewhere nearby, beautiful, relaxed, and affordable on Costalegre, such as Barra de Navidad or Manzanillo. There is no commitment—we first want to know who might be interested.",
      ideas: [
        {
          title: "Together under one roof",
          body: "Find one hotel or several nearby houses and Airbnbs.",
        },
        {
          title: "Everyone at their own pace",
          body: "Book independently and meet for a few shared moments.",
        },
        {
          title: "A very light programme",
          body: "An afternoon at the beach, dinner on the malecón, and free time.",
        },
      ],
      note:
        "The destination, exact dates, transport, and budget will depend on the number of interested guests.",
      form: {
        eyebrow: "No-obligation survey",
        title: "Would you like to join us at the beach?",
        body:
          "Tell us what format would suit you so we can design a simple proposal.",
        fields: {
          name: "Name",
          interest: "Interest level",
          partySize: "Interested guests",
          nights: "Possible nights",
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
          destination: [
            { value: "barra", label: "Barra de Navidad" },
            { value: "manzanillo", label: "Manzanillo" },
            { value: "either", label: "Either one" },
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
      travelNote:
        "Complete this part only if you are travelling from another city or country. We need both arrival and return details to coordinate transfers.",
      fields: {
        firstName: "First name",
        lastName: "Last name",
        contact: "Email or WhatsApp",
        attendance: "Will you join us?",
        groupMode: "Are you replying alone or as a group?",
        groupName: "Group or family name",
        partySize: "People in your group",
        adults: "Adults aged 18 or over",
        children: "Children under 18",
        guests: "Names of accompanying guests",
        accommodation: "Accommodation plan",
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
        "Preview: private submissions will be connected before publication.",
    },
    footer: {
      line: "With love, from Mexico and France",
      privacy: "Public site · No private guest information",
    },
  },
};
