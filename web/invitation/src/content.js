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

export const content = {
  es: {
    locale: "es-MX",
    skip: "Saltar al contenido",
    metaDescription:
      "David y Aydé celebran su unión el 20 de febrero de 2027 en Roca Azul, Jocotepec, Jalisco.",

    nav: {
      home: "Inicio",
      you: "Tú",
      story: "Invitación",


      weekend: "Guarden la fecha",
      programme: "Programa",
      venue: "El lugar",
      accommodation: "Alojamiento",
      travel: "VUELOS",
      attire: "Vestuario",


      weather: "Clima",
      gift: "Regalos",
      photos: "Fotos",
      thanks: "Gracias",
      guests: "Invitados",
      rsvp: "Confirmar",



      dashboard: "admin",
      changeEmail: "Cambiar correo",
      changePassword: "Cambiar contraseña",
      music: "Música",
      logout: "Cerrar sesión",

      emailWarningTitle: "Atención al cambiar tu correo",
      emailWarningBody:
        "Tu acceso a la invitación quedará ligado al nuevo correo. Te enviaremos una verificación y debes confirmarla para completar el cambio.",
      currentEmailLabel: "Correo actual",
      newEmailLabel: "Nuevo correo",
      newEmailPlaceholder: "nuevo@correo.com",
      emailInvalid: "Escribe un correo válido.",
      emailSuccess: "Correo actualizado.",
      emailUnchanged: "Ese correo ya está activo en tu cuenta.",
      emailError: "No pudimos cambiar el correo. Inténtalo de nuevo.",
      emailVerificationSent:
        "Te enviamos un correo de verificación al nuevo email. Confírmalo para completar el cambio.",
      emailReauthRequired:
        "Por seguridad, confirma tu contraseña para cambiar el correo.",
      emailReauthLabel: "Contraseña actual",
      emailReauthPlaceholder: "Escribe tu contraseña",
      emailReauthPasswordRequired: "Escribe tu contraseña actual.",

      newPasswordLabel: "Nueva contraseña",
      newPasswordPlaceholder: "Mínimo 6 caracteres",
      passwordError: "La contraseña debe tener al menos 6 caracteres.",
      passwordSuccess: "¡Contraseña actualizada!",
      cancel: "Cancelar",
      save: "Guardar",
      working: "Guardando…",

      teAnimas: "¿Te animas?",

      petanque: "Petanca",
      food: "Comida",
      coast: "¿Y después?",

      menu1: "Menú",
      menu2: "Más",

      about: "Acerca de",

      aboutTitle: "Acerca de esta invitación",
      aboutSubtitle:
        "Una invitación digital hecha con cariño para celebrar nuestro fin de semana junto al lago de Chapala.",
      aboutClose: "Cerrar",
      close: "Cerrar",
      ok: "Aceptar",
      successTitle: "¡Listo!",
      currentPasswordLabel: "Contraseña actual",
      currentPasswordPlaceholder: "Escribe tu contraseña actual",
      confirmPasswordLabel: "Confirmar contraseña",
      confirmPasswordPlaceholder: "Repite la nueva contraseña",
      passwordMismatch: "Las contraseñas no coinciden.",
      passwordReauthRequired: "Confirma tu contraseña actual para continuar.",
      passwordWrongCurrent: "La contraseña actual es incorrecta.",
      emailDomainError: "Este correo no pertenece a un dominio permitido.",
      emailErrorTitle: "No pudimos actualizar el correo",
    },



    countdown: {
      prefix: "Unidos en",
      years: "años",
      months: "meses",
      days: "días",
      hours: "horas",
      minutes: "min",
      arrived: "Unidos desde",
    },




    hero: {
      eyebrow: "Estás invitado a celebrar nuestra unión",
      eyebrowF: "Estás invitada a celebrar nuestra unión",

      invitation: "Queremos celebrar este momento contigo",



      scroll: "Empecemos",
      navStory: "Descubrir nuestra invitación",

      imageNote: "Aquí irá nuestra fotografía",
      imageAlt: "David y Aydé juntos",
      selectImage: "Mostrar fotografía",
      pause: "Pausar fotos",
      play: "Reanudar fotos",
    },
    identity: {
      eyebrow: "Verificación de identidad",
      title: "¿Está bien escrito tu nombre?",
      titleGroup: "¿Los datos de {count} invitados de este grupo son correctos?",
      titleSingle: "¿Tus datos personales son correctos?",

      body:
        "Queremos que cada invitado se sienta reconocido. Si tu nombre o el de alguien de tu grupo está mal escrito, corrígelo aquí y lo usaremos en la invitación y en la mesa.",
      note:
        "También puedes subir una foto de tu rostro si quieres para el recuerdo (bonito retrato de preferencia).",

      you: "Tú",
      firstName: "Nombre",
      lastName: "Apellido",
      firstNameLabel: "Nombre",
      middleNameLabel: "Segundo nombre",
      lastNameLabel: "Apellido",
      maternalLastNameLabel: "Segundo apellido",
      nombreLabel: "Nombre",
      nombre2Label: "Segundo nombre",
      apellidoLabel: "Apellido",
      apellido2Label: "Segundo apellido",

      fullName: "Nombre completo",
      editName: "Corregir nombre",

      correctNumber: "Corregir número",
      edit: "Editar",
      verify: "Verificar",
      membersLabel: "Grupo de invitación",


      addPhoto: "Subir foto",

      changePhoto: "Cambiar foto",
      uploading: "Subiendo…",
      save: "Guardar",
      saving: "Guardando…",
      cancel: "Cancelar",
      saved: "¡Listo! Lo actualizamos.",
      savedWithName: "¡Listo! {name} está actualizado.",
      saveError: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.",

      nameRequired: "Escribe al menos tu nombre.",
      photoSaved: "¡Foto guardada! Gracias.",
      photoError: "No pudimos subir la foto. Inténtalo de nuevo.",

      stepLabel: "Paso",
      step1Title: "¿Está bien escrito tu nombre?",
      step2Title: "¿Cuál es tu número de celular?",
      step3Title: "¿Cuál es tu correo electrónico?",
      step2Body:
        "Lo usaremos solo para comunicarnos contigo sobre la celebración (confirmaciones, cambios de última hora o coordinación de traslados).",

      step3Body:
        "Te enviaremos la invitación formal y cualquier información importante antes del gran día.",
      contactFor: "Contacto de",
      phoneLabel: "Número de celular",

      phonePlaceholder: "Ej. 33 1234 5678",
      phoneMissing: "Número de celular faltante",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tucorreo@ejemplo.com",
      phoneRequired: "Escribe tu número de celular.",
      emailRequired: "Escribe tu correo electrónico.",
      emailInvalid: "Escribe un correo electrónico válido.",
      emailVerificationSent: "Te enviamos un correo de verificación al nuevo email. Confírmalo para completar el cambio.",
      emailUpdateError: "No pudimos actualizar el correo. Verifica que sea válido y, si aparece un correo de verificación, confírmalo primero.",
      back: "Atrás",
      next: "Continuar",
      finish: "Terminar",
      confirm: "Confirmar",
      ok: "Sí, es correcto",
      contactSaved: "¡Listo! Gracias por confirmar tus datos.",

      whatsappLabel: "Agrégame al grupo de WhatsApp",
      whatsappHint:
        "Únete al grupo para recibir avisos, coordinación de traslados y novedades del fin de semana.",
      whatsappUrl: "https://chat.whatsapp.com/E8LP2oj0sK4GM5Slo1VIFD?s=cl&p=a&ilr=4",
      navStory: "Descubrir la invitación",
    },

    story: {
      eyebrow: "Nuestra invitación",



      title: "Un fin de semana para encontrarnos",
      body:
        "Entre México y Francia, entre nuestras familias y amistades, elegimos reunirnos junto al lago de Chapala para celebrar el amor, la amistad y todo lo que nos trajo hasta aquí.",
      note:
        "Nos hará inmensamente felices compartir este fin de semana contigo.",
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
      navNext: "Descubrir el lugar",
      mapLabel: "Mapa del lago de Chapala",

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
    photos: {
      title: "Comparte tus fotos",
      lead:
        "Queremos ver la celebración a través de tus ojos. Hemos creado dos álbumes compartidos de Google Photos donde puedes subir tus fotos.",
      beforeTitle: "📸 Antes de la celebración",
      beforeBody: "Comparte tus fotos favoritas de nosotros antes del gran día.",
      duringTitle: "🎉 La celebración vista por los invitados",
      duringBody:
        "Después de la celebración, comparte aquí las fotos que tomaste durante la celebración.",
      beforeLink: "https://photos.app.goo.gl/Df3QwjTKQTGVEqEU6",
      duringLink: "https://photos.app.goo.gl/Vhg2AY3gXzXL2iKp8",






      upload: "Subir fotos ↗",

      note:
        'Solicita acceso al álbum haciendo clic en "Subir fotos". Una vez dentro, podrás subir todas las fotos que quieras. ¡Gracias por capturar estos momentos con nosotros!',
    },
    weekend: {
      eyebrow: "Programa detallado",
      bannerEyebrow: "Guarden la fecha",



      title: "Tres días para celebrar",

      intro:
        "Nosotros estaremos en Roca Azul desde el jueves. Los invitados pueden llegar desde el viernes alrededor del mediodía y la celebración principal será una ceremonia de tarde el sábado.",

      navSchedule: "Ver los tres días",
      navProgram: "Programa detallado",


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
        eyebrow: "Sábado 20",

        title: "La tarde, paso a paso",
        warning:
          "Quienes vengan desde Guadalajara: salgan con bastante anticipación. Los accesos hacia Jocotepec pueden congestionarse fácilmente y necesitamos que todos estén en Roca Azul a las 13:00.",

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
      friday: {
        eyebrow: "Viernes 19",

        title: "Llegada y bienvenida",
        warning:
          "Un primer encuentro relajado para instalarnos, convivir y empezar el fin de semana sin prisas.",
        items: [
          { time: "Desde mediodía", title: "Llegadas y check-in", body: "Bienvenida y tiempo para instalarnos en las cabañas." },
          { time: "Tarde", title: "Petanca y juegos", body: "Juegos al aire libre para romper el hielo." },
          { time: "Noche", title: "Pizzas de bienvenida", body: "Una cena informal para encontrarnos sin prisas." },
        ],
      },
      sunday: {
        eyebrow: "Domingo 21",

        title: "Desayuno y despedida",
        warning: "Una última mañana juntos antes de los regresos.",
        items: [
          { time: "Mañana", title: "Desayuno", body: "Desayuno incluido para quienes se hospedan en las cabañas." },
          { time: "Mediodía", title: "Despedida", body: "Últimos momentos juntos y regresos." },
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
        { time: "Mañana", title: "Luz de lago al amanecer", body: "El lago en calma refleja la luz dorada del amanecer." },
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
      navNext: "Ver el programa",
    },
    food: {
      eyebrow: "A la mesa",
      title: "Un fin de semana para probar, brindar y compartir",
      body:
        "Queremos que cada comida sea sencilla, generosa y muy mexicana. Este es el menú que estamos imaginando; todavía puede crecer con tus ideas.",
      flavoursEyebrow: "Sabores de Jalisco y México",
      flavoursTitle: "¿Qué vamos a probar?",
      flavours: [
        {
          key: "carnitas",
          type: "food",
          title: "Carnitas",
          body: "Cerdo cocido lentamente hasta quedar tierno y dorado, servido con tortillas, cebolla, cilantro, salsas y limón.",
        },
        {
          key: "tejuino",
          type: "drink",
          title: "Tejuino",
          body: "Bebida tapatía de maíz fermentado, dulce y ácida, servida muy fría con limón y sal. También habrá tejuino loco con tequila o mezcal.",
        },
        {
          key: "jericalla",
          type: "dessert",
          title: "Jericalla",
          body: "El postre más tapatío: una crema horneada con canela y vainilla, con su característica capa dorada.",
        },
        {
          key: "taquiza",
          type: "food",
          title: "Taquiza",
          body: "Una mesa con varios guisos mexicanos, tortillas calientes y acompañamientos para que cada quien arme sus propios tacos.",
        },
        {
          key: "aguas",
          type: "drink",
          title: "Aguas de sabor",
          body: "Aguas frescas de jamaica, horchata y limón para acompañar la comida.",
        },
        {
          key: "gelatinas",
          type: "dessert",
          title: "Gelatinas",
          body: "Gelatinas de sabores, frescas y ligeras, para cerrar la comida con algo dulce.",
        },
        {
          key: "nopales",
          type: "food",
          title: "Ensalada de nopales",
          body: "Nopal tierno con tomate, cebolla, hierbas y queso: una opción fresca, mexicana y vegetariana.",
        },
        {
          key: "tequila",
          type: "drink",
          title: "Tequila",
          body: "Tequila para brindar y celebrar, servido con sal y limón.",
        },
        {
          key: "postres-tapatios",
          type: "dessert",
          title: "Dulces mexicanos",
          body: "Una selección de dulces tradicionales mexicanos para endulzar el final de la comida.",
        },
        {
          key: "guacamole",
          type: "food",
          title: "Guacamole y opciones vegetarianas",
          body: "Habrá guacamole, tortillas, salsas y otros acompañamientos sin carne. Podrán indicar sus restricciones en el RSVP.",
        },
        {
          key: "pizza",
          type: "food",
          title: "Pizza",
          body: "Pizzas para compartir el viernes por la noche: una bienvenida sencilla e informal después de las llegadas y la petanca.",
        },
        {
          key: "esquites",
          type: "food",
          title: "Esquites",
          body: "Maíz tierno cocido con epazote, chile, limón y queso: un clásico callejero mexicano.",
        },
      ],

      flavourType: {
        food: "Comida",
        drink: "Bebida",
        dessert: "Postre",
      },

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
          "Si quieres asegurarte de que tu noche quede especialmente bien regada, puedes traer tus propias municiones para compartir y disfrutar responsablemente.",
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
          note: "La marimba es un idiófono de teclado de madera: barras de hormiguillo que se percuten con baquetas y resuenan en tubos. Su timbre cálido y melódico, herencia del sureste mexicano y de Guatemala, acompaña el primer brindis antes de las carnitas.",
          image: "marimba",
        },

        {
          moment: "Después de la ceremonia en el faro",
          name: "Mariachi",
          note: "El mariachi es la orquesta tradicional mexicana por excelencia: violines, trompetas, vihuela y guitarrón. Sus sones y rancheras, con su característico grito, abren la cena con una entrada festiva.",
          image: "mariachi",
        },
        {
          moment: "Después de la cena",
          name: "Norteño",
          note: "El norteño es el sonido del norte de México: acordeón y bajo sexto, con polkas, corridos y cumbias. Su ritmo bailable abre la pista y la fiesta.",
          image: "norteno",
        },

        {
          moment: "¿El set de más?",
          name: "Banda",


          note: "38 tonnes, una fanfarria francesa que mezcla vientos y percusión. Descúbrelos en su web y en su increíble video en Guča, con aparición del novio y un solo inolvidable.",
          image: "frenchBand",
          logo: "frenchBandLogo",
          website: "https://www.38tonnes.fr/",
          link: "https://www.youtube.com/watch?v=eq_MLyQsdr8",
        },

      ],

      stage: {
        eyebrow: "Escena abierta",
        title: "¿Hay una canción que quieras cantar?",
        body:
          "Agrega aquí tus títulos para el ambiente, el baile o el karaoke. Quizá podamos aprovechar a alguno de los músicos en vivo para acompañarte y convertir una canción en un momento inolvidable.",
      },
      playlists: {
        eyebrow: "Escucha desde ahora",
        title: "La banda sonora empieza aquí",
        body:
          "Tres playlists para entrar en ambiente, descubrir canciones y empezar a preparar tus grandes interpretaciones.",
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
        name: "Tu nombre",
        dessert: "¿Qué postre prefieres?",
        food: "¿Qué falta o qué te gustaría agregar?",
        song: "Canción sugerida",
        artist: "Artista o versión",
        sing: "¿Quieres cantarla?",
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
        "Tus canciones, votos e ideas se guardarán de forma privada.",
    },
    facilities: {
      eyebrow: "El lugar",
      title: "Todo el club para disfrutar",
      body:
        "Entre la ceremonia y la fiesta, el club entero es nuestro: piscinas, jardines, canchas y cabañas para convivir, explorar o simplemente descansar.",


      videoTitle: "Video de presentación de Roca Azul",
      privacyTitle: "Privacidad",
      privacyBody:
        "Todas las cabañas estarán rentadas por los invitados de la boda, unas 80 a 90 personas. Además, otros invitados del matrimonio se alojarán cerca, quizá no muy lejos, o vendrán solo por el día: unas 60 personas según las estimaciones actuales. Aun así, el club no será completamente privado ese fin de semana: algunos espacios aún albergan tiendas de campaña o casas rodantes. Compartiremos el lugar y respetaremos el descanso. La música podrá sonar hasta las 2 de la madrugada; después continuaremos en las cabañas.",

      gallery: [
        { key: "pool", title: "Albercas", alt: "Alberca y jardines del Club Roca Azul" },
        { key: "courts", title: "Deporte", alt: "Canchas deportivas de Roca Azul" },
        { key: "gardens", title: "Jardines", alt: "Áreas verdes del Club Roca Azul" },
        { key: "cabins", title: "Cabañas", alt: "Cabañas y habitaciones de Roca Azul" },

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
      navNext: "Descubrir el lugar",
      navContinue: "Continuar",
      navIdentity: "¿Está bien escrito tu nombre?",
    },
    accommodation: {

      eyebrow: "Alojamiento",
      title: "Dormir cerca, organizarnos a tiempo",
      citation:
        "Nosotros estaremos en Roca Azul desde el jueves. Los invitados pueden llegar desde el viernes alrededor del mediodía y la celebración principal será una boda de tarde el sábado.",
      body:
        "Contamos con alojamiento en el lugar para aproximadamente 80 personas. Como necesitamos distribuir las cabañas y las habitaciones con cuidado, te pedimos que nos indiques cuanto antes si deseas aprovechar esta opción.",
      facts: [
        { value: "≈ 80–90", label: "lugares disponibles" },
        {
          value: "≈ $1,200 MXN",
          euroValue: "≈ €60",
          label: "por persona · 2 noches",
        },
        { value: "2", label: "desayunos incluidos" },
      ],
      specialNote:
        "El alojamiento se reserva únicamente como paquete completo de dos noches, del viernes 19 al domingo 21: no es posible reservar una sola noche. El precio estimado es de $1,200 MXN por persona por las dos noches e incluye los dos desayunos del fin de semana.",
      noteTitle: "A tener en cuenta",
      noCabinRecommendation:
        "Te recomendamos buscar un hotel o un Airbnb en los alrededores.",
      guestOption: {
        eyebrow: "Tu alojamiento",
        membersLabel: "Miembros del grupo",
        linkLabel: "Consultar la opción prevista para ti",
        backLabel: "Volver al alojamiento",
        onSiteTitle: "Una plaza está prevista en Roca Azul",
        onSiteBody:
          "Esta es la opción registrada para tu perfil. Te confirmaremos directamente cualquier ajuste.",
        onSiteCoveredBody:
          "Tu estancia está cubierta por los novios: no tendrás que pagar nada.",
        onSitePayBody:
          "Tu estancia no está cubierta por los novios: pagarás tu parte.",
        independentTitle: "Alojamiento por tu cuenta",
        independentBody:
          "Te recomendamos buscar un hotel o un Airbnb en los alrededores.",
        cabinLabel: "Cabaña",
        roomLabel: "Habitación",
        cabinCapacityLabel: "Capacidad de la casa",
        roomCapacityLabel: "Capacidad del cuarto",
        cabinPriceLabel: "Precio de la cabaña",
        personPriceLabel: "A pagar por persona",
        groupPriceLabel: "A pagar por el grupo",
        coveredPriceLabel: "Pagado por los novios",
        peopleLabel: "personas",
        cabinOccupancyLabel: "Modalidad de la cabaña",
        roomOccupancyLabel: "Modalidad de la habitación",
        occupancy: { privada: "Privada", compartida: "Compartida" },
        wholeCabinTitle: "Ocupación completa de la cabaña",
        wholeCabinBody: "Todas las habitaciones y las personas asignadas a cada una.",
        emptyRoom: "Sin personas asignadas",
        youLabel: "Tú",
        airbnbTitle: "Airbnbs cerca de Roca Azul",
        airbnbBody:
          "Estas opciones aparecieron en la zona para las noches del 19 al 21 de febrero de 2027. Confirma la disponibilidad y el precio directamente en Airbnb.",
        airbnbAreaPrice: "Precio de entrada observado en la zona",
        fromPrice: "Desde · tarifa orientativa",
        perNight: "por noche",
        beforeTaxes: "sin impuestos",
        airbnbGuests: "huéspedes",
        airbnbBedrooms: "habitaciones",
        airbnbBeds: "camas",
        airbnbRating: "Calificación",
        airbnbView: "Ver alojamiento",
        airbnbSearchAll: "Ver toda la búsqueda en Airbnb",
        hotelTitle: "Hoteles cerca de Roca Azul",
        hotelBody:
          "Tarifas de referencia observadas actualmente. Consulta con cada hotel la disponibilidad, los impuestos y el precio final para las noches del 19 al 21 de febrero de 2027.",
        hotelLocation: "Zona",
        hotelView: "Ver hotel",
        hotelTypes: {
          spaHotel: "Hotel spa",
          boutiqueSpa: "Resort boutique y spa",
          thermalHotel: "Hotel y aguas termales",
        },
        paymentLabel: "Pago",
        payment: {
          covered: "Cubierto por los novios",
          paid: "Pago registrado",
          pending: "Por confirmar",
        },
        extraCabinLabel: "Alojamiento adicional",
        planCardTitle: "Tu plan de alojamiento",
        planCardPerPerson: "Para {name} · 2 noches",
        planCardSaleLabel: "Cubierto por los novios",
        planCardGroupTotal: "Total del grupo",
        planCardEurDisclaimer: "Precio estimado en MXN",
        planCardEstimate: "El importe final se confirmará directamente.",
      },


      contactPrompt: "Más info",


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
        title: "Dinos qué prefieres",
        body:
          "Tu respuesta nos permitirá reservar las cabañas de manera justa y organizada.",
        steps: [
          "Indica tu preferencia de alojamiento en el RSVP.",
          "Organizaremos las cabañas según grupos, fechas y disponibilidad.",
          "Confirmaremos directamente la asignación, el precio final y la forma de pago.",
        ],
        button: "Responder al RSVP",
      },
      navNext: "Petanca",
      recap: {
        eyebrow: "Confirmación de alojamiento",
        title: "¿Confirmas tu alojamiento?",
        intro:
          "Indica por cada persona si se quedará en Roca Azul para poder organizar las cabañas.",
        hasCabinQuestion: "¿Se queda en Roca Azul?",
        hasCabinQuestionCabin: "¿Ok para {cabin}?",
        noCabinQuestion: "¿Me avisas si se libera un alojamiento?",
        yesLabel: "Sí",

        noLabel: "No",
        button: "Guardar mi confirmación",
        success: "Confirmación guardada. ¡Gracias!",
        error: "No se pudo guardar. Inténtalo de nuevo.",
        summaryTitle: "Resumen de tu confirmación",
        summaryIntro:
          "Esto es lo que indicaste para cada persona. Puedes modificarlo y volver a guardar cuando quieras.",
      },
    },
    travel: {


      eyebrow: "Vengo de lejos",
      title: "Tu viaje también forma parte de la celebración",
      body:
        "Acompañaremos personalmente a quienes vienen desde Europa y otros lugares: elección de vuelos, llegada a Guadalajara, alojamiento y traslados.",
      points: [
        "Madrid–Guadalajara es la ruta directa prioritaria desde Europa.",
        "Coordinaremos las recogidas cuando tengamos tus números de vuelo.",
        "Cada viajero tendrá un itinerario de llegada, estancia y regreso.",
      ],
      routes: {
        eyebrow: "Mapa de trayectos",
        title: "Llegar a Roca Azul y seguir hacia la costa",
        note:
          "Las duraciones indicadas son orientativas y pueden variar enormemente. Sé previsor y, mejor aún, está en el lugar con anticipación reservando un alojamiento si puedes.",
        venue: "Roca Azul · Jocotepec",
        toVenueLabel: "Hacia Roca Azul",
        toBeachLabel: "Hacia la playa",
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
      vuelosImage: "vuelos_c6qdcq",
      vuelosLabel: "Mapa de vuelos",
    },
    attire: {

      eyebrow: "Vestuario",
      title: "Estética mexicana y código de vestimenta",
      body:
        "Hemos elegido una estética mexicana para nuestra boda como un homenaje a la cultura, la comida, la música y el lugar que nos reúne. Queremos que todo se sienta festivo, colorido y profundamente mexicano.",
      dressCode: {
        title: "Vístete de color",
        paragraphs: [
          "Nos hace muchísima ilusión compartir este día contigo, y queremos que, así como cada persona ha dejado una huella especial en nuestra vida, también cada uno aporte un poco de su esencia a esta celebración.",
          "Creemos que los colores transmiten energía, alegría y personalidad. Por eso, nos encantaría que nos acompañaras vistiendo tonos llenos de vida, procurando evitar el negro, el gris y el blanco.",
          "Nuestra boda tendrá una inspiración mexicana, con una decoración en tonos blancos y detalles artesanales. David llevará una guayabera de lino blanco con bordados dorados, y ambos vestiremos piezas bordadas por artesanas de una comunidad de Oaxaca, como un homenaje a la riqueza de nuestras tradiciones.",
          "La única regla es que te sientas tú mismo: elegante, cómodo y listo para celebrar, bailar y llenar este día de color, amor y buena energía.",
          "¡Gracias por ser parte de nuestra historia! ✨🌼",
        ],
        pictograms: {
          ariaLabel: "Pictogramas del código de vestimenta",
          noWhite: "Evita el blanco",
          noBlack: "Evita el negro",
          noGrey: "Evita el gris",
          colorGreen: "Verde",
          colorTeal: "Turquesa",
          colorMarigold: "Amarillo",
          dressNoWhite: "Vestido: evita el blanco",
          dressNoBlack: "Vestido: evita el negro",
          dressNoGrey: "Vestido: evita el gris",
          dressColor: "Vestido de color",
          funky: "Estampados divertidos",
          mexican: "Patrones mexicanos",
        },
      },

      guestNote:
        "Lo más importante es que te sientas cómodo y celebres con nosotros. Si tienes dudas, escríbenos.",
      navNext: "Alojamiento",

    },
    gift: {
      eyebrow: "Regalos",

      title: "Lo más importante es tu presencia",
      body:
        "Tu compañía es el mejor regalo que podemos recibir. Si además deseas hacernos un detalle, agradecemos cualquier contribución para nuestra luna de miel o nuestros proyectos de pareja.",
      note:
        "No hay ninguna obligación ni expectativa — lo que realmente nos hace felices es compartir este fin de semana contigo.",
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
    thanks: {
      eyebrow: "Agradecimientos",
      title: "Gracias",
      subtitle:
        "Sin nuestros padrinos y ayudantes nada de esto sería posible. Queremos dar su lugar a todos los que ayudaron a que esto sea posible con toda nuestra gratitud a ...",

      credits: [
        { name: "Manuel Amuezca", role: "Wedding planner" },
        { name: "Manuel Amuezca", role: "Pizzas del viernes" },
        { name: "Manuel Amuzeca", role: "Pizzas del viernes" },
        { name: "Ismael", role: "Pizzas" },
        { name: "Isabel Guadalupe", role: "Vestuario de los novios" },
      ],
      humor: [
        "Si quieres aparecer aquí, contacta nuestro servicio de programa de afiliación a programa de padrino.",
        "Apareces aquí y no sabías: te asignaron tarea. Qué pena, pero no hay manera de borrarlo: el admin IT de la página se fue de vacaciones, no lo podemos borrar, así que hay que cumplir.",
        "Cumpliste apoyo y no apareces. Qué pena. Igual el IT está de vacaciones, pero manda tus quejas a los novios o al wedding planner.",
      ],
      cta: "Hablar con los novios",
      ctaPlanner: "Hablar con el wedding planner",
      guestCloud: {
        eyebrow: "Nuestros invitados",
        title: "Todos los que nos acompañan",
        subtitle:
          "Cada nombre es una historia compartida. Gracias por ser parte de este día.",
        navNext: "Ver el programa",
        modeGroupLabel: "Modo de nombre",
        modeFull: "Nombre completo",
        modeFirst: "Nombre",
        modeLast: "Apellidos",
      },

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
            "Rentar una cabaña dos noches más, del domingo al martes, para seguir conviviendo en el lugar. Si te interesa, indícalo en el RSVP y organizaremos la cabaña para tu grupo.",
        },
        {
          title: "Plan 2 · La playa",
          body:
            "Del martes al sábado nos vamos a la costa. No es luna de miel — estás cordialmente invitado a seguir la fiesta en Barra de Navidad. Podemos organizar transportes en común.",
        },
      ],
      note:
        "Las fechas exactas, el transporte y el presupuesto dependerán del número de personas interesadas. Una noche de hotel en Barra de Navidad en esta temporada ronda los $1,200–$2,500 MXN por persona.",
      form: {
        eyebrow: "Sondeo sin compromiso",
        title: "¿Te apuntas?",
        body:
          "Cuéntanos qué plan te interesa para ir organizando la logística.",
        fields: {
          name: "Nombre",
          interest: "Nivel de interés",
          partySize: "Personas interesadas",
          plan: "Plan que te interesa",
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
      rsvpMini: {
        eyebrow: "¿Y después?",
        title: "¿Te apuntas?",
        intro:
          "Cuéntanos qué tan probable es que te unas a cada plan. Puedes cambiar tu respuesta en cualquier momento.",
        questions: [
          {
            id: "rocaAzul",
            title: "Plan 1 · Quedarse en Roca Azul",
            subtitle: "Del domingo al martes, dos noches más en el lugar.",
          },
          {
            id: "playa",
            title: "Plan 2 · La playa",
            subtitle: "Del martes al sábado, en Barra de Navidad.",
          },
        ],
        recapTitle: "Resumen",
        recapProgress: "respondidos",
        button: "Guardar mis respuestas",
        success: "¡Gracias! Guardamos tus respuestas.",
        error: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.",
      },
      suggestions: {
        eyebrow: "Dónde alojarse",
        title: "Sugerencias en Barra de Navidad",
        body:
          "Si el plan de la playa te interesa, estas opciones aparecieron en la zona para las noches del 23 al 28 de febrero de 2027. Confirma la disponibilidad y el precio directamente.",
        airbnbTitle: "Airbnbs cerca de Barra de Navidad",
        airbnbBody:
          "Estas opciones aparecieron en la zona para las noches del 23 al 28 de febrero de 2027. Confirma la disponibilidad y el precio directamente en Airbnb.",
        airbnbAreaPrice: "Precio de entrada observado en la zona",
        fromPrice: "Desde · tarifa orientativa",
        perNight: "por noche",
        beforeTaxes: "sin impuestos",
        airbnbGuests: "huéspedes",
        airbnbBedrooms: "habitaciones",
        airbnbBeds: "camas",
        airbnbRating: "Calificación",
        airbnbView: "Ver alojamiento",
        airbnbSearchAll: "Ver toda la búsqueda en Airbnb",
        hotelTitle: "Hoteles en Barra de Navidad",
        hotelBody:
          "Tarifas de referencia observadas actualmente. Consulta con cada hotel la disponibilidad, los impuestos y el precio final.",
        hotelLocation: "Zona",
        hotelView: "Ver hotel",
        hotelTypes: {
          budgetHotel: "Hotel económico",
          beachHotel: "Hotel frente a la playa",
          boutiqueHotel: "Hotel boutique",
        },
      },
      budget: {
        eyebrow: "Presupuesto estimado",
        title: "¿Cuánto costaría la playa?",
        intro:
          "Con una noche de hotel en Barra de Navidad de $1,200 a $2,500 MXN por persona, calculamos un estimado para las 4 noches del plan de playa (martes a sábado), según cuántas personas de tu grupo se apuntaron.",
        perNightPerPerson: "por noche y por persona",
        nights: "noches",
        interested: "personas interesadas",
        minLabel: "Estimado mínimo",
        maxLabel: "Estimado máximo",
        totalLabel: "Total estimado para tu grupo",
        bigTotal: "Total estimado",
        disclaimer:
          "Estimado orientativo. El precio final dependerá del alojamiento elegido, la temporada y la confirmación directa con cada hotel o Airbnb.",
      },
      extraStay: {
        eyebrow: "Tu estancia · domingo a martes",
        title: "Tu cabaña para la segunda estancia",
      },
    },


    rsvp: {

      eyebrow: "RSVP",
      title: "¿Nos acompañas?",
      body:
        "Una sola respuesta nos permitirá organizar tu asistencia, alojamiento y viaje. Si todavía no tienes tus vuelos, podrás enviarlos más adelante.",
      groups: {
        attendance: "Asistencia y alojamiento",
        travel: "Vengo desde lejos",
        notes: "Un último detalle",
      },
      petanque: {
        eyebrow: "Torneo de petanca",
        intro: "El viernes por la tarde organizaremos un torneo de petanca. ¿Te apuntas?",
        organizerLabel: "Organiza: David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "¿Participas en el torneo?",
          partySize: "¿Cuántas personas?",
          names: "Nombres de los participantes",
          namesPlaceholder: "Ej. David, Aydé, Dimitar…",
          ownBoules: "¿Necesitas que te prestemos unas boules?",
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
        "Completa esta parte únicamente si viajas desde otra ciudad o país. Necesitamos los datos del trayecto de llegada y de regreso para coordinar los traslados.",
      fields: {
        fullName: "Nombre completo",
        whatsapp: "WhatsApp (para las comunicaciones posteriores)",

        attendance: "¿Nos acompañas?",
        groupMode: "¿Respondes solo o en grupo?",
        groupName: "Nombre del grupo o familia",
        partySize: "Personas en tu grupo",
        adults: "Adultos de 18 años o más",
        children: "Menores de 18 años",
        guests: "Nombres de acompañantes",
        accommodation: "Plan de alojamiento",
        independentArrival: "¿Cuándo piensas llegar a Roca Azul?",
        sundayMorning: "¿Nos veremos el domingo por la mañana?",
        travelStatus: "Situación de tu viaje",
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
        "Tu respuesta se guardará de forma privada y solo los novios podrán consultarla.",
      progressLabel: "Antes de enviar, completa cada sección:",
      progressTeAnimas: "¿Te animas? (viernes, sábado, domingo)",
      progressPetanque: "Torneo de petanca",
      progressCoast: "¿Y después? (playa)",
      progressResume: "Completado",
      progressPending: "Pendiente",
      recap: {
        title: "Resumen",
        answered: "respondidos",
        yes: "Sí",
        no: "No",
      },

      scale: {
        intro:
          "Cuéntanos, día por día, qué tan probable es que estés con nosotros. Puedes cambiar tu respuesta en cualquier momento.",
        saveButton: "Guardar mis respuestas",
        savedNote: "¡Gracias! Guardamos tus respuestas.",
        questions: [
          {
            id: "friday",
            title: "Viernes 19 · ¿Nos vemos?",
            subtitle: "Llegada y bienvenida desde el mediodía.",
          },
          {
            id: "saturday",
            title: "Sábado 20 · ¿Nos vemos?",
            subtitle: "La boda de tarde: ceremonia, cena y baile.",
          },
          {
            id: "sunday",
            title: "Domingo 21 · ¿Nos vemos?",
            subtitle: "Desayuno y despedida por la mañana.",
          },
        ],
      },
      payment: {
        title: "A pagar",
        intro:
          "Aquí está el detalle de lo que deberás pagar por tu alojamiento.",
        cabinTitle: "Cabaña del viernes al domingo",
        extraCabinTitle: "Cabaña extra del domingo al martes",
        perPerson: "A pagar por persona",
        perGroup: "A pagar por el grupo",
        total: "Total",
        asterisk:
          "Agradecemos tu comprensión: nos encantaría pagar por todos, pero no es posible. Esta es solo una opción que planeamos para ti, y entendemos si prefieres otra cosa. Solo háznos saber tu elección.",
      },

    },
    petanqueTribute: {
      eyebrow: "Petanca",

      title: "Un homenaje a la petanca",
      intro:
        "La petanca nos ha unido con una comunidad maravillosa de amigos y compañeros de club en México y en el mundo.",
      body:
        "El viernes por la tarde organizaremos un torneo de petanca para celebrar este juego que tanto queremos. No hace falta experiencia: solo ganas de jugar, reír y compartir.",
      homage: "¡Te animas!",
      photosLabel: "Fotografías de petanca",
      photoAlts: [
        "Jugadores de petanca en el club",
        "Boules sobre la cancha",
        "Un tiro de petanca",
        "El círculo de lanzamiento",
      ],
      navNext: "A la mesa",
      rsvpMini: {
        eyebrow: "Torneo de petanca",
        title: "¿Te apuntas?",
        intro: "El viernes por la tarde organizaremos un torneo de petanca. ¿Te apuntas?",
        organizerLabel: "Organiza: David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "¿Participas en el torneo?",
          ownBoules: "¿Necesitas que te prestemos unas boules?",
          ownBoulesHint: "Si no tienes, no te preocupes: te prestamos unas para jugar.",
        },
        yesLabel: "Sí",
        noLabel: "No",
        success: "¡Gracias! Guardamos tus respuestas.",
        error: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.",
        button: "Guardar mis respuestas",
        recapTitle: "Resumen",
      },
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
      home: "Accueil",
      you: "Toi",
      story: "Invitation",


      weekend: "Réservez la date",
      programme: "Programme",
      venue: "Le lieu",
      accommodation: "Hébergement",
      travel: "VOLS",
      attire: "Code vestimentaire",


      weather: "Météo",
      gift: "Cadeaux",
      photos: "Photos",
      thanks: "Merci",
      guests: "Invités",
      rsvp: "Répondre",



      dashboard: "admin",
      changeEmail: "Changer l’adresse e-mail",
      changePassword: "Changer le mot de passe",
      music: "Musique",
      logout: "Se déconnecter",

      emailWarningTitle: "Attention avant de changer l’adresse e-mail",
      emailWarningBody:
        "Ton accès à l’invitation passera par cette nouvelle adresse. Un e-mail de vérification sera envoyé et devra être confirmé.",
      currentEmailLabel: "Adresse actuelle",
      newEmailLabel: "Nouvelle adresse",
      newEmailPlaceholder: "nouveau@email.com",
      emailInvalid: "Saisis une adresse e-mail valide.",
      emailSuccess: "Adresse e-mail mise à jour.",
      emailUnchanged: "Cette adresse est déjà active sur ton compte.",
      emailError: "Impossible de changer l’adresse e-mail. Réessaie.",
      emailVerificationSent:
        "Un e-mail de vérification a été envoyé à la nouvelle adresse. Confirme-le pour finaliser le changement.",
      emailReauthRequired:
        "Pour des raisons de sécurité, confirme ton mot de passe pour changer l’adresse e-mail.",
      emailReauthLabel: "Mot de passe actuel",
      emailReauthPlaceholder: "Saisis ton mot de passe",
      emailReauthPasswordRequired: "Saisis ton mot de passe actuel.",

      newPasswordLabel: "Nouveau mot de passe",
      newPasswordPlaceholder: "6 caractères minimum",
      passwordError: "Le mot de passe doit contenir au moins 6 caractères.",
      passwordSuccess: "Mot de passe mis à jour !",
      cancel: "Annuler",
      save: "Enregistrer",
      working: "Enregistrement…",

      teAnimas: "ça te tente ?",

      petanque: "Pétanque",
      food: "Cuisine",
      coast: "Et après ?",

      menu1: "Menu",
      menu2: "Plus",

      about: "À propos",

      aboutTitle: "À propos de cette invitation",
      aboutSubtitle:
        "Une invitation numérique réalisée avec soin pour célébrer notre week-end au bord du lac de Chapala.",
      aboutClose: "Fermer",
      close: "Fermer",
      ok: "OK",
      successTitle: "C’est fait !",
      currentPasswordLabel: "Mot de passe actuel",
      currentPasswordPlaceholder: "Saisis ton mot de passe actuel",
      confirmPasswordLabel: "Confirmer le mot de passe",
      confirmPasswordPlaceholder: "Répète le nouveau mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      passwordReauthRequired: "Confirme ton mot de passe actuel pour continuer.",
      passwordWrongCurrent: "Le mot de passe actuel est incorrect.",
      emailDomainError: "Cette adresse n’appartient pas à un domaine autorisé.",
      emailErrorTitle: "Impossible de mettre à jour l’adresse e-mail",
    },



    countdown: {
      prefix: "Mariés dans",
      years: "ans",
      months: "mois",
      days: "jours",
      hours: "heures",
      minutes: "min",
      arrived: "Mariés depuis",
    },



    hero: {
      eyebrow: "Tu es invité à notre mariage",
      eyebrowF: "Tu es invitée à notre mariage",
      invitation: "Nous voulons vivre ce moment avec toi",


      scroll: "Commençons",
      navStory: "Découvrir notre invitation",

      imageNote: "Notre photographie viendra ici",
      imageAlt: "David et Aydé ensemble",
      selectImage: "Afficher la photographie",
      pause: "Pause photos",
      play: "Relancer les photos",
    },
    identity: {
      eyebrow: "Vérification d'identité",
      title: "Ton nom est-il bien écrit ?",
      titleGroup: "Les infos des {count} invités sont-elles correctes ?",
      titleSingle: "Tes infos personnelles sont-elles correctes ?",

      body:
        "Nous voulons que chaque invité se sente reconnu. Si ton nom ou celui d’un membre de ton groupe est mal orthographié, corrige-le ici et nous l’utiliserons dans l’invitation et à table.",
      note:
        "Tu peux aussi déposer une photo de ton visage si tu le souhaites, pour le souvenir (un joli portrait de préférence).",

      you: "Toi",
      firstName: "Prénom",
      lastName: "Nom",
      firstNameLabel: "Prénom",
      middleNameLabel: "Deuxième prénom",
      lastNameLabel: "Nom",
      maternalLastNameLabel: "Deuxième nom",
      nombreLabel: "Prénom",
      nombre2Label: "Deuxième prénom",
      apellidoLabel: "Nom",
      apellido2Label: "Deuxième nom",

      fullName: "Nom complet",
      editName: "Corriger le nom",

      correctNumber: "Corriger le numéro",
      edit: "Modifier",
      verify: "Vérifier",
      membersLabel: "Groupe d'invitation",


      addPhoto: "Déposer une photo",

      changePhoto: "Changer la photo",
      uploading: "Envoi…",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      saved: "C’est fait ! Nous l’avons mis à jour.",
      savedWithName: "C'est fait, {name} est à jour.",
      saveError: "Impossible d’enregistrer. Vérifie ta connexion et réessaie.",
      nameRequired: "Écris au moins ton prénom.",
      photoSaved: "Photo enregistrée ! Merci.",
      photoError: "Impossible de déposer la photo. Réessaie.",

      stepLabel: "Étape",
      step1Title: "Ton nom est-il bien écrit ?",
      step2Title: "Quel est ton numéro de portable ?",
      step3Title: "Quelle est ton adresse e-mail ?",
      step2Body:
        "Nous l’utiliserons uniquement pour te contacter au sujet du mariage (confirmations, changements de dernière minute ou coordination des transferts).",
      step3Body:
        "Nous t’enverrons l’invitation officielle et toute information importante avant le grand jour.",
      contactFor: "Contact de",
      phoneLabel: "Numéro de portable",

      phonePlaceholder: "Ex. 33 12 34 56 78",
      phoneMissing: "Numéro de portable manquant",
      emailLabel: "Adresse e-mail",
      emailPlaceholder: "toncourriel@exemple.com",
      phoneRequired: "Écris ton numéro de portable.",
      emailRequired: "Écris ton adresse e-mail.",
      emailInvalid: "Écris une adresse e-mail valide.",
      emailVerificationSent: "Un e-mail de vérification a été envoyé à la nouvelle adresse. Confirme-le pour finaliser le changement.",
      emailUpdateError: "Impossible de mettre à jour l’adresse e-mail. Vérifie qu’elle est valide et, si un e-mail de vérification est envoyé, confirme-le d’abord.",
      back: "Retour",
      next: "Continuer",
      finish: "Terminer",
      confirm: "Confirmer",
      ok: "Oui, c’est correct",
      contactSaved: "C’est fait ! Merci d’avoir confirmé tes coordonnées.",


      whatsappLabel: "Ajoute-moi au groupe WhatsApp",
      whatsappHint:
        "Rejoins le groupe pour recevoir les avis, la coordination des transferts et les nouveautés du week-end.",
      whatsappUrl: "https://chat.whatsapp.com/E8LP2oj0sK4GM5Slo1VIFD?s=cl&p=a&ilr=4",
      navStory: "Découvrir l’invitation",
    },

    story: {
      eyebrow: "Notre invitation",



      title: "Un week-end pour se retrouver",
      body:
        "Entre le Mexique et la France, entre nos familles et nos amis, nous avons choisi de nous réunir à Jocotepec, au bord du lac de Chapala, pour célébrer l’amour, l’amitié et tout ce qui nous a conduits jusqu’ici.",

      note:
        "Nous serons immensément heureux de partager ce week-end avec toi.",
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
      navNext: "Découvrir le lieu",
      mapLabel: "Carte du lac de Chapala",

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
    photos: {
      title: "Partage tes photos",
      lead:
        "Nous voulons voir le mariage à travers tes yeux. Nous avons créé deux albums Google Photos partagés où tu peux déposer tes photos.",
      beforeTitle: "📸 Avant le mariage",
      beforeBody: "Partage tes photos préférées de nous avant le grand jour.",
      duringTitle: "🎉 Le mariage vu par les invités",
      duringBody:
        "Après le mariage, partage ici les photos que tu as prises pendant la célébration.",
      beforeLink: "https://photos.app.goo.gl/Df3QwjTKQTGVEqEU6",
      duringLink: "https://photos.app.goo.gl/Vhg2AY3gXzXL2iKp8",
      upload: "Déposer des photos ↗",

      note:
        'Demande l’accès à l’album en cliquant sur « Déposer des photos ». Une fois à l’intérieur, tu pourras déposer toutes les photos que tu veux. Merci de capturer ces moments avec nous !',
    },
    weekend: {
      eyebrow: "Programme détaillé",
      bannerEyebrow: "Réserver la date",

      title: "Trois jours pour célébrer",


      intro:
        "Nous serons à Roca Azul dès le jeudi. Les invités pourront arriver à partir du vendredi vers midi, et la célébration principale sera un mariage d’après-midi le samedi.",
      navSchedule: "Voir les trois jours",
      navProgram: "Programme détaillé",


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
        eyebrow: "Samedi 20",

        title: "L’après-midi, pas à pas",
        warning:
          "Pour celles et ceux qui viennent de Guadalajara : partez très en avance. Les accès vers Jocotepec peuvent facilement être embouteillés et nous avons besoin que tout le monde soit à Roca Azul à 13 h.",

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
      friday: {
        eyebrow: "Vendredi 19",

        title: "Arrivée et bienvenue",
        warning:
          "Un premier moment détendu pour s’installer, se retrouver et commencer le week-end sans se presser.",
        items: [
          { time: "Dès midi", title: "Arrivées et check-in", body: "Accueil et temps pour s’installer dans les gîtes." },
          { time: "Après-midi", title: "Pétanque et jeux", body: "Des jeux en plein air pour briser la glace." },
          { time: "Soir", title: "Pizzas de bienvenue", body: "Un dîner informel pour se retrouver sans se presser." },
        ],
      },
      sunday: {
        eyebrow: "Dimanche 21",

        title: "Petit-déjeuner et au revoir",
        warning: "Une dernière matinée ensemble avant les départs.",
        items: [
          { time: "Matin", title: "Petit-déjeuner", body: "Petit-déjeuner inclus pour les personnes logées dans les gîtes." },
          { time: "Midi", title: "Au revoir", body: "Derniers moments ensemble et départs." },
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
        { time: "Matin", title: "Lumière du lac à l’aube", body: "Le lac calme reflète la lumière dorée de l’aube." },
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
      navNext: "Voir le programme",
    },
    food: {
      eyebrow: "À table",
      title: "Un week-end pour goûter, trinquer et partager",
      body:
        "Nous voulons que chaque repas soit simple, généreux et profondément mexicain. Voici le menu que nous imaginons ; il peut encore évoluer grâce à tes idées.",
      flavoursEyebrow: "Saveurs du Jalisco et du Mexique",
      flavoursTitle: "Qu’allons-nous goûter ?",
      flavours: [
        {
          key: "carnitas",
          type: "food",
          title: "Carnitas",
          body: "Du porc longuement confit jusqu’à devenir tendre et doré, servi avec tortillas, oignon, coriandre, sauces et citron vert.",
        },
        {
          key: "tejuino",
          type: "drink",
          title: "Tejuino",
          body: "Une boisson typique de Guadalajara à base de maïs fermenté, douce et acidulée, servie très fraîche avec citron vert et sel. Version « loco » à la tequila ou au mezcal en option.",
        },
        {
          key: "jericalla",
          type: "dessert",
          title: "Jericalla",
          body: "Le dessert le plus tapatío : une crème cuite à la cannelle et à la vanille, avec sa couche dorée caractéristique.",
        },
        {
          key: "taquiza",
          type: "food",
          title: "Taquiza",
          body: "Une table de plusieurs plats mijotés mexicains, tortillas chaudes et garnitures pour que chacun compose ses propres tacos.",
        },
        {
          key: "aguas",
          type: "drink",
          title: "Aguas de sabor",
          body: "Des boissons fraîches à la jamaïque, à l’horchata et au citron vert pour accompagner le repas.",
        },
        {
          key: "gelatinas",
          type: "dessert",
          title: "Gelées mexicaines",
          body: "Des gelées de fruits, fraîches et légères, pour terminer le repas sur une note sucrée.",
        },
        {
          key: "nopales",
          type: "food",
          title: "Salade de nopales",
          body: "Du cactus nopal tendre avec tomate, oignon, herbes et fromage : une option fraîche, mexicaine et végétarienne.",
        },
        {
          key: "tequila",
          type: "drink",
          title: "Tequila",
          body: "De la tequila pour trinquer et célébrer, servie avec sel et citron vert.",
        },
        {
          key: "postres-tapatios",
          type: "dessert",
          title: "Dulces mexicanos",
          body: "Une sélection de douceurs traditionnelles mexicaines pour sucrer la fin du repas.",
        },
        {
          key: "guacamole",
          type: "food",
          title: "Guacamole et options végétariennes",
          body: "Il y aura du guacamole, des tortillas, des sauces et d’autres accompagnements sans viande. Tu pourras préciser tes restrictions dans le RSVP.",
        },
        {
          key: "pizza",
          type: "food",
          title: "Pizza",
          body: "Des pizzas à partager le vendredi soir : un accueil simple et informel après les arrivées et la pétanque.",
        },
        {
          key: "esquites",
          type: "food",
          title: "Esquites",
          body: "Du maïs tendre cuit avec de l’épazote, du piment, du citron vert et du fromage : un classique de la rue mexicaine.",
        },
      ],

      flavourType: {
        food: "Plat",
        drink: "Boisson",
        dessert: "Dessert",
      },

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
            "Petit-déjeuner inclus pour les personnes logées dans les gîtes.",
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
            "Petit-déjeuner inclus pour les personnes logées dans les gîtes.",
            "Une matinée tranquille avant les départs ou la suite vers la côte.",
          ],
        },
      ],
      note:
        "Les détails sont encore en préparation. Nous pensons aussi à l’eau, aux boissons sans alcool, au café, aux options pour les enfants et aux besoins alimentaires particuliers.",
      photoCredits: "Crédits photographiques",
      drinks: {
        eyebrow: "Alcool avec modération",
        title: "La politique des munitions",

        body:
          "Nous prévoirons une quantité raisonnable d’alcool par invité, principalement de la bière et de la tequila, ainsi que des sodas et des boissons sans alcool.",
        note:
          "Si tu veux être certain que la soirée soit particulièrement bien arrosée, tu peux apporter tes propres munitions, à partager et à savourer avec modération.",
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
          note: "La marimba est un idiophone à clavier de bois : des lames de bois dur frappées avec des mailloches qui résonnent dans des tubes. Son timbre chaleureux et mélodique, héritage du sud-est du Mexique et du Guatemala, accompagne le premier verre avant les carnitas.",
          image: "marimba",
        },

        {
          moment: "Après la cérémonie au phare",
          name: "Mariachi",
          note: "Le mariachi est l’orchestre traditionnel mexicain par excellence : violons, trompettes, vihuela et guitarrón. Ses sones et rancheras, avec son cri caractéristique, ouvrent le dîner d’une entrée festive.",
          image: "mariachi",
        },
        {
          moment: "Après le dîner",
          name: "Norteño",
          note: "Le norteño est le son du nord du Mexique : accordéon et bajo sexto, avec polkas, corridos et cumbias. Son rythme dansant ouvre la piste et la fête.",
          image: "norteno",
        },

        {
          moment: "Le set de trop ?",
          name: "Fanfare",


          note: "38 tonnes, une fanfare française qui mêle cuivres et percussions. Découvre-les sur leur site et dans leur incroyable vidéo à Guča, avec une apparition du marié et un solo inoubliable.",
          image: "frenchBand",
          logo: "frenchBandLogo",
          website: "https://www.38tonnes.fr/",
          link: "https://www.youtube.com/watch?v=eq_MLyQsdr8",
        },

      ],

      stage: {
        eyebrow: "Scène ouverte",
        title: "Une chanson que tu aimerais chanter ?",
        body:
          "Ajoute ici tes titres pour l’ambiance, la danse ou le karaoké. Nous pourrons peut-être profiter de la présence des musiciens pour t’accompagner et en faire un moment inoubliable.",
      },
      playlists: {
        eyebrow: "À écouter dès maintenant",
        title: "La bande-son commence ici",
        body:
          "Trois playlists pour se mettre dans l’ambiance, découvrir des chansons et préparer tes plus belles interprétations.",
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
        name: "Ton nom",
        dessert: "Quel dessert préfères-tu ?",
        food: "Que manque-t-il ou qu’aimerais-tu ajouter ?",
        song: "Chanson proposée",
        artist: "Artiste ou version",
        sing: "Souhaites-tu la chanter ?",
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
          { value: "maybe", label: "Peut-être, encourage-moi" },
          { value: "request", label: "Je veux simplement l’entendre" },
        ],
      },
      button: "Envoyer mes suggestions",
      previewNote:
        "Tes chansons, votes et idées seront enregistrés de façon privée.",
    },
    facilities: {
      eyebrow: "Le lieu",
      title: "Tout le club à ta disposition",

      body:
        "Entre cérémonie et célébration, tout le club est à nous : piscines, jardins, terrains et gîtes pour se retrouver, explorer ou simplement se reposer.",

      videoTitle: "Vidéo de présentation de Roca Azul",
      privacyTitle: "Intimité",
      privacyBody:
        "Tous les gîtes seront louées par les invités du mariage, environ 80 à 90 personnes. En outre, d’autres invités du mariage seront logés non loin, peut-être à proximité, ou viendront seulement pour la journée : environ 60 personnes selon les estimations actuelles. Le club ne sera toutefois pas entièrement privé ce week-end : certains espaces accueillent encore des tentes ou des caravanes. Nous partagerons les lieux et respecterons le calme. La musique pourra jouer jusqu’à 2 h du matin, puis nous continuerons dans les gîtes.",

      gallery: [
        { key: "pool", title: "Piscines", alt: "Piscine et jardins du Club Roca Azul" },
        { key: "courts", title: "Sport", alt: "Terrains de sport de Roca Azul" },
        { key: "gardens", title: "Jardins", alt: "Espaces verts du Club Roca Azul" },
        { key: "cabins", title: "Gîtes", alt: "Gîtes et chambres de Roca Azul" },

      ],
      gallerySource: "Photos du lieu : Club Roca Azul",
      rocaGalleryLabel: "Galerie de photos du Club Roca Azul",
      rocaGalleryAlts: [
        "Vue du Club Roca Azul",
        "Jardins du Club Roca Azul",
        "Piscine du Club Roca Azul",
        "Gîtes du Club Roca Azul",
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
      navNext: "Découvrir le lieu",
      navContinue: "Réserver la date",
      navIdentity: "Ton nom est-il bien écrit ?",
    },
    accommodation: {

      eyebrow: "Hébergement",
      title: "Dormir sur place, nous organiser à temps",
      citation:
        "La fête commence dès le vendredi ou le samedi dans l’après-midi. Il est conseillé de réserver un logement sur place.",
      body:
        "Nous disposons d’environ 80 places sur le lieu. Malheureusement, nous ne pouvons pas proposer cette option à tout le monde. Comme les gîtes et les chambres doivent être répartis avec soin, merci de nous indiquer dès que possible l’option d’hébergement que tu auras choisie.",
      facts: [
        { value: "≈ 80–90", label: "places disponibles" },
        {
          value: "≈ 1 200 MXN",
          euroValue: "≈ 60 €",
          label: "par personne · 2 nuits",
        },
        { value: "2", label: "petits-déjeuners inclus" },
      ],
      specialNote:
        "L’hébergement se réserve uniquement sous la forme d’un forfait complet de deux nuits, du vendredi 19 au dimanche 21 : une seule nuit n’est pas possible. Le tarif estimatif est de 1 200 MXN par personne pour les deux nuits et comprend les deux petits-déjeuners du week-end.",
      noteTitle: "À savoir",
      noCabinRecommendation:
        "Nous te recommandons de chercher un hôtel ou un Airbnb dans les environs.",
      guestOption: {
        eyebrow: "Ton hébergement",
        membersLabel: "Membres du groupe",
        linkLabel: "Voir l’option prévue pour toi",
        backLabel: "Retour à l’hébergement",
        onSiteTitle: "Nous avons un place pour toi!",
        onSiteBody:
          "Voici l’option que nous avons prévu pour toi, nous esperons qu’elle te plaira",
        onSiteCoveredBody:
          "Ton séjour est pris en charge par les mariés : tu n’auras rien à payer!",

        onSitePayBody:
          "Ton séjour n’est pas pris en charge par les mariés : tu paieras ta part.",
        independentTitle: "Hébergement de ton côté",
        independentBody:
          "Nous te recommandons de chercher un hôtel ou un Airbnb dans les environs.",
        cabinLabel: "Gîte",
        roomLabel: "Chambre",
        cabinCapacityLabel: "Capacité du gîte",
        roomCapacityLabel: "Capacité de la chambre",
        cabinPriceLabel: "Prix du gîte",
        personPriceLabel: "Participation aux frais par personne",
        groupPriceLabel: "Participation aux frais par le groupe",
        coveredPriceLabel: "Pris en charge par les mariés",

        peopleLabel: "personnes",
        cabinOccupancyLabel: "Modalité du gîte",
        roomOccupancyLabel: "Modalité de la chambre",
        occupancy: { privada: "Privée", compartida: "Partagée" },
        wholeCabinTitle: "Occupation complète du gîte",
        wholeCabinBody: "Toutes les chambres et les personnes affectées à chacune d’elles.",
        emptyRoom: "Aucune personne affectée",
        youLabel: "Toi",
        airbnbTitle: "Airbnbs près de Roca Azul",
        airbnbBody:
          "Ces options sont apparues dans la zone pour les nuits du 19 au 21 février 2027. Vérifie la disponibilité et le tarif directement sur Airbnb.",
        airbnbAreaPrice: "Prix d’entrée observé dans la zone",
        fromPrice: "À partir de · tarif indicatif",
        perNight: "par nuit",
        beforeTaxes: "hors taxes",
        airbnbGuests: "voyageurs",
        airbnbBedrooms: "chambres",
        airbnbBeds: "lits",
        airbnbRating: "Note",
        airbnbView: "Voir le logement",
        airbnbSearchAll: "Voir toute la recherche sur Airbnb",
        hotelTitle: "Hôtels près de Roca Azul",
        hotelBody:
          "Tarifs indicatifs observés actuellement. Vérifie auprès de chaque hôtel les disponibilités, les taxes et le prix final pour les nuits du 19 au 21 février 2027.",
        hotelLocation: "Secteur",
        hotelView: "Voir l’hôtel",
        hotelTypes: {
          spaHotel: "Hôtel spa",
          boutiqueSpa: "Boutique resort et spa",
          thermalHotel: "Hôtel et eaux thermales",
        },
        paymentLabel: "Paiement",
        payment: {
          covered: "Pris en charge par les mariés",
          paid: "Paiement enregistré",
          pending: "À confirmer",
        },
        extraCabinLabel: "Hébergement supplémentaire",
        planCardTitle: "Ton plan d’hébergement",
        planCardPerPerson: "Pour {name} · 2 nuits",
        planCardSaleLabel: "Pris en charge par les mariés",
        planCardGroupTotal: "Total du groupe",
        planCardEurDisclaimer: "Prix estimé en MXN",
        planCardEstimate: "Le montant final sera confirmé directement.",
      },


      contactPrompt: "Plus d'infos",


      cabinsShowcase: {
        eyebrow: "Découvre les gîtes",
        privateVideoEyebrow: "Vidéo privée",
        privateVideoTitle: "Une visite des gîtes",
        key: "azalea",
        title: "Azalea",
        intro:
          "La première gîte de notre catalogue : spacieuse, avec de belles pièces communes et une capacité annoncée de 12 personnes.",
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
          "Salle à manger et espace commun du gîte Azalea",
          "Salon et salle à manger du gîte Azalea",
          "Salon du gîte Azalea",
          "Chambre avec deux lits doubles dans Azalea",
          "Deuxième chambre avec deux lits doubles dans Azalea",
          "Chambre avec trois lits simples dans Azalea",
          "Salle de bain avec douche du gîte Azalea",
          "Cuisine équipée du gîte Azalea",
          "Comptoir et cuisine du gîte Azalea",
        ],
        note:
          "Nous confirmerons directement la répartition finale des invités.",
        additionalUnits: [
          {
            key: "dalia",
            title: "Dalia",
            intro:
              "Une gîte lumineuse près de la piscine, avec trois chambres et dix couchages parfaitement identifiés.",
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
              "Salle à manger du gîte Dalia près de la piscine",
              "Salon du gîte Dalia",
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
              "Une gîte joyeuse aux tons jaunes, avec trois chambres, des espaces communs lumineux et un jardin avec foyer extérieur.",
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
              "Espace commun intérieur du gîte Margarita",
              "Chambre avec quatre lits simples superposés dans Margarita",
              "Salle de bain avec douche de Margarita",
              "Chambre avec deux lits doubles dans Margarita",
              "Cuisine avec comptoir du gîte Margarita",
              "Salle à manger du gîte Margarita",
              "Chambre avec un lit double dans Margarita",
              "Jardin et foyer extérieur du gîte Margarita",
            ],
            note:
              "Le coût interne enregistré est de 11 150 MXN pour les deux nuits ; l’attribution et le montant final par personne seront confirmés directement.",
          },
          {
            key: "wooden",
            title: "Gîtes en bois 31–34",
            intro:
              "Quatre gîtes indépendantes sous les arbres, idéales pour les couples ou petites familles qui souhaitent un espace plus intime.",
            capacity: "4 gîtes",
            roomsLabel: "2 adultes par unité",
            bedsLabel: "Jusqu’à 2 mineurs",
            rooms: [
              "Unités disponibles · 31, 32, 33 et 34",
              "Dans chaque unité · 1 lit king size",
              "Dans chaque unité · 1 canapé-lit double",
            ],
            amenities:
              "Les photos et la vidéo montrent une terrasse, un réfrigérateur, un lavabo, une télévision et un intérieur entièrement habillé de bois.",
            galleryLabel: "Galerie des gîtes en bois 31 à 34",
            photoAlts: [
              "Extérieur d’un gîte en bois sous les arbres",
              "Entrée du gîte en bois numéro 34",
              "Lit king size dans un gîte en bois",
              "Canapé-lit et équipements intérieurs d’un gîte en bois",
            ],
            videoLabel: "Visite vidéo · 16 s",
            note:
              "Tarif interne par unité pour les deux nuits : 5 310 MXN pour 2 adultes, ou 5 790 MXN pour 2 adultes et 2 mineurs. Nous confirmerons directement l’attribution et le montant final.",
          },
        ],
      },
      plan: {
        eyebrow: "Comment ça marche ?",
        title: "Dis-nous ce que tu préfères",
        body:
          "Ta réponse nous permettra de répartir les gîtes de façon juste et organisée.",
        steps: [
          "Indique ta préférence d’hébergement dans le RSVP.",
          "Nous organiserons les gîtes selon les groupes, les dates et les disponibilités.",
          "Nous confirmerons directement l’attribution, le tarif final et le paiement.",
        ],
        button: "Répondre au RSVP",
      },
      navNext: "Pétanque",
      recap: {
        eyebrow: "Confirmation de l’hébergement",
        title: "Confirme-tu ton hébergement ?",
        intro:
          "Indique pour chaque personne si elle restera à Roca Azul afin que nous puissions organiser les gîtes.",
        hasCabinQuestion: "Reste-t-elle à Roca Azul ?",
        hasCabinQuestionCabin: "Ok pour {cabin} ?",
        noCabinQuestion: "Me prévenir si un logement se libère",
        yesLabel: "Oui",

        noLabel: "Non",
        button: "Enregistrer ma confirmation",
        success: "Confirmation enregistrée. Merci !",
        error: "Impossible d’enregistrer. Réessaie.",
        summaryTitle: "Résumé de ta confirmation",
        summaryIntro:
          "Voici ce que tu as indiqué pour chaque personne. Tu peux le modifier et réenregistrer quand tu veux.",
      },
    },
    travel: {


      eyebrow: "Je viens de loin",
      title: "Ton voyage fait aussi partie de la fête",
      body:
        "Nous accompagnerons personnellement celles et ceux qui viennent d’Europe et d’ailleurs : choix des vols, arrivée à Guadalajara, hébergement et transferts.",
      points: [
        "Madrid–Guadalajara est la liaison directe prioritaire depuis l’Europe.",
        "Nous coordonnerons les accueils dès réception de tes numéros de vol.",
        "Chaque voyageur aura un itinéraire d’arrivée, de séjour et de retour.",
      ],
      routes: {
        eyebrow: "Schéma des trajets",
        title: "Rejoindre Roca Azul, puis continuer vers la côte",
        note:
          "Les durées indiquées sont indicatives et peuvent varier énormément. Sois prévoyant et, encore mieux, sois sur place en avance en réservant un logement si tu peux.",
        venue: "Roca Azul · Jocotepec",
        toVenueLabel: "Vers Roca Azul",
        toBeachLabel: "Vers la plage",
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
      vuelosImage: "vol_chr0ri",
      vuelosLabel: "Carte des vols",
    },
    attire: {

      eyebrow: "Code vestimentaire",
      title: "Esthétique mexicaine",
      body:
        "Nous avons choisi une esthétique mexicaine pour notre mariage en hommage à la culture, la cuisine, la musique et le lieu qui nous réunit. Nous voulons que tout soit festif, coloré et profondément mexicain.",
      dressCode: {
        title: "Habille-toi en couleur",
        paragraphs: [
          "Nous sommes immensément heureux de partager ce jour avec toi, et nous souhaitons que, tout comme chaque personne a laissé une empreinte spéciale dans notre vie, chacun apporte un peu de son essence à cette célébration.",
          "Nous croyons que les couleurs transmettent de l’énergie, de la joie et de la personnalité. C’est pourquoi nous aimerions que tu nous accompagnes en portant des tons pleins de vie, en évitant le noir, le gris et le blanc.",
          "Notre mariage aura une inspiration mexicaine, avec une décoration aux tons blancs et des détails artisanaux. David portera une guayabera en lin blanc avec des broderies dorées, et nous porterons tous les deux des pièces brodées par des artisanes d’une communauté d’Oaxaca, en hommage à la richesse de nos traditions.",
          "La seule règle est que tu sois toi-même : élégant, à l’aise et prêt à célébrer, danser et remplir ce jour de couleur, d’amour et de bonne énergie.",
          "Merci de faire partie de notre histoire ! ✨🌼",
        ],
        pictograms: {
          ariaLabel: "Pictogrammes du code vestimentaire",
          noWhite: "Évite le blanc",
          noBlack: "Évite le noir",
          noGrey: "Évite le gris",
          colorGreen: "Vert",
          colorTeal: "Turquoise",
          colorMarigold: "Jaune",
          dressNoWhite: "Robe : évite le blanc",
          dressNoBlack: "Robe : évite le noir",
          dressNoGrey: "Robe : évite le gris",
          dressColor: "Robe colorée",
          funky: "Imprimés amusants",
          mexican: "Motifs mexicains",
        },
      },

      guestNote:
        "Le plus important est que tu sois à l'aise et que tu célèbres avec nous. Si tu as des questions, écris-nous.",
      navNext: "Hébergement",

    },
    gift: {
      eyebrow: "Cadeaux",

      title: "Le plus beau cadeau, c'est ta présence",

      body:
        "Ta présence est le plus beau cadeau que nous puissions recevoir. Si tu souhaites tout de même nous faire un geste, nous serons touchés par toute contribution pour notre lune de miel ou nos projets de couple.",
      note:
        "Il n'y a aucune obligation ni attente — ce qui nous rend vraiment heureux, c'est de partager ce week-end avec toi.",
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
            "CLABE : 012 320 01559313382 0",
            "Banque : BBVA",
            "Nom : David AILI",
          ],
        },

      },
      cta: "Parler aux mariés",
    },
    thanks: {
      eyebrow: "Remerciements",
      title: "Merci",
      subtitle:
        "Sans nos parrains et nos aides, rien de tout cela ne serait possible. Nous tenons à remercier avec toute notre gratitude…",

      credits: [
        { name: "Manuel Amuezca", role: "Wedding planner" },
        { name: "Manuel Amuezca", role: "Pizzas du vendredi" },
        { name: "Manuel Amuzeca", role: "Pizzas du vendredi" },
        { name: "Ismael", role: "Pizzas" },
        { name: "Isabel Guadalupe", role: "Tenues des mariés" },
      ],
      humor: [
        "Si tu veux apparaître ici, contacte notre programme d’affiliation au programme de parrain.",

        "Tu apparais ici sans le savoir : une mission t’a été confiée. Dommage, mais il est impossible de l’effacer : l’admin IT de la page est en vacances, on ne peut pas le supprimer, donc il faut s’y tenir.",
        "Tu as apporté ton aide et tu n’apparais pas. Dommage. L’IT est peut-être en vacances, mais envoie tes réclamations aux mariés ou au wedding planner.",
      ],
      cta: "Contacter les mariés",
      ctaPlanner: "Wedding planner",
      guestCloud: {
        eyebrow: "Nos invités",
        title: "Tous ceux qui nous accompagnent",
        subtitle:
          "Chaque nom est une histoire partagée. Merci de faire partie de ce jour.",
        navNext: "Voir le programme",
        modeGroupLabel: "Mode du nom",
        modeFull: "Nom complet",
        modeFirst: "Prénom",
        modeLast: "Nom de famille",
      },

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
            "Louer un gîte deux nuits de plus, du dimanche au mardi, pour continuer à se retrouver sur place. Si cela t’intéresse, indique-le dans le RSVP et nous organiserons le gîte pour ton groupe.",
        },
        {
          title: "Plan 2 · La plage",
          body:
            "Du mardi au samedi, nous partons sur la côte. Ce n’est pas une lune de miel — tu es cordialement invité à continuer la fête à Barra de Navidad. Nous pouvons organiser des transports en commun.",
        },
      ],
      note:
        "Les dates exactes, le transport et le budget dépendront du nombre de personnes intéressées. Une nuit d’hôtel à Barra de Navidad à cette saison coûte environ 1 200–2 500 MXN par personne.",
      form: {
        eyebrow: "Sondage sans engagement",
        title: "Tu t’inscris ?",
        body:
          "Dis-nous quel plan t’intéresse pour qu’on commence à organiser la logistique.",
        fields: {
          name: "Nom",
          interest: "Niveau d’intérêt",
          partySize: "Personnes intéressées",
          plan: "Plan qui t’intéresse",
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
      rsvpMini: {
        eyebrow: "Et après ?",
        title: "Tu t’inscris ?",
        intro:
          "Dis-nous quelle est la probabilité que tu rejoignes chaque plan. Tu peux modifier ta réponse à tout moment.",
        questions: [
          {
            id: "rocaAzul",
            title: "Plan 1 · Rester à Roca Azul",
            subtitle: "Du dimanche au mardi, deux nuits de plus sur place.",
          },
          {
            id: "playa",
            title: "Plan 2 · La plage",
            subtitle: "Du mardi au samedi, à Barra de Navidad.",
          },
        ],
        recapTitle: "Résumé",
        recapProgress: "répondu·e·s",
        button: "Enregistrer mes réponses",
        success: "Merci ! Nous avons enregistré tes réponses.",
        error: "Impossible d’enregistrer. Vérifie ta connexion et réessaie.",
      },
      suggestions: {
        eyebrow: "Où dormir",
        title: "Suggestions à Barra de Navidad",
        body:
          "Si le plan plage t’intéresse, ces options sont apparues dans la zone pour les nuits du 23 au 28 février 2027. Vérifie la disponibilité et le tarif directement.",
        airbnbTitle: "Airbnbs près de Barra de Navidad",
        airbnbBody:
          "Ces options sont apparues dans la zone pour les nuits du 23 au 28 février 2027. Vérifie la disponibilité et le tarif directement sur Airbnb.",
        airbnbAreaPrice: "Prix d’entrée observé dans la zone",
        fromPrice: "À partir de · tarif indicatif",
        perNight: "par nuit",
        beforeTaxes: "hors taxes",
        airbnbGuests: "voyageurs",
        airbnbBedrooms: "chambres",
        airbnbBeds: "lits",
        airbnbRating: "Note",
        airbnbView: "Voir le logement",
        airbnbSearchAll: "Voir toute la recherche sur Airbnb",
        hotelTitle: "Hôtels à Barra de Navidad",
        hotelBody:
          "Tarifs indicatifs observés actuellement. Vérifie auprès de chaque hôtel les disponibilités, les taxes et le prix final.",
        hotelLocation: "Secteur",
        hotelView: "Voir l’hôtel",
        hotelTypes: {
          budgetHotel: "Hôtel économique",
          beachHotel: "Hôtel face à la plage",
          boutiqueHotel: "Hôtel boutique",
        },
      },
      budget: {
        eyebrow: "Budget estimé",
        title: "Combien coûterait la plage ?",
        intro:
          "Avec une nuit d’hôtel à Barra de Navidad de 1 200 à 2 500 MXN par personne, nous calculons une estimation pour les 4 nuits du plan plage (mardi à samedi), selon le nombre de personnes de ton groupe qui se sont inscrites.",
        perNightPerPerson: "par nuit et par personne",
        nights: "nuits",
        interested: "personnes intéressées",
        minLabel: "Estimation minimale",
        maxLabel: "Estimation maximale",
        totalLabel: "Total estimé pour ton groupe",
        bigTotal: "Total estimé",
        disclaimer:
          "Estimation indicative. Le prix final dépendra de l’hébergement choisi, de la saison et de la confirmation directe avec chaque hôtel ou Airbnb.",
      },
      extraStay: {
        eyebrow: "Ton séjour · dimanche à mardi",
        title: "Ton gîte du dimanche au mardi",

      },
    },


    rsvp: {

      eyebrow: "RSVP",
      title: "Seras-tu avec nous ?",
      body:
        "Une seule réponse nous permettra d’organiser ta présence, ton hébergement et ton voyage. Si tes vols ne sont pas encore réservés, tu pourras nous les transmettre plus tard.",
      groups: {
        attendance: "Présence et hébergement",
        travel: "Je viens de loin",
        notes: "Un dernier détail",
      },
      petanque: {
        eyebrow: "Tournoi de pétanque",
        intro: "Le vendredi après-midi, nous organiserons un tournoi de pétanque. Tu participes ?",
        organizerLabel: "Organise : David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "Participes-tu au tournoi ?",
          partySize: "Combien de personnes ?",
          names: "Noms des participants",
          namesPlaceholder: "Ex. David, Aydé, Dimitar…",
          ownBoules: "As-tu besoin que nous te prêtions des boules ?",
        },

        options: {
          participation: [
            { value: "yes", label: "Oui, nous voulons jouer" },
            { value: "no", label: "Pas cette fois" },
            { value: "maybe", label: "Peut-être, décide pour nous" },
          ],
          ownBoules: [
            { value: "yes", label: "Oui, nous apportons" },
            { value: "no", label: "Non, nous avons besoin" },
          ],
        },
      },
      travelNote:
        "Remplis cette partie uniquement si tu viens d’une autre ville ou d’un autre pays. Nous avons besoin des trajets aller et retour pour organiser les transferts.",
      fields: {
        fullName: "Nom complet",
        whatsapp: "WhatsApp (pour les communications à venir)",

        attendance: "Seras-tu avec nous ?",
        groupMode: "Réponds-tu seul·e ou en groupe ?",
        groupName: "Nom du groupe ou de la famille",
        partySize: "Personnes dans ton groupe",
        adults: "Adultes de 18 ans ou plus",
        children: "Mineurs de moins de 18 ans",
        guests: "Noms des accompagnants",
        accommodation: "Projet d’hébergement",
        independentArrival: "Quand penses-tu arriver à Roca Azul ?",
        sundayMorning: "Nous verrons-nous dimanche matin ?",
        travelStatus: "État de ton voyage",
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
        "Ta réponse sera enregistrée de façon privée et accessible uniquement aux mariés.",
      progressLabel: "Avant d’envoyer, complète chaque section :",
      progressTeAnimas: "Ça te tente ? (vendredi, samedi, dimanche)",
      progressPetanque: "Tournoi de pétanque",
      progressCoast: "Et après ? (plage)",
      progressResume: "Terminé",
      progressPending: "En attente",
      recap: {
        title: "Résumé",
        answered: "répondu·e·s",
        yes: "Oui",
        no: "Non",
      },

      scale: {
        intro:
          "Dis-nous, jour par jour, quelle est la probabilité que tu sois avec nous. Tu peux modifier ta réponse à tout moment.",
        saveButton: "Enregistrer mes réponses",
        savedNote: "Merci ! Nous avons enregistré tes réponses.",
        questions: [
          {
            id: "friday",
            title: "Vendredi 19 · On se voit ?",
            subtitle: "Arrivée et bienvenue dès midi.",
          },
          {
            id: "saturday",
            title: "Samedi 20 · On se voit ?",
            subtitle: "Le mariage d’après-midi : cérémonie, dîner et danse.",
          },
          {
            id: "sunday",
            title: "Dimanche 21 · On se voit ?",
            subtitle: "Petit-déjeuner et au revoir le matin.",
          },
        ],
      },
      payment: {
        title: "Participation aux frais",
        intro:
          "Voici le détail de ta participation aux frais pour ton hébergement.",
        cabinTitle: "Gîte du vendredi au dimanche",
        extraCabinTitle: "Gîte supplémentaire du dimanche au mardi",
        perPerson: "Participation aux frais par personne",
        perGroup: "Participation aux frais par le groupe",
        total: "Total",

        asterisk:
          "Nous apprécions ta compréhension : nous aurions aimé tout payer pour tout le monde, mais ce n’est pas possible. C’est une option que nous avons prévue pour toi, et nous comprenons si tu préfères autre chose. Fais-nous simplement part de ton choix.",
      },

    },
    petanqueTribute: {
      eyebrow: "Pétanque",

      title: "Un hommage à la pétanque",
      intro:
        "La pétanque nous a réunis autour d’une merveilleuse communauté d’amis et de coéquipiers de club, au Mexique et dans le monde.",
      body:
        "Le vendredi après-midi, nous organiserons un tournoi de pétanque pour célébrer ce jeu que nous aimons tant. Aucune expérience n’est requise : juste l’envie de jouer, de rire et de partager.",
      homage: "Ça te tente !",
      photosLabel: "Photos de pétanque",

      photoAlts: [
        "Joueurs de pétanque au club",
        "Boules sur le terrain",
        "Un tir de pétanque",
        "Le cercle de lancer",
      ],
      navNext: "À table",
      rsvpMini: {
        eyebrow: "Tournoi de pétanque",
        title: "Tu t’inscris ?",
        intro: "Le vendredi après-midi, nous organiserons un tournoi de pétanque. Tu participes ?",
        organizerLabel: "Organise : David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "Participes-tu au tournoi ?",
          ownBoules: "As-tu besoin que nous te prêtions des boules ?",
          ownBoulesHint: "Si tu n’en as pas, pas de souci : nous t’en prêterons pour jouer.",
        },
        yesLabel: "Oui",
        noLabel: "Non",
        success: "Merci ! Nous avons enregistré tes réponses.",
        error: "Impossible d’enregistrer. Vérifie ta connexion et réessaie.",
        button: "Enregistrer mes réponses",
        recapTitle: "Résumé",
      },
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
      home: "Home",
      you: "You",
      story: "Invitation",


      weekend: "Save the date",
      programme: "Programme",
      venue: "The venue",
      accommodation: "Accommodation",
      travel: "FLIGHTS",
      attire: "Attire",


      weather: "Weather",
      gift: "Gifts",
      photos: "Photos",
      thanks: "Thanks",
      guests: "Guests",
      rsvp: "RSVP",



      dashboard: "admin",
      changeEmail: "Change email",
      changePassword: "Change password",
      music: "Music",
      logout: "Log out",

      emailWarningTitle: "Before you change your email",
      emailWarningBody:
        "Your invitation access will move to the new email. We will send a verification email and you must confirm it to finish.",
      currentEmailLabel: "Current email",
      newEmailLabel: "New email",
      newEmailPlaceholder: "new@email.com",
      emailInvalid: "Enter a valid email address.",
      emailSuccess: "Email updated.",
      emailUnchanged: "This email is already active on your account.",
      emailError: "We could not change the email. Please try again.",
      emailVerificationSent:
        "We sent a verification email to the new address. Confirm it to complete the change.",
      emailReauthRequired:
        "For security, confirm your password before changing the email.",
      emailReauthLabel: "Current password",
      emailReauthPlaceholder: "Enter your password",
      emailReauthPasswordRequired: "Enter your current password.",

      newPasswordLabel: "New password",
      newPasswordPlaceholder: "At least 6 characters",
      passwordError: "The password must be at least 6 characters.",
      passwordSuccess: "Password updated!",
      cancel: "Cancel",
      save: "Save",
      working: "Saving…",

      teAnimas: "Are you in?",
      petanque: "Pétanque",
      food: "Food",
      coast: "And afterwards?",

      menu1: "Menu",
      menu2: "More",

      about: "About",

      aboutTitle: "About this invitation",
      aboutSubtitle:
        "A digital invitation made with care to celebrate our weekend by Lake Chapala.",
      aboutClose: "Close",
      close: "Close",
      ok: "OK",
      successTitle: "Done!",
      currentPasswordLabel: "Current password",
      currentPasswordPlaceholder: "Enter your current password",
      confirmPasswordLabel: "Confirm password",
      confirmPasswordPlaceholder: "Repeat the new password",
      passwordMismatch: "The passwords do not match.",
      passwordReauthRequired: "Confirm your current password to continue.",
      passwordWrongCurrent: "The current password is incorrect.",
      emailDomainError: "This email is not from an allowed domain.",
      emailErrorTitle: "We could not update the email",
    },



    countdown: {
      prefix: "Married in",
      years: "years",
      months: "months",
      days: "days",
      hours: "hours",
      minutes: "min",
      arrived: "Married since",
    },



    hero: {
      eyebrow: "You are invited to our wedding",
      invitation: "We want to celebrate this moment with you",


      scroll: "Let's begin",
      navStory: "Discover our invitation",

      imageNote: "Our photograph will go here",
      imageAlt: "David and Aydé together",
      selectImage: "Show photograph",
      pause: "Pause photos",
      play: "Resume photos",
    },
    identity: {
      eyebrow: "Identity check",
      title: "Is your name spelled correctly?",
      titleGroup: "Are the details of the {count} guests in this group correct?",
      titleSingle: "Are your personal details correct?",

      body:
        "We want every guest to feel recognised. If your name or someone in your group is misspelled, correct it here and we will use it in the invitation and at the table.",
      note:
        "You can also upload a photo of your face if you wish, as a keepsake (a nice portrait preferably).",

      you: "You",
      firstName: "First name",
      lastName: "Last name",
      firstNameLabel: "First name",
      middleNameLabel: "Middle name",
      lastNameLabel: "Last name",
      maternalLastNameLabel: "Second last name",
      nombreLabel: "First name",
      nombre2Label: "Middle name",
      apellidoLabel: "Last name",
      apellido2Label: "Second last name",

      fullName: "Full name",
      editName: "Correct name",

      correctNumber: "Correct number",
      edit: "Edit",
      verify: "Verify",
      membersLabel: "Invitation group",

      addPhoto: "Upload photo",


      changePhoto: "Change photo",
      uploading: "Uploading…",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      saved: "Done! We updated it.",
      savedWithName: "Done! {name} is up to date.",
      saveError: "We could not save. Check your connection and try again.",

      nameRequired: "Please enter at least your first name.",
      photoSaved: "Photo saved! Thank you.",
      photoError: "We could not upload the photo. Please try again.",

      stepLabel: "Step",
      step1Title: "Is your name spelled correctly?",
      step2Title: "What is your mobile number?",
      step3Title: "What is your email address?",
      step2Body:
        "We will only use it to contact you about the wedding (confirmations, last-minute changes, or transfer coordination).",
      step3Body:
        "We will send you the formal invitation and any important information before the big day.",
      contactFor: "Contact for",
      phoneLabel: "Mobile number",

      phonePlaceholder: "E.g. 33 1234 5678",
      phoneMissing: "Mobile number missing",
      emailLabel: "Email address",
      emailPlaceholder: "you@example.com",
      phoneRequired: "Please enter your mobile number.",
      emailRequired: "Please enter your email address.",
      emailInvalid: "Please enter a valid email address.",
      emailVerificationSent: "We sent a verification email to the new address. Confirm it to complete the change.",
      emailUpdateError: "We could not update the email. Check that it is valid and, if a verification email is sent, confirm it first.",
      back: "Back",
      next: "Continue",
      finish: "Finish",
      confirm: "Confirm",
      ok: "Yes, it's correct",
      contactSaved: "Done! Thank you for confirming your details.",

      whatsappLabel: "Add me to the WhatsApp group",
      whatsappHint:
        "Join the group to receive announcements, transfer coordination, and weekend updates.",
      whatsappUrl: "https://chat.whatsapp.com/E8LP2oj0sK4GM5Slo1VIFD?s=cl&p=a&ilr=4",
      navStory: "Discover the invitation",
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
      navNext: "Discover the venue",
      mapLabel: "Map of Lake Chapala",

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
    photos: {
      title: "Share your photos",
      lead:
        "We would love to see the wedding through your eyes. We have created two shared Google Photos albums where you can upload your pictures.",
      beforeTitle: "📸 Before the wedding",
      beforeBody: "Share your favourite photos of us before the big day.",
      duringTitle: "🎉 The wedding through guests’ eyes",
      duringBody:
        "After the wedding, share the photos you took during the celebration here.",
      beforeLink: "https://photos.app.goo.gl/Df3QwjTKQTGVEqEU6",
      duringLink: "https://photos.app.goo.gl/Vhg2AY3gXzXL2iKp8",
      upload: "Upload photos ↗",

      note:
        'Request access to the album by clicking “Upload photos”. Once inside, you can upload as many photos as you like. Thank you for capturing these moments with us!',
    },
    weekend: {
      eyebrow: "Detailed programme",
      bannerEyebrow: "Save the date",

      title: "Three days to celebrate",


      intro:
        "We will be at Roca Azul from Thursday. Guests may arrive from around midday on Friday, and Saturday’s main celebration will be an afternoon wedding.",
      navSchedule: "See the three days",
      navProgram: "Detailed programme",

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
        eyebrow: "Saturday 20",

        title: "The afternoon, step by step",
        warning:
          "If you are travelling from Guadalajara, please leave plenty of time. The roads into Jocotepec can become congested very easily, and everyone needs to be at Roca Azul by 1 pm.",

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
      friday: {
        eyebrow: "Friday 19",

        title: "Arrival and welcome",
        warning:
          "A relaxed first gathering to settle in, connect, and ease into the weekend.",
        items: [
          { time: "From midday", title: "Arrivals and check-in", body: "Welcome and time to settle into the guest houses." },
          { time: "Afternoon", title: "Pétanque and games", body: "Outdoor games to break the ice." },
          { time: "Evening", title: "Welcome pizzas", body: "An informal dinner to reconnect without rushing." },
        ],
      },
      sunday: {
        eyebrow: "Sunday 21",

        title: "Breakfast and farewell",
        warning: "One final morning together before the journeys home.",
        items: [
          { time: "Morning", title: "Breakfast", body: "Breakfast included for guests staying in the guest houses." },
          { time: "Midday", title: "Farewell", body: "Final moments together and departures." },
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
        { time: "Morning", title: "Lake light at dawn", body: "The calm lake mirrors the golden morning light." },
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
      navNext: "See the programme",
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
          type: "food",
          title: "Carnitas",
          body: "Pork cooked slowly until tender and golden, served with tortillas, onion, coriander, salsa, and lime.",
        },
        {
          key: "tejuino",
          type: "drink",
          title: "Tejuino",
          body: "A sweet-and-tangy Guadalajara drink made from fermented corn, served ice-cold with lime and salt. A tequila or mezcal “tejuino loco” will also be available.",
        },
        {
          key: "jericalla",
          type: "dessert",
          title: "Jericalla",
          body: "The most tapatío dessert: a baked custard with cinnamon and vanilla, with its signature golden top.",
        },
        {
          key: "taquiza",
          type: "food",
          title: "Taquiza",
          body: "A spread of Mexican stews, warm tortillas, and toppings so everyone can assemble their own tacos.",
        },
        {
          key: "aguas",
          type: "drink",
          title: "Aguas de sabor",
          body: "Fresh fruit waters (jamaica, horchata, lime) to accompany the meal.",
        },
        {
          key: "gelatinas",
          type: "dessert",
          title: "Mexican jellies",
          body: "Fresh, light fruit jellies to end the meal on a sweet note.",
        },
        {
          key: "nopales",
          type: "food",
          title: "Nopal cactus salad",
          body: "Tender nopal cactus with tomato, onion, herbs, and cheese: a fresh, Mexican, vegetarian option.",
        },
        {
          key: "tequila",
          type: "drink",
          title: "Tequila",
          body: "Tequila to toast and celebrate, served with salt and lime.",
        },
        {
          key: "postres-tapatios",
          type: "dessert",
          title: "Mexican sweets",
          body: "A selection of traditional Mexican sweets to sweeten the end of the meal.",
        },
        {
          key: "guacamole",
          type: "food",
          title: "Guacamole and vegetarian options",
          body: "There will be guacamole, tortillas, salsas, and other meat-free sides. You can share dietary restrictions in the RSVP.",
        },
        {
          key: "pizza",
          type: "food",
          title: "Pizza",
          body: "Pizzas to share on Friday evening: a simple, informal welcome after arrivals and pétanque.",
        },
        {
          key: "esquites",
          type: "food",
          title: "Esquites",
          body: "Tender corn cooked with epazote, chili, lime, and cheese: a Mexican street-food classic.",
        },
      ],

      flavourType: {
        food: "Food",
        drink: "Drink",
        dessert: "Dessert",
      },

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
            "Breakfast included for guests staying in the guest houses.",
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
            "Breakfast included for guests staying in the guest houses.",
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
          note: "The marimba is a wooden keyboard idiophone: bars of hormiguillo struck with mallets that resonate through tubes. Its warm, melodic timbre, a legacy of southeastern Mexico and Guatemala, accompanies the first toast before the carnitas.",
          image: "marimba",
        },

        {
          moment: "After the lighthouse ceremony",
          name: "Mariachi",
          note: "The mariachi is the quintessential traditional Mexican ensemble: violins, trumpets, vihuela, and guitarrón. Its sones and rancheras, with their signature grito, open dinner with a festive entrance.",
          image: "mariachi",
        },
        {
          moment: "After dinner",
          name: "Norteño",
          note: "Norteño is the sound of northern Mexico: accordion and bajo sexto, with polkas, corridos, and cumbias. Its danceable rhythm opens the dance floor and the party.",
          image: "norteno",
        },

        {
          moment: "The unnecessary set?",
          name: "Brass Band",



          note: "38 tonnes, a French brass band blending brass and percussion. Discover them on their website and in their incredible video from Guča, featuring an appearance by the groom and an unforgettable solo.",
          image: "frenchBand",
          logo: "frenchBandLogo",
          website: "https://www.38tonnes.fr/",
          link: "https://www.youtube.com/watch?v=eq_MLyQsdr8",
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
        "Between ceremony and celebration, the whole club is ours: pools, gardens, courts and guest houses to gather, explore, or simply unwind.",

      videoTitle: "Roca Azul presentation video",
      privacyTitle: "Privacy",
      privacyBody:
        "All the guest houses will be rented by guests of the wedding, around 80 to 90 people. In addition, other wedding guests will be staying nearby, perhaps not far away, or will come only for the day: around 60 people according to current estimates. Even so, the club will not be entirely private that weekend: some areas still host tents or trailers. We will share the space and respect the quiet. Music can play until 2 am, after which we will continue in the guest houses.",

      gallery: [
        { key: "pool", title: "Pools", alt: "Pool and gardens at Club Roca Azul" },
        { key: "courts", title: "Sport", alt: "Sports courts at Roca Azul" },
        { key: "gardens", title: "Gardens", alt: "Green spaces at Club Roca Azul" },
        { key: "cabins", title: "Guest houses", alt: "Guest houses and guest rooms at Roca Azul" },
      ],

      gallerySource: "Venue photographs: Club Roca Azul",
      rocaGalleryLabel: "Club Roca Azul photo gallery",
      rocaGalleryAlts: [
        "View of Club Roca Azul",
        "Gardens at Club Roca Azul",
        "Pool at Club Roca Azul",
        "Guest houses at Club Roca Azul",
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
      navNext: "Discover the venue",
      navContinue: "Continue",
      navIdentity: "Is your name spelled correctly?",
    },
    accommodation: {

      eyebrow: "Accommodation",
      title: "Stay close, help us plan ahead",
      citation:
        "We will be at Roca Azul from Thursday. Guests may arrive from around midday on Friday, and Saturday’s main celebration will be an afternoon wedding.",
      body:
        "We have accommodation at the venue for approximately 80 people. As the guest houses and rooms need to be allocated carefully, please let us know as soon as possible if you would like to use this option.",
      facts: [
        { value: "≈ 80–90", label: "places available" },
        {
          value: "≈ MXN 1,200",
          euroValue: "≈ €60",
          label: "per person · 2 nights",
        },
        { value: "2", label: "breakfasts included" },
      ],
      specialNote:
        "Accommodation is available only as a complete two-night package, from Friday 19 to Sunday 21; one-night bookings are not possible. The estimated price is MXN 1,200 per person for both nights and includes both weekend breakfasts.",
      noteTitle: "Good to know",
      noCabinRecommendation:
        "We recommend looking for a hotel or an Airbnb nearby.",
      guestOption: {
        eyebrow: "Your accommodation",
        membersLabel: "Group members",
        linkLabel: "See the option selected for you",
        backLabel: "Back to accommodation",
        onSiteTitle: "A place is planned for you at Roca Azul",
        onSiteBody:
          "This is the option currently recorded for your profile. We will confirm any adjustment directly.",
        onSiteCoveredBody:
          "Your stay is covered by the couple: you won’t have to pay anything.",
        onSitePayBody:
          "Your stay is not covered by the couple: you will pay your share.",
        independentTitle: "Independent accommodation",
        independentBody:
          "We recommend looking for a hotel or an Airbnb nearby.",
        cabinLabel: "Guest house",
        roomLabel: "Room",
        cabinCapacityLabel: "Guest house capacity",
        roomCapacityLabel: "Room capacity",
        cabinPriceLabel: "Guest house price",
        personPriceLabel: "To pay per person",
        groupPriceLabel: "To pay for the group",
        coveredPriceLabel: "Covered by the couple",
        peopleLabel: "people",
        cabinOccupancyLabel: "Guest house arrangement",
        roomOccupancyLabel: "Room arrangement",
        occupancy: { privada: "Private", compartida: "Shared" },
        wholeCabinTitle: "Full guest house occupancy",
        wholeCabinBody: "Every room and the people assigned to it.",
        emptyRoom: "No one assigned",
        youLabel: "You",
        airbnbTitle: "Airbnbs near Roca Azul",
        airbnbBody:
          "These options appeared in the area for February 19–21, 2027. Confirm availability and pricing directly on Airbnb.",
        airbnbAreaPrice: "Starting price currently seen in the area",
        fromPrice: "From · indicative rate",
        perNight: "per night",
        beforeTaxes: "before taxes",
        airbnbGuests: "guests",
        airbnbBedrooms: "bedrooms",
        airbnbBeds: "beds",
        airbnbRating: "Rating",
        airbnbView: "View listing",
        airbnbSearchAll: "View the full Airbnb search",
        hotelTitle: "Hotels near Roca Azul",
        hotelBody:
          "Indicative rates currently observed. Check availability, taxes, and the final price with each hotel for February 19–21, 2027.",
        hotelLocation: "Area",
        hotelView: "View hotel",
        hotelTypes: {
          spaHotel: "Spa hotel",
          boutiqueSpa: "Boutique resort and spa",
          thermalHotel: "Hotel and thermal pools",
        },
        paymentLabel: "Payment",
        payment: {
          covered: "Covered by the couple",
          paid: "Payment recorded",
          pending: "To be confirmed",
        },
        extraCabinLabel: "Additional accommodation",
        planCardTitle: "Your accommodation plan",
        planCardPerPerson: "For {name} · 2 nights",
        planCardSaleLabel: "Covered by the couple",
        planCardGroupTotal: "Group total",
        planCardEurDisclaimer: "Estimated price in MXN",
        planCardEstimate: "The final amount will be confirmed directly.",
      },


      contactPrompt: "More info",


      cabinsShowcase: {
        eyebrow: "Explore the guest houses",
        privateVideoEyebrow: "Private video",
        privateVideoTitle: "A tour of the guest houses",
        key: "azalea",
        title: "Azalea",
        intro:
          "The first guest house in our catalogue: spacious, with generous shared areas and an advertised capacity of 12 guests.",
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
          "Dining room and shared area in the Azalea guest house",
          "Living and dining room in the Azalea guest house",
          "Living room in the Azalea guest house",
          "Bedroom with two double beds in Azalea",
          "Second bedroom with two double beds in Azalea",
          "Bedroom with three single beds in Azalea",
          "Bathroom with shower in the Azalea guest house",
          "Equipped kitchen in the Azalea guest house",
          "Breakfast bar and kitchen in the Azalea guest house",
        ],
        note:
          "We will confirm the final guest allocation directly.",
        additionalUnits: [
          {
            key: "dalia",
            title: "Dalia",
            intro:
              "A bright guest house beside the pool, with three bedrooms and ten clearly identified sleeping places.",
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
              "Dining room in the Dalia guest house beside the pool",
              "Living room in the Dalia guest house",
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
              "A cheerful yellow-toned guest house with three bedrooms, bright shared spaces, and a garden with an outdoor fire pit.",
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
              "Indoor shared area in the Margarita guest house",
              "Bedroom with four single bunk beds in Margarita",
              "Bathroom with shower in Margarita",
              "Bedroom with two double beds in Margarita",
              "Kitchen with breakfast bar in Margarita",
              "Dining room in the Margarita guest house",
              "Bedroom with one double bed in Margarita",
              "Garden and outdoor fire pit at the Margarita guest house",
            ],
            note:
              "The recorded internal cost is MXN 11,150 for both nights; allocation and the final per-person amount will be confirmed directly.",
          },
          {
            key: "wooden",
            title: "Wooden guest houses 31–34",
            intro:
              "Four independent guest houses beneath the trees, ideal for couples or small families looking for a more private space.",
            capacity: "4 guest houses",
            roomsLabel: "2 adults per unit",
            bedsLabel: "Up to 2 minors",
            rooms: [
              "Available units · 31, 32, 33, and 34",
              "Each unit · 1 king-size bed",
              "Each unit · 1 double sofa bed",
            ],
            amenities:
              "The photographs and video show a terrace, refrigerator, washbasin, television, and a fully wood-lined interior.",
            galleryLabel: "Wooden guest houses 31 to 34 gallery",
            photoAlts: [
              "Exterior of a wooden guest house beneath the trees",
              "Entrance to wooden guest house number 34",
              "King-size bed inside a wooden guest house",
              "Sofa bed and interior amenities in a wooden guest house",
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
          "Your response will help us allocate the guest houses fairly and thoughtfully.",
        steps: [
          "Select your accommodation preference in the RSVP.",
          "We will arrange guest houses according to groups, dates, and availability.",
          "We will confirm the allocation, final price, and payment details directly.",
        ],
        button: "Answer the RSVP",
      },
      navNext: "Pétanque",
      recap: {
        eyebrow: "Accommodation confirmation",
        title: "Will you confirm your accommodation?",
        intro:
          "Let us know, for each person, whether they will stay at Roca Azul so we can organise the guest houses.",
        hasCabinQuestion: "Will they stay at Roca Azul?",
        hasCabinQuestionCabin: "OK for {cabin}?",
        noCabinQuestion: "Notify me if a lodging becomes available",
        yesLabel: "Yes",

        noLabel: "No",
        button: "Save my confirmation",
        success: "Confirmation saved. Thank you!",
        error: "We could not save. Please try again.",
        summaryTitle: "Summary of your confirmation",
        summaryIntro:
          "Here is what you indicated for each person. You can change it and save again whenever you like.",
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
          "The times shown are indicative and can vary enormously. Please plan ahead and, even better, arrive early by booking accommodation if you can.",
        venue: "Roca Azul · Jocotepec",
        toVenueLabel: "GO TO ROCA AZUL",
        toBeachLabel: "GO TO THE BEACH",

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
      vuelosImage: "flights_ne6k2g",
      vuelosLabel: "Flight map",
    },
    attire: {

      eyebrow: "Attire",
      title: "Mexican aesthetic and dress code",
      body:
        "We have chosen a Mexican aesthetic for our wedding as a tribute to the culture, the food, the music, and the place that brings us together. We want everything to feel festive, colorful, and deeply Mexican.",
      dressCode: {
        title: "Dress in colour",
        paragraphs: [
          "We are overjoyed to share this day with you, and just as each person has left a special mark on our lives, we want each of you to bring a little of your essence to this celebration.",
          "We believe colours convey energy, joy, and personality. That is why we would love for you to join us wearing vibrant tones, trying to avoid black, grey, and white.",
          "Our wedding will have a Mexican inspiration, with white-toned décor and artisanal details. David will wear a white linen guayabera with golden embroidery, and we will both wear pieces embroidered by artisans from a community in Oaxaca, as a tribute to the richness of our traditions.",
          "The only rule is to be yourselves: elegant, comfortable, and ready to celebrate, dance, and fill this day with colour, love, and good energy.",
          "Thank you for being part of our story! ✨🌼",
        ],
        pictograms: {
          ariaLabel: "Dress code pictograms",
          noWhite: "Avoid white",
          noBlack: "Avoid black",
          noGrey: "Avoid grey",
          colorGreen: "Green",
          colorTeal: "Teal",
          colorMarigold: "Yellow",
          dressNoWhite: "Dress: avoid white",
          dressNoBlack: "Dress: avoid black",
          dressNoGrey: "Dress: avoid grey",
          dressColor: "Colourful dress",
          funky: "Fun prints",
          mexican: "Mexican patterns",
        },
      },

      guestNote:
        "The most important thing is that you feel comfortable and celebrate with us. If you have any questions, write to us.",
      navNext: "Accommodation",

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
            "CLABE: 012 320 01559313382 0",
            "Bank: BBVA",
            "Name: David AILI",
          ],
        },

      },
      cta: "Talk to the couple",
    },
    thanks: {
      eyebrow: "Acknowledgements",
      title: "Thank you",
      subtitle:
        "Without our godparents and helpers, none of this would be possible. We want to thank, with all our gratitude…",

      credits: [
        { name: "Manuel Amuezca", role: "Wedding planner" },
        { name: "Manuel Amuezca", role: "Friday pizzas" },
        { name: "Manuel Amuzeca", role: "Friday pizzas" },
        { name: "Ismael", role: "Pizzas" },
        { name: "Isabel Guadalupe", role: "The couple’s outfits" },
      ],
      humor: [
        "If you would like to appear here, contact our godparent affiliate programme service.",

        "You appear here without knowing it: you have been assigned a task. Too bad, but there is no way to remove it: the page’s IT admin is on holiday, we cannot delete it, so it has to be done.",
        "You helped out and you don’t appear. Too bad. The IT guy may be on holiday, but send your complaints to the couple or the wedding planner.",
      ],
      cta: "Talk to the couple",
      ctaPlanner: "Talk to the wedding planner",
      guestCloud: {
        eyebrow: "Our guests",
        title: "Everyone joining us",
        subtitle:
          "Every name is a shared story. Thank you for being part of this day.",
        navNext: "See the programme",
        modeGroupLabel: "Name mode",
        modeFull: "Full name",
        modeFirst: "First name",
        modeLast: "Last name",
      },

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
            "Rent a guest house for two more nights, from Sunday to Tuesday, to keep spending time together at the venue. If you are interested, let us know in the RSVP and we will arrange a guest house for your group.",
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
      rsvpMini: {
        eyebrow: "And afterwards?",
        title: "Are you in?",
        intro:
          "Tell us how likely you are to join each plan. You can change your answer at any time.",
        questions: [
          {
            id: "rocaAzul",
            title: "Plan 1 · Stay at Roca Azul",
            subtitle: "From Sunday to Tuesday, two more nights at the venue.",
          },
          {
            id: "playa",
            title: "Plan 2 · The beach",
            subtitle: "From Tuesday to Saturday, in Barra de Navidad.",
          },
        ],
        recapTitle: "Summary",
        recapProgress: "answered",
        button: "Save my answers",
        success: "Thank you! We saved your answers.",
        error: "We could not save. Check your connection and try again.",
      },
      suggestions: {
        eyebrow: "Where to stay",
        title: "Suggestions in Barra de Navidad",
        body:
          "If the beach plan interests you, these options appeared in the area for the nights of February 23–28, 2027. Confirm availability and pricing directly.",
        airbnbTitle: "Airbnbs near Barra de Navidad",
        airbnbBody:
          "These options appeared in the area for the nights of February 23–28, 2027. Confirm availability and pricing directly on Airbnb.",
        airbnbAreaPrice: "Starting price currently seen in the area",
        fromPrice: "From · indicative rate",
        perNight: "per night",
        beforeTaxes: "before taxes",
        airbnbGuests: "guests",
        airbnbBedrooms: "bedrooms",
        airbnbBeds: "beds",
        airbnbRating: "Rating",
        airbnbView: "View listing",
        airbnbSearchAll: "View the full Airbnb search",
        hotelTitle: "Hotels in Barra de Navidad",
        hotelBody:
          "Indicative rates currently observed. Check availability, taxes, and the final price with each hotel.",
        hotelLocation: "Area",
        hotelView: "View hotel",
        hotelTypes: {
          budgetHotel: "Budget hotel",
          beachHotel: "Beachfront hotel",
          boutiqueHotel: "Boutique hotel",
        },
      },
      extraStay: {
        eyebrow: "Your stay · Sunday to Tuesday",
        title: "Your guest house for the second stay",
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
          ownBoules: "Do you need us to provide you with some boules?",
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
      progressLabel: "Before sending, complete each section:",
      progressTeAnimas: "Are you in? (Friday, Saturday, Sunday)",
      progressPetanque: "Pétanque tournament",
      progressCoast: "And afterwards? (beach)",
      progressResume: "Completed",
      progressPending: "Pending",
      recap: {
        title: "Summary",
        answered: "answered",
        yes: "Yes",
        no: "No",
      },

      scale: {
        intro:
          "Tell us, day by day, how likely you are to be with us. You can change your answer at any time.",
        saveButton: "Save my answers",
        savedNote: "Thank you! We saved your answers.",
        questions: [
          {
            id: "friday",
            title: "Friday 19 · Will we see you?",
            subtitle: "Arrival and welcome from midday.",
          },
          {
            id: "saturday",
            title: "Saturday 20 · Will we see you?",
            subtitle: "The afternoon wedding: ceremony, dinner, and dancing.",
          },
          {
            id: "sunday",
            title: "Sunday 21 · Will we see you?",
            subtitle: "Breakfast and farewell in the morning.",
          },
        ],
      },
      payment: {
        title: "To pay",
        intro:
          "Here is the breakdown of what you will pay for your accommodation.",
        cabinTitle: "Guest house, Friday to Sunday",
        extraCabinTitle: "Extra guest house, Sunday to Tuesday",
        perPerson: "To pay per person",
        perGroup: "To pay for the group",
        total: "Total",
        asterisk:
          "We appreciate your understanding: we would love to pay for everyone, but it is not possible. This is only an option we planned for you, and we understand if you prefer something else. Just let us know your choice.",
      },

    },
    petanqueTribute: {
      eyebrow: "Pétanque",
      title: "A tribute to pétanque",

      intro:
        "Pétanque has brought us together with a wonderful community of friends and club teammates in Mexico and around the world.",
      body:
        "On Friday afternoon we will organise a pétanque tournament to celebrate this game we love so much. No experience needed: just the desire to play, laugh, and share.",
      homage: "Are you in!",
      photosLabel: "Pétanque photos",

      photoAlts: [
        "Pétanque players at the club",
        "Boules on the pitch",
        "A pétanque throw",
        "The throwing circle",
      ],
      navNext: "To the table",
      rsvpMini: {
        eyebrow: "Pétanque tournament",
        title: "Are you in?",
        intro: "On Friday afternoon we will organise a pétanque tournament. Would you like to join?",
        organizerLabel: "Organised by: David",
        organizerWhatsapp: "https://wa.me/523332017504",
        fields: {
          participation: "Will you participate in the tournament?",
          ownBoules: "Do you need us to provide you with some boules?",
          ownBoulesHint: "If you don’t have any, no worries: we will lend you some to play.",
        },
        yesLabel: "Yes",
        noLabel: "No",
        success: "Thank you! We saved your answers.",
        error: "We could not save. Check your connection and try again.",
        button: "Save my answers",
        recapTitle: "Summary",
      },
    },
    footer: {
      line: "With love, from Mexico and France",



      privacy: "Private invitation · Protected responses",
    },
  },
};

