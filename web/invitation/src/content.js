export const SUPPORTED_LANGUAGES = ["es", "fr", "en"];

export const EVENT = {
  couple: "David & Aydé",
  date: "2027-02-20T00:00:00-06:00",
  dateShort: "20 · 02 · 2027",
  venue: "Roca Azul",
  place: "Jocotepec · Jalisco · México",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Club+Roca+Azul+Jocotepec",
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
    accommodation: {
      eyebrow: "Alojamiento",
      title: "Dormir cerca, organizarnos a tiempo",
      body:
        "Contamos con alojamiento en el lugar para aproximadamente 80 personas. Como necesitamos distribuir las cabañas y las habitaciones con cuidado, les pedimos que nos indiquen cuanto antes si desean aprovechar esta opción.",
      facts: [
        { value: "≈ 80", label: "lugares disponibles" },
        { value: "2", label: "noches principales" },
        { value: "19–21", label: "febrero de 2027" },
      ],
      specialNote:
        "El alojamiento tiene un costo para quienes elijan este plan. Cualquier invitación o acuerdo especial con padrinos y patrocinadores se comunicará directamente. La mayoría de quienes viajan desde lejos ya está considerando hospedarse aquí; si prefieren organizar su estancia por su cuenta, no hay ningún problema: solo necesitamos saberlo con anticipación.",
      form: {
        eyebrow: "Interés de alojamiento",
        title: "Cuéntennos su plan",
        body:
          "Esta respuesta nos ayudará a estimar la demanda. No constituye todavía una reserva ni un cobro.",
        fields: {
          name: "Nombre completo",
          contact: "Correo o WhatsApp",
          partySize: "Personas en su grupo",
          plan: "Plan preferido",
          nights: "Noches que necesitarían",
          nightsPlaceholder: "Ej. viernes 19 y sábado 20",
          note: "Comentarios, niñas/niños o necesidades especiales",
        },
        options: [
          { value: "onsite", label: "Me interesa alojarme en Roca Azul" },
          { value: "independent", label: "Organizaré mi propio alojamiento" },
          { value: "undecided", label: "Todavía no lo sé" },
        ],
        button: "Enviar mi interés",
        previewNote:
          "Vista previa: el envío se habilitará cuando abramos el formulario privado.",
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
    rsvp: {
      eyebrow: "RSVP",
      title: "¿Nos acompañan?",
      body:
        "La confirmación privada se abrirá pronto. Mientras tanto, por favor reserven el fin de semana completo.",
      button: "RSVP próximamente",
      dateNote: "20 de febrero de 2027 · Roca Azul",
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
    accommodation: {
      eyebrow: "Hébergement",
      title: "Dormir sur place, nous organiser à temps",
      body:
        "Nous disposons d’environ 80 places sur le lieu. Comme les cabanes et les chambres doivent être réparties avec soin, merci de nous indiquer dès que possible si cette option vous intéresse.",
      facts: [
        { value: "≈ 80", label: "places disponibles" },
        { value: "2", label: "nuits principales" },
        { value: "19–21", label: "février 2027" },
      ],
      specialNote:
        "L’hébergement est payant pour les personnes qui choisissent cette formule. Toute invitation ou disposition particulière avec les padrinos et sponsors sera communiquée directement. La plupart des personnes venant de loin envisagent déjà de loger sur place ; si vous préférez organiser votre séjour de votre côté, aucun souci : nous avons simplement besoin de le savoir à l’avance.",
      form: {
        eyebrow: "Intérêt hébergement",
        title: "Parlez-nous de votre projet",
        body:
          "Cette réponse nous aidera à estimer les besoins. Elle ne constitue pas encore une réservation ni un paiement.",
        fields: {
          name: "Nom complet",
          contact: "E-mail ou WhatsApp",
          partySize: "Personnes dans votre groupe",
          plan: "Option envisagée",
          nights: "Nuits dont vous auriez besoin",
          nightsPlaceholder: "Ex. vendredi 19 et samedi 20",
          note: "Commentaires, enfants ou besoins particuliers",
        },
        options: [
          { value: "onsite", label: "Je souhaite loger à Roca Azul" },
          { value: "independent", label: "J’organiserai mon propre hébergement" },
          { value: "undecided", label: "Je ne sais pas encore" },
        ],
        button: "Envoyer mon intérêt",
        previewNote:
          "Aperçu : l’envoi sera activé à l’ouverture du formulaire privé.",
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
    rsvp: {
      eyebrow: "RSVP",
      title: "Serez-vous avec nous ?",
      body:
        "La confirmation privée ouvrira bientôt. En attendant, merci de réserver le week-end complet.",
      button: "RSVP prochainement",
      dateNote: "20 février 2027 · Roca Azul",
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
    accommodation: {
      eyebrow: "Accommodation",
      title: "Stay close, help us plan ahead",
      body:
        "We have accommodation at the venue for approximately 80 people. As the cabins and rooms need to be allocated carefully, please let us know as soon as possible if you would like to use this option.",
      facts: [
        { value: "≈ 80", label: "places available" },
        { value: "2", label: "main nights" },
        { value: "19–21", label: "February 2027" },
      ],
      specialNote:
        "Accommodation has a cost for guests choosing this plan. Any invitation or special arrangement with padrinos and sponsors will be communicated directly. Most guests travelling from afar are already considering staying here; if you prefer to arrange your own accommodation, that is absolutely fine—we simply need to know in advance.",
      form: {
        eyebrow: "Accommodation interest",
        title: "Tell us your plan",
        body:
          "This response will help us estimate demand. It is not yet a booking or a payment.",
        fields: {
          name: "Full name",
          contact: "Email or WhatsApp",
          partySize: "People in your group",
          plan: "Preferred plan",
          nights: "Nights you would need",
          nightsPlaceholder: "E.g. Friday 19 and Saturday 20",
          note: "Comments, children, or special requirements",
        },
        options: [
          { value: "onsite", label: "I’m interested in staying at Roca Azul" },
          { value: "independent", label: "I’ll arrange my own accommodation" },
          { value: "undecided", label: "I’m not sure yet" },
        ],
        button: "Send my interest",
        previewNote:
          "Preview: submissions will open with the private form.",
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
    rsvp: {
      eyebrow: "RSVP",
      title: "Will you join us?",
      body:
        "Private confirmations will open soon. For now, please save the entire weekend.",
      button: "RSVP coming soon",
      dateNote: "February 20, 2027 · Roca Azul",
    },
    footer: {
      line: "With love, from Mexico and France",
      privacy: "Public site · No private guest information",
    },
  },
};
