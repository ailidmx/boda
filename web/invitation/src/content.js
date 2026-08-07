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
      home: "Inicio",
      you: "Tú",
      story: "Nosotros",

      weekend: "Guarden la fecha",
      programme: "Programa",
      petanque: "Pétanque",
      venue: "El lugar",
      food: "A la mesa",
      accommodation: "Alojamiento",

      travel: "Vengo de lejos",
      coast: "¿Y después?",
      attire: "Vestuario",
      weather: "Clima",
      gift: "Regalos",
      photos: "Fotos",
      thanks: "Gracias",
      guests: "Invitados",
      rsvp: "Confirmar",



      dashboard: "Admin",
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
      emailErrorTitle: "No se pudo cambiar el correo",
      emailDomainError:
        "No pudimos enviar el correo de verificación desde este dominio. Prueba desde la invitación publicada o escríbenos para ayudarte.",

      emailVerificationSent:
        "Te enviamos un correo de verificación al nuevo email. Confírmalo para completar el cambio.",

      emailReauthRequired:
        "Por seguridad, confirma tu contraseña para cambiar el correo.",
      emailReauthLabel: "Contraseña actual",
      emailReauthPlaceholder: "Escribe tu contraseña",
      emailReauthPasswordRequired: "Escribe tu contraseña actual.",

      newPasswordLabel: "Nueva contraseña",
      newPasswordPlaceholder: "Mínimo 6 caracteres",
      currentPasswordLabel: "Contraseña actual",
      currentPasswordPlaceholder: "Escribe tu contraseña actual",
      confirmPasswordLabel: "Confirmar nueva contraseña",
      confirmPasswordPlaceholder: "Repite la nueva contraseña",
      passwordError: "La contraseña debe tener al menos 6 caracteres.",
      passwordMismatch: "Las contraseñas no coinciden.",
      passwordWrongCurrent: "La contraseña actual no es correcta.",
      passwordReauthRequired:
        "Por seguridad, confirma tu contraseña actual para cambiarla.",
      passwordSuccess: "¡Contraseña actualizada!",
      successTitle: "¡Listo!",
      ok: "Aceptar",
      cancel: "Cancelar",
      save: "Guardar",

      working: "Guardando…",
    },


    countdown: {
      prefix: "Casados en",
      years: "años",
      months: "meses",
      days: "días",
      hours: "horas",
      minutes: "min",
      arrived: "Casados desde",
    },



    hero: {
      eyebrow: "Estás invitado a nuestra boda",
      eyebrowM: "Estás invitado a nuestra boda",
      eyebrowF: "Estás invitada a nuestra boda",
      invitation: "Queremos celebrar este momento con ustedes",


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



      addPhoto: "Subir foto",

      changePhoto: "Cambiar foto",
      uploading: "Subiendo…",
      save: "Guardar",
      saving: "Guardando…",
      cancel: "Cancelar",
      saved: "¡Listo! Lo actualizamos.",
      saveError: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.",
      nameRequired: "Escribe al menos tu nombre.",
      photoSaved: "¡Foto guardada! Gracias.",
      photoError: "No pudimos subir la foto. Inténtalo de nuevo.",

      stepLabel: "Paso",
      step1Title: "¿Está bien escrito tu nombre?",
      step2Title: "¿Cuál es tu número de celular?",
      step3Title: "¿Cuál es tu correo electrónico?",
      step2Body:
        "Lo usaremos solo para comunicarnos contigo sobre la boda (confirmaciones, cambios de última hora o coordinación de traslados).",
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
      mapLabel: "Cómo llegar a Roca Azul",
      navNext: "Descubrir el lugar",

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
        "Queremos ver la boda a través de tus ojos. Hemos creado dos álbumes compartidos de Google Photos donde puedes subir tus fotos.",
      beforeTitle: "📸 Antes de la boda",
      beforeBody: "Comparte tus fotos favoritas de nosotros antes del gran día.",
      duringTitle: "🎉 La boda vista por los invitados",
      duringBody:
        "Después de la boda, comparte aquí las fotos que tomaste durante la celebración.",
      upload: "Subir fotos ↗",
      note:
        'Solicita acceso al álbum haciendo clic en "Subir fotos". Una vez dentro, podrás subir todas las fotos que quieras. ¡Gracias por capturar estos momentos con nosotros!',
    },
    weekend: {
      eyebrow: "Guarden la(s) fecha(s)",


      title: "Tres días para celebrar",
      intro:
        "Nosotros estaremos en Roca Azul desde el jueves. Los invitados pueden llegar desde el viernes alrededor del mediodía y la celebración principal será una boda de tarde el sábado.",
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
        eyebrow: "Sábado 20 · programa",
        title: "La tarde, paso a paso",
        warningTitle: "¡Atención al tráfico!",

        citation:
          "Del primer brindis al último baile: una tarde que camina hacia el faro y termina en fiesta.",
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
        eyebrow: "Viernes 19 · programa",
        title: "Llegada y bienvenida",
        citation:
          "Del primer encuentro a la primera pizza: el fin de semana empieza sin prisas.",
        warning:
          "Un primer encuentro relajado para instalarnos, convivir y empezar el fin de semana sin prisas.",
        items: [
          { time: "Desde mediodía", title: "Llegadas y check-in", body: "Bienvenida y tiempo para instalarnos en las cabañas." },
          { time: "Tarde", title: "Petanca y juegos", body: "Juegos al aire libre para romper el hielo." },
          { time: "Noche", title: "Pizzas de bienvenida", body: "Una cena informal para encontrarnos sin prisas." },
        ],
      },
      sunday: {
        eyebrow: "Domingo 21 · programa",
        title: "Desayuno y despedida",
        citation:
          "Una última mañana juntos, entre desayunos y abrazos de despedida.",
        warning: "Una última mañana juntos antes de los regresos.",
        items: [
          { time: "Mañana", title: "Desayuno", body: "Desayuno incluido para quienes se hospedan en las cabañas." },
          { time: "Mediodía", title: "Despedida", body: "Últimos momentos juntos y regresos." },
        ],
      },

    },
    petanqueTribute: {
      eyebrow: 'Pétanque',
      title: 'Un homenaje a la petanca',
      intro:
        'La petanca es un juego de bolas tradicional francés que se juega al aire libre, lanzando bolas metálicas lo más cerca posible de un pequeño objetivo de madera llamado «cochonnet». Nació en el sur de Francia y hoy se juega en todo el mundo.',
      body:
        'Para nosotros, la petanca es mucho más que un juego: es el hilo que nos ha unido a una comunidad increíble de amigos y compañeros de club, aquí en México y en todo el mundo. Gracias a la petanca hemos construido lazos de amistad que nos acompañan a donde vayamos.',
      homage:
        'Como homenaje a este hermoso juego, queremos que nuestros invitados tengan la oportunidad de conocer y jugar con nuestros compañeros de petanca. Una tarde de bolas, risas y buena compañía.',
      photosLabel: 'Nuestros compañeros de petanca',
      photoAlts: [
        'Partida de petanca entre amigos',
        'Bolas de petanca sobre la tierra',
        'Nuestro club de petanca',
        'Un cochonnet y las bolas',
      ],
      navNext: 'Alojamiento',
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
        { time: "8:00–12:00", title: "Mañana fresca y despejada", body: "Cielo limpio y temperatura fresca; ideal para un café al aire libre." },
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
      navNext: "Ver el programa",
    },
    food: {
      eyebrow: "Sabores de Jalisco y México",
      title: "Un fin de semana para probar, brindar y compartir",
      body:
        "Queremos que cada comida sea sencilla, generosa y muy mexicana. Aquí un adelanto de los platillos que podrán degustar.",

      flavoursEyebrow: "Sabores de Jalisco y México",

      flavoursTitle: "¿Qué vamos a probar?",
      flavourType: { food: "Comida", drink: "Bebida" },
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
          key: "taquiza",
          type: "food",
          title: "Taquiza",
          body: "Una mesa con varios guisos mexicanos, tortillas calientes y acompañamientos para que cada quien arme sus propios tacos.",
        },
        {
          key: "aguas",
          type: "drink",
          title: "Aguas de sabores",
          body: "Agua fresca de frutas naturales servida con hielo: una selección refrescante y deliciosa de sabores para acompañar la comida.",
        },
        {
          key: "nopales",
          type: "food",
          title: "Ensalada de nopales",
          body: "Nopal tierno con tomate, cebolla, hierbas y queso: una opción fresca, mexicana y vegetariana.",
        },
        {
          key: "esquites",
          type: "food",
          title: "Esquites",
          body: "Elotes hervidos y preparados al estilo esquites, servidos en vasos con mayonesa, queso, chile y limón.",
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
          key: "tequila",
          type: "drink",
          title: "Tequila",
          body: "Una selección de tequila y mezcal para brindar y acompañar la sobremesa, con sal, limón y naranja.",
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
      listenLabel: "Escuchar",
      websiteLabel: "Sitio web",

      acts: [
        {
          moment: "Después del aperitivo",
          name: "Marimba",
          note: "Para acompañar el primer brindis antes de las carnitas.",
          image: "marimba",
        },

        {
          moment: "Después de la ceremonia en el faro",
          name: "Mariachi",
          note: "Una entrada festiva para abrir la cena.",
          image: "mariachi",
        },
        {
          moment: "Después de la cena",
          name: "Norteño",
          note: "Para abrir la fiesta, cantar y empezar a bailar.",
          image: "norteno",
        },
        {
          moment: "Si se animan",
          name: "38 tonnes",
          note: "Un pequeño puente musical entre nuestras dos culturas.",
          image: "frenchBand",
          logo: "frenchBandLogo",
          link: "https://youtu.be/5ZK7WTeiGwE?si=lOhp2RsyNKOC9M_k",
          website: "https://www.38tonnes.fr/",
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
      navNext: "A la mesa",

      citation:
        "Nosotros estaremos en Roca Azul desde el jueves. Los invitados pueden llegar desde el viernes alrededor del mediodía y la celebración principal será una boda de tarde el sábado.",
      body:
        "Contamos con alojamiento en el lugar para aproximadamente 80 personas, por lo que no podemos ofrecer un lugar a todos los invitados, y tampoco podemos costear el alojamiento de todos. Como necesitamos distribuir las cabañas y las habitaciones con cuidado, les pedimos que nos indiquen cuanto antes si desean aprovechar esta opción.",
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
        "Les recomendamos buscar un hotel o un Airbnb en los alrededores.",
      guestOption: {
        eyebrow: "Tu alojamiento",
        membersLabel: "Miembros del grupo",
        linkLabel: "Consultar la opción prevista para ti",
        backLabel: "Volver al alojamiento",
        onSiteTitle: "¡Un alojamiento está previsto para ti!",
        onSiteBody:
          "Esta es la opción a la que hemos pensado para ti, esperamos que te guste. Si esta opción no te conviene, no hay problema, simplemente háznoslo saber para que podamos reasignarlo a otras personas.",
        onSiteCoveredBody:
          "Estamos felices de invitarte a este alojamiento de forma gratuita.",
        independentTitle:
          "Todos los alojamientos en el lugar ya están reservados. Sin embargo, si alguien se desiste, es posible que se libere un lugar. Mientras tanto, aquí hay algunas sugerencias:",

        independentBody:
          "Les recomendamos buscar un hotel o un Airbnb en los alrededores. Aquí hay algunas sugerencias:",

        cabinLabel: "Cabaña",
        roomLabel: "Habitación",
        cabinCapacityLabel: "Capacidad de la casa",
        roomCapacityLabel: "Capacidad del cuarto",
        cabinPriceLabel: "Precio de la cabaña · 2 días",
        personPriceLabel: "Precio por persona · 2 noches",
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
        button: "Actualizar mi RSVP",
        planCardTitle: "Tu plan",
        planCardPerPerson: "Precio por persona · 2 noches",
        planCardGroupTotal: "Total del grupo",
        planCardCovered: "Cubierto por los novios",
        planCardPartiallyCovered: "Parcialmente cubierto",
        planCardNotCovered: "Por pagar",
        planCardSale: "Precio promocional",
        planCardSaleLabel: "Cubierto por los novios",
        planCardEurDisclaimer: "Tipo de cambio estimado: 1 € = 20 MXN",

        planCardEstimate: "Estimación",
      },



      contactPrompt: "Más info",

      cabinsShowcase: {
        privateVideoEyebrow: "Video privado",
        privateVideoTitle: "Un recorrido por las cabañas",
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
      cta: "Compartir mis datos de viaje",

      ctaNote: "El formulario privado ya está disponible más abajo.",
    },
    attire: {
      eyebrow: "Vestuario",
      title: "Estética mexicana y código de vestimenta",
      body:
        "Nos hace muchísima ilusión compartir este día con ustedes, y queremos que, así como cada persona ha dejado una huella especial en nuestra vida, también cada uno aporte un poco de su esencia a esta celebración.",
      dressCode: {
        title: "Vístete de color",
        paragraphs: [
          "Creemos que los colores transmiten energía, alegría y personalidad.",
          "Por eso, nos encantaría que nos acompañaran vistiendo tonos llenos de vida, procurando evitar el negro, el gris y el blanco.",
          "Nuestra boda tendrá una inspiración mexicana, con una decoración en tonos blancos y detalles artesanales.",
          "David llevará una guayabera de lino blanco con bordados dorados, y ambos vestiremos piezas bordadas por artesanas de una comunidad de Oaxaca, como un homenaje a la riqueza de nuestras tradiciones.",
          "La única regla es que se sientan ustedes mismos: elegantes, cómodos y listos para celebrar, bailar y llenar este día de color, amor y buena energía.",
        ],
        pictograms: {
          ariaLabel: "Pictogramas del código de vestimenta",
          noWhite: "Sin blanco",
          noBlack: "Sin negro",
          noGrey: "Sin gris",
          colorGreen: "Viste de verde",
          colorTeal: "Viste de turquesa",
          colorMarigold: "Viste de amarillo",
          dressNoWhite: "Sin vestido blanco",
          dressNoBlack: "Sin vestido negro",
          dressNoGrey: "Sin vestido gris",
          dressColor: "Vestido de color",
          funky: "Funky",
          mexican: "Patrones mexicanos",
        },
      },
      guestNote:
        "¡Gracias por ser parte de nuestra historia! ✨🌼",
      navNext: "Alojamiento",

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
      navNext: "Gracias",
    },
    thanks: {
      eyebrow: "Agradecimientos",
      title: "Gracias",
      subtitle:
        "Sin nuestros padrinos y ayudantes nada de esto sería posible. Queremos dar su lugar a todos los que ayudaron a que esto sea posible con toda nuestra gratitud a ...",

      credits: [
        { name: "Manuel Amezcua", role: "Wedding planner" },
        { name: "Manuel Amezcua", role: "Pizzas del viernes" },
        { name: "Manuel Amezcua", role: "Pizzas del viernes" },
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
        navNext: "Regalos",
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
        organizerLabel: "Organiza: Pierre",
        organizerWhatsapp: "https://wa.me/523310212012",
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
      home: "Accueil",
      you: "Vous",
      story: "Nous",

      weekend: "Réservez la date",
      programme: "Programme",
      petanque: "Pétanque",
      venue: "Le lieu",
      food: "À table",
      accommodation: "Hébergement",

      travel: "Je viens de loin",
      coast: "Et après ?",
      attire: "Code vestimentaire",
      weather: "Météo",
      gift: "Cadeaux",
      photos: "Photos",
      thanks: "Merci",
      guests: "Invités",
      rsvp: "Répondre",



      dashboard: "Admin",
      changeEmail: "Changer l’adresse e-mail",
      changePassword: "Changer le mot de passe",
      music: "Musique",
      logout: "Se déconnecter",

      emailWarningTitle: "Attention avant de changer l’adresse e-mail",
      emailWarningBody:
        "Votre accès à l’invitation passera par cette nouvelle adresse. Un e-mail de vérification sera envoyé et devra être confirmé.",
      currentEmailLabel: "Adresse actuelle",
      newEmailLabel: "Nouvelle adresse",
      newEmailPlaceholder: "nouveau@email.com",
      emailInvalid: "Saisissez une adresse e-mail valide.",
      emailSuccess: "Adresse e-mail mise à jour.",
      emailUnchanged: "Cette adresse est déjà active sur votre compte.",
      emailError: "Impossible de changer l’adresse e-mail. Réessayez.",
      emailErrorTitle: "Impossible de changer l’adresse e-mail",
      emailDomainError:
        "Impossible d’envoyer l’e-mail de vérification depuis ce domaine. Essayez depuis l’invitation publiée ou écrivez-nous pour obtenir de l’aide.",

      emailVerificationSent:
        "Un e-mail de vérification a été envoyé à la nouvelle adresse. Confirmez-le pour finaliser le changement.",

      emailReauthRequired:
        "Pour des raisons de sécurité, confirmez votre mot de passe pour changer l’adresse e-mail.",
      emailReauthLabel: "Mot de passe actuel",
      emailReauthPlaceholder: "Saisissez votre mot de passe",
      emailReauthPasswordRequired: "Saisissez votre mot de passe actuel.",

      newPasswordLabel: "Nouveau mot de passe",
      newPasswordPlaceholder: "6 caractères minimum",
      currentPasswordLabel: "Mot de passe actuel",
      currentPasswordPlaceholder: "Saisissez votre mot de passe actuel",
      confirmPasswordLabel: "Confirmer le nouveau mot de passe",
      confirmPasswordPlaceholder: "Répétez le nouveau mot de passe",
      passwordError: "Le mot de passe doit contenir au moins 6 caractères.",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      passwordWrongCurrent: "Le mot de passe actuel est incorrect.",
      passwordReauthRequired:
        "Pour des raisons de sécurité, confirmez votre mot de passe actuel pour le changer.",
      passwordSuccess: "Mot de passe mis à jour !",
      successTitle: "C’est fait !",
      ok: "OK",
      cancel: "Annuler",
      save: "Enregistrer",

      working: "Enregistrement…",
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
      eyebrowM: "Tu es invité à notre mariage",
      eyebrowF: "Tu es invitée à notre mariage",
      invitation: "Nous voulons vivre ce moment avec vous",


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
      title: "Votre nom est-il bien écrit ?",
      titleGroup: "Les infos des {count} invités sont-elles correctes ?",
      titleSingle: "Vos infos personelles sont elles correctes ?",

      body:
        "Nous voulons que chaque invité se sente reconnu. Si votre nom ou celui d’un membre de votre groupe est mal orthographié, corrigez-le ici et nous l’utiliserons dans l’invitation et à table.",
      note:
        "Vous pouvez aussi déposer une photo de votre visage si vous le souhaitez, pour le souvenir (un joli portrait de préférence).",

      you: "Vous",
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



      addPhoto: "Déposer une photo",

      changePhoto: "Changer la photo",
      uploading: "Envoi…",
      save: "Enregistrer",
      saving: "Enregistrement…",
      cancel: "Annuler",
      saved: "C’est fait ! Nous l’avons mis à jour.",
      savedWithName: "C'est fait, {name} est à jour.",
      saveError: "Impossible d’enregistrer. Vérifiez votre connexion et réessayez.",
      nameRequired: "Écrivez au moins votre prénom.",
      photoSaved: "Photo enregistrée ! Merci.",
      photoError: "Impossible de déposer la photo. Réessayez.",

      stepLabel: "Étape",
      step1Title: "Votre nom est-il bien écrit ?",
      step2Title: "Quel est votre numéro de portable ?",
      step3Title: "Quelle est votre adresse e-mail ?",
      step2Body:
        "Nous l’utiliserons uniquement pour vous contacter au sujet du mariage (confirmations, changements de dernière minute ou coordination des transferts).",
      step3Body:
        "Nous vous enverrons l’invitation officielle et toute information importante avant le grand jour.",
      contactFor: "Contact de",
      phoneLabel: "Numéro de portable",

      phonePlaceholder: "Ex. 33 12 34 56 78",
      phoneMissing: "Numéro de portable manquant",
      emailLabel: "Adresse e-mail",
      emailPlaceholder: "votrecourriel@exemple.com",
      phoneRequired: "Écrivez votre numéro de portable.",
      emailRequired: "Écrivez votre adresse e-mail.",
      emailInvalid: "Écrivez une adresse e-mail valide.",
      emailVerificationSent: "Un e-mail de vérification a été envoyé à la nouvelle adresse. Confirmez-le pour finaliser le changement.",
      emailUpdateError: "Impossible de mettre à jour l’adresse e-mail. Vérifiez qu’elle est valide et, si un e-mail de vérification est envoyé, confirmez-le d’abord.",
      back: "Retour",
      next: "Continuer",
      finish: "Terminer",
      confirm: "Confirmer",
      ok: "Confirm",
      contactSaved: "C’est fait ! Merci d’avoir confirmé vos coordonnées.",

      whatsappLabel: "Ajoutez-moi au groupe WhatsApp",
      whatsappHint:
        "Rejoignez le groupe pour recevoir les avis, la coordination des transferts et les nouveautés du week-end.",
      whatsappUrl: "https://chat.whatsapp.com/E8LP2oj0sK4GM5Slo1VIFD?s=cl&p=a&ilr=4",
      navStory: "Découvrir l’invitation",
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
      mapLabel: "Comment rejoindre Roca Azul",
      navNext: "Découvrir le lieu",

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
      title: "Partagez vos photos",
      lead:
        "Nous voulons voir le mariage à travers vos yeux. Nous avons créé deux albums Google Photos partagés où vous pouvez déposer vos photos.",
      beforeTitle: "📸 Avant le mariage",
      beforeBody: "Partagez vos photos préférées de nous avant le grand jour.",
      duringTitle: "🎉 Le mariage vu par les invités",
      duringBody:
        "Après le mariage, partagez ici les photos que vous avez prises pendant la célébration.",
      upload: "Déposer des photos ↗",
      note:
        'Demandez l’accès à l’album en cliquant sur « Déposer des photos ». Une fois à l’intérieur, vous pourrez déposer toutes les photos que vous voulez. Merci de capturer ces moments avec nous !',
    },
    weekend: {
      eyebrow: "Réservez la date",

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
        eyebrow: "Samedi 20 · programme",
        title: "L’après-midi, pas à pas",
        warningTitle: "Attention aux bouchons !",

        citation:
          "Du premier toast au dernier pas de danse : un après-midi qui marche vers le phare et finit en fête.",
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
        eyebrow: "Vendredi 19 · programme",
        title: "Arrivée et bienvenue",
        citation:
          "De première boule à la dernière pizza : le week-end commence sans se presser.",

        warning:
          "Un premier moment détendu pour s’installer, se retrouver et commencer le week-end sans se presser.",
        items: [
          { time: "Dès midi", title: "Arrivées et check-in", body: "Accueil et temps pour s’installer dans les gîtes." },
          { time: "Après-midi", title: "Pétanque et jeux", body: "Des jeux en plein air pour briser la glace." },
          { time: "Soir", title: "Pizzas de bienvenue", body: "Un dîner informel pour se retrouver sans se presser." },
        ],
      },
      sunday: {
        eyebrow: "Dimanche 21 · programme",
        title: "Petit-déjeuner et au revoir",
        citation:
          "Une dernière matinée ensemble, entre petits-déjeuners et au revoir.",
        warning: "Une dernière matinée ensemble avant les départs.",
        items: [
          { time: "Matin", title: "Petit-déjeuner", body: "Petit-déjeuner inclus pour les personnes logées dans les gîtes." },
          { time: "Midi", title: "Au revoir", body: "Derniers moments ensemble et départs." },
        ],
      },

    },
    petanqueTribute: {
      eyebrow: 'Pétanque',
      title: 'Un hommage à la pétanque',
      intro:
        "La pétanque est un jeu de boules traditionnel français qui se joue en plein air, en lançant des boules métalliques le plus près possible d'un petit objectif en bois appelé « cochonnet ». Elle est née dans le sud de la France et se joue aujourd'hui dans le monde entier.",
      body:
        "Pour nous, la pétanque est bien plus qu'un jeu : c'est le fil qui nous a reliés à une communauté incroyable d'amis et de camarades de club, ici au Mexique et partout dans le monde. Grâce à la pétanque, nous avons tissé des liens d'amitié qui nous accompagnent partout.",
      homage:
        "En hommage à ce magnifique jeu, nous voulons que nos invités aient l'occasion de rencontrer et de jouer avec nos camarades de pétanque. Un après-midi de boules, de rires et de bonne compagnie.",
      photosLabel: 'Nos camarades de pétanque',
      photoAlts: [
        'Partie de pétanque entre amis',
        'Boules de pétanque sur la terre',
        'Notre club de pétanque',
        'Un cochonnet et les boules',
      ],
      navNext: 'Hébergement',
    },
    weather: {
      eyebrow: "La météo habituelle",
      title: "Soleil l’après-midi, fraîcheur le soir",
      body:
        "Fin février, Jocotepec connaît généralement des journées sèches, lumineuses et douces. Le mariage commencera sous une chaleur agréable, puis la température baissera nettement après le coucher du soleil.",
      facts: [
        { value: "≈ 27 °C", label: "maximale habituelle", note: "Pendant l’après-midi" },
        { value: "≈ 8–10 °C", label: "minimale habituelle", note: "En fin de nuit" },
        { value: "3–5 %", label: "risque de pluie", note: "Pour une journée typique de février" },

        { value: "≈ 18 h 55", label: "coucher du soleil", note: "Presque au même moment que la cérémonie au phare" },
      ],
      moments: [
        { time: "8 h–12 h", title: "Matinée fraîche", body: "Ciel dégagé et fraîcheur matinale." },


        { time: "13 h–17 h 30", title: "Après-midi lumineuse", body: "Soleil et douceur à chaleur." },

        { time: "18 h", title: "Cérémonie", body: "La lumière commencera à baisser pendant la cérémonie au phare." },

        { time: "Dès 19 h", title: "Soirée fraiche", body: "La température peut baisser rapidement au bord du lac." },

      ],
      adviceTitle: "À prévoir",
      advice: [
        "Une veste légère, un pull ou un châle pour le dîner et la danse.",
        "De la crème solaire et des lunettes pour les premières heures.",
        "Des chaussures confortables pour les jardins et les espaces extérieurs.",
      ],
      navNext: "Voir le programme",
    },
    food: {
      eyebrow: "Saveurs de Jalisco et du Mexique",
      title: "Un week-end pour goûter, trinquer et partager",

      body:
        "Nous voulons que chaque repas soit simple, généreux et profondément mexicain. Voici un aperçu des plats que vous pourrez déguster.",

      flavoursEyebrow: "Saveurs de Jalisco et du Mexique",


      flavoursTitle: "Qu’allons-nous goûter ?",
      flavourType: { food: "Plat", drink: "Boisson" },
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
          key: "taquiza",
          type: "food",
          title: "Taquiza",
          body: "Une table de plusieurs plats mijotés mexicains, tortillas chaudes et garnitures pour que chacun compose ses propres tacos.",
        },
        {
          key: "aguas",
          type: "drink",
          title: "Aguas de sabores",
          body: "De l’eau fraîche aux fruits naturels servie avec des glaçons : une sélection rafraîchissante et délicieuse de saveurs pour accompagner le repas.",
        },
        {
          key: "nopales",
          type: "food",
          title: "Salade de nopales",
          body: "Du cactus nopal tendre avec tomate, oignon, herbes et fromage : une option fraîche, mexicaine et végétarienne.",
        },
        {
          key: "esquites",
          type: "food",
          title: "Esquites",
          body: "Des épis de maïs bouillis et préparés façon esquites, servis en verres avec mayonnaise, fromage, piment et citron vert.",
        },
        {
          key: "guacamole",
          type: "food",
          title: "Guacamole et options végétariennes",
          body: "Il y aura du guacamole, des tortillas, des sauces et d’autres accompagnements sans viande. Vous pourrez préciser vos restrictions dans le RSVP.",
        },
        {
          key: "pizza",
          type: "food",
          title: "Pizza",
          body: "Des pizzas à partager le vendredi soir : un accueil simple et informel après les arrivées et la pétanque.",
        },
        {
          key: "tequila",
          type: "drink",
          title: "Tequila",
          body: "Une sélection de tequila et de mezcal pour trinquer et accompagner la fin du repas, avec sel, citron vert et orange.",
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
      drinks: {
        eyebrow: "Pour trinquer",

        title: "Alcool",
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
      listenLabel: "Écouter",
      websiteLabel: "Site web",
      acts: [

        {
          moment: "Après l’apéro",
          name: "Marimba",
          note: "Pour accompagner le premier verre avant les carnitas.",
          image: "marimba",
        },

        {
          moment: "Après la cérémonie au phare",
          name: "Mariachi",
          note: "Une entrée festive pour ouvrir le dîner.",
          image: "mariachi",
        },
        {
          moment: "Après le dîner",
          name: "Norteño",
          note: "Pour ouvrir la fête, chanter et commencer à danser.",
          image: "norteno",
        },
        {
          moment: "S’ils se lancent",
          name: "38 tonnes",
          note: "Un petit pont musical entre nos deux cultures.",
          image: "frenchBand",
          logo: "frenchBandLogo",
          link: "https://youtu.be/5ZK7WTeiGwE?si=lOhp2RsyNKOC9M_k",
          website: "https://www.38tonnes.fr/",
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
      navIdentity: "Votre nom est-il bien écrit ?",
    },
    accommodation: {

      eyebrow: "Hébergement",
      title: "Dormir sur place, nous organiser à temps",
      navNext: "À table",

      citation:
        "La fête commence dès le vendredi ou le samedi dans l’après-midi. Il est conseillé de réserver un logement sur place.",
      body:
        "Nous disposons d’environ 80 places sur le lieu, ce qui ne nous permet pas d’héberger tous nos invités, et nous ne pouvons pas non plus prendre en charge le logement de chacun. Comme les gîtes et les chambres doivent être répartis avec soin, merci de nous indiquer dès que possible l’option d’hébergement que vous aurez choisie.",
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
        "Nous vous recommandons de chercher un hôtel ou un Airbnb dans les environs.",
      guestOption: {
        eyebrow: "Votre hébergement",
        membersLabel: "Membres du groupe",
        linkLabel: "Voir l’option prévue pour vous",
        backLabel: "Retour à l’hébergement",
        onSiteTitle: "Un logement est prévu pour toi !",
        onSiteBody:
          "Voici l’option à laquelle nous avons pensé pour toi, nous espérons qu’elle te plaira. Si cette option ne te convient pas, aucun souci, simplement fais-le nous savoir pour que l’on puisse le réassigner à d’autres personnes.",
        onSiteCoveredBody:
          "Nous sommes heureux de t’inviter dans ce logement gratuitement.",
        independentTitle:
          "Tous les hébergements sur place sont déjà réservés. Cependant, si quelqu’un se désiste il se peut qu’une place se libère. En attendant voici quelques suggestions :",

        independentBody:
          "Nous vous recommandons de chercher un hôtel ou un Airbnb dans les environs. Voici quelques suggestions :",

        cabinLabel: "Gîte",
        roomLabel: "Chambre",
        cabinCapacityLabel: "Capacité du gîte",
        roomCapacityLabel: "Capacité de la chambre",
        cabinPriceLabel: "Prix du gîte · 2 nuits",
        personPriceLabel: "Prix par personne · 2 nuits",
        coveredPriceLabel: "Pris en charge par les mariés",
        peopleLabel: "personnes",
        cabinOccupancyLabel: "Modalité du gîte",
        roomOccupancyLabel: "Modalité de la chambre",
        occupancy: { privada: "Privée", compartida: "Partagée" },
        wholeCabinTitle: "Occupation complète du gîte",
        wholeCabinBody: "Toutes les chambres et les personnes affectées à chacune d’elles.",
        emptyRoom: "Aucune personne affectée",
        youLabel: "Vous",
        airbnbTitle: "Airbnbs près de Roca Azul",
        airbnbBody:
          "Ces options sont apparues dans la zone pour les nuits du 19 au 21 février 2027. Vérifiez la disponibilité et le tarif directement sur Airbnb.",
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
          "Tarifs indicatifs observés actuellement. Vérifiez auprès de chaque hôtel les disponibilités, les taxes et le prix final pour les nuits du 19 au 21 février 2027.",
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
        button: "Mettre à jour mon RSVP",
        planCardTitle: "Votre plan",
        planCardPerPerson: "Prix par personne · 2 nuits",
        planCardGroupTotal: "Total du groupe",
        planCardCovered: "Pris en charge par les mariés",
        planCardPartiallyCovered: "Partiellement pris en charge",
        planCardNotCovered: "À payer",
        planCardSale: "Prix promotionnel",
        planCardSaleLabel: "Pris en charge par les mariés",
        planCardEurDisclaimer: "Taux de change estimé : 1 € = 20 MXN",

        planCardEstimate: "Estimation",
      },



      contactPrompt: "Plus d'infos",

      cabinsShowcase: {
        privateVideoEyebrow: "Vidéo privée",
        privateVideoTitle: "Une visite des gîtes",
      },


      plan: {
        eyebrow: "Comment ça marche ?",
        title: "Dites-nous ce que vous préférez",
        body:
          "Votre réponse nous permettra de répartir les gîtes de façon juste et organisée.",
        steps: [
          "Indiquez votre préférence d’hébergement dans le RSVP.",
          "Nous organiserons les gîtes selon les groupes, les dates et les disponibilités.",
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

      ctaNote: "Le formulaire privé est maintenant disponible plus bas.",
    },
    attire: {
      eyebrow: "Code vestimentaire",
      title: "Esthétique mexicaine",
      body:
        "Nous sommes immensément heureux de partager ce jour avec vous, et nous souhaitons que, tout comme chaque personne a laissé une empreinte spéciale dans notre vie, chacun apporte aussi un peu de son essence à cette célébration.",
      dressCode: {
        title: "Habillez-vous de couleur !",
        paragraphs: [
          "Nous croyons que les couleurs transmettent de l’énergie, de la joie et de la personnalité.",
          "C’est pourquoi nous aimerions que vous nous accompagniez dans des tons pleins de vie, en évitant de préférence le noir, le gris et le blanc.",
          "Notre mariage aura une inspiration mexicaine, avec une décoration en tons blancs et des détails artisanaux.",
          "David portera une guayabera en lin blanc avec des broderies dorées, et nous porterons tous les deux des pièces brodées par des artisanes d’une communauté d’Oaxaca, en hommage à la richesse de nos traditions.",
          "La seule règle est que vous soyez vous-mêmes : élégants, à l’aise et prêts à célébrer, danser et remplir ce jour de couleur, d’amour et de bonne énergie.",
        ],
        pictograms: {
          ariaLabel: "Pictogrammes du code vestimentaire",
          noWhite: "Pas de blanc",
          noBlack: "Pas de noir",
          noGrey: "Pas de gris",
          colorGreen: "Portez du vert",
          colorTeal: "Portez du turquoise",
          colorMarigold: "Portez du jaune",
          dressNoWhite: "Pas de robe blanche",
          dressNoBlack: "Pas de robe noire",
          dressNoGrey: "Pas de robe grise",
          dressColor: "Robe colorée",
          funky: "Funky",
          mexican: "Motifs mexicains",
        },
      },
      guestNote:
        "Merci de faire partie de notre histoire ! ✨🌼",
      navNext: "Hébergement",

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
      navNext: "Merci",
    },
    thanks: {
      eyebrow: "Remerciements",
      title: "Merci",
      subtitle:
        "Sans nos padrinos et nos aides, rien de tout cela ne serait possible. Nous tenons à remercier avec toute notre gratitude…",
      credits: [
        { name: "Manuel Amezcua", role: "Wedding planner" },
        { name: "Manuel Amezcua", role: "Pizzas du vendredi" },
        { name: "Manuel Amezcua", role: "Pizzas du vendredi" },
        { name: "Ismael", role: "Pizzas" },
        { name: "Isabel Guadalupe", role: "Tenues des mariés" },
      ],
      humor: [
        "Si vous voulez apparaître ici, contactez notre programme d’affiliation au programme de padrino.",
        "Vous apparaissez ici sans le savoir : une mission vous a été confiée. Dommage, mais il est impossible de l’effacer : l’admin IT de la page est en vacances, on ne peut pas le supprimer, donc il faut s’y tenir.",
        "Vous avez apporté votre aide et vous n’apparaissez pas. Dommage. L’IT est peut-être en vacances, mais envoyez vos réclamations aux mariés ou au wedding planner.",
      ],
      cta: "Contacter les mariés",
      ctaPlanner: "Wedding planner",
      guestCloud: {
        eyebrow: "Nos invités",
        title: "Tous ceux qui nous accompagnent",
        subtitle:
          "Chaque nom est une histoire partagée. Merci de faire partie de ce jour.",
        navNext: "Cadeaux",
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
            "Louer un gîte deux nuits de plus, du dimanche au mardi, pour continuer à se retrouver sur place. Si cela vous intéresse, indiquez-le dans le RSVP et nous organiserons le gîte pour votre groupe.",
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
        organizerLabel: "Organise : Pierre",
        organizerWhatsapp: "https://wa.me/523310212012",
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
      home: "Home",
      you: "You",
      story: "Us",

      weekend: "Save the date",
      programme: "Programme",
      petanque: "Pétanque",
      venue: "The venue",
      food: "At the table",
      accommodation: "Accommodation",

      travel: "Coming from afar",
      coast: "And afterwards?",
      attire: "Attire",
      weather: "Weather",
      gift: "Gifts",
      photos: "Photos",
      thanks: "Thanks",
      guests: "Guests",
      rsvp: "RSVP",



      dashboard: "Admin",
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
      emailErrorTitle: "Could not change the email",
      emailDomainError:
        "We could not send the verification email from this domain. Try from the published invitation or message us for help.",

      emailVerificationSent:
        "We sent a verification email to the new address. Confirm it to complete the change.",

      emailReauthRequired:
        "For security, confirm your password before changing the email.",
      emailReauthLabel: "Current password",
      emailReauthPlaceholder: "Enter your password",
      emailReauthPasswordRequired: "Enter your current password.",

      newPasswordLabel: "New password",
      newPasswordPlaceholder: "At least 6 characters",
      currentPasswordLabel: "Current password",
      currentPasswordPlaceholder: "Enter your current password",
      confirmPasswordLabel: "Confirm new password",
      confirmPasswordPlaceholder: "Repeat the new password",
      passwordError: "The password must be at least 6 characters.",
      passwordMismatch: "The passwords do not match.",
      passwordWrongCurrent: "The current password is incorrect.",
      passwordReauthRequired:
        "For security, confirm your current password to change it.",
      passwordSuccess: "Password updated!",
      successTitle: "Done!",
      ok: "OK",
      cancel: "Cancel",
      save: "Save",

      working: "Saving…",
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

      addPhoto: "Upload photo",



      changePhoto: "Change photo",
      uploading: "Uploading…",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      saved: "Done! We updated it.",
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
      mapLabel: "Getting to Roca Azul",
      navNext: "Discover the venue",

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
      upload: "Upload photos ↗",
      note:
        'Request access to the album by clicking “Upload photos”. Once inside, you can upload as many photos as you like. Thank you for capturing these moments with us!',
    },
    weekend: {
      eyebrow: "Save the date",

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
        eyebrow: "Saturday 20 · programme",
        title: "The afternoon, step by step",
        warningTitle: "Traffic alert!",
        citation:

          "From the first toast to the last dance: an afternoon that walks toward the lighthouse and ends in celebration.",
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
        eyebrow: "Friday 19 · programme",
        title: "Arrival and welcome",
        citation:
          "From the first hello to the first pizza: the weekend begins without rushing.",
        warning:
          "A relaxed first gathering to settle in, connect, and ease into the weekend.",
        items: [
          { time: "From midday", title: "Arrivals and check-in", body: "Welcome and time to settle into the guest houses." },
          { time: "Afternoon", title: "Pétanque and games", body: "Outdoor games to break the ice." },
          { time: "Evening", title: "Welcome pizzas", body: "An informal dinner to reconnect without rushing." },
        ],
      },
      sunday: {
        eyebrow: "Sunday 21 · programme",
        title: "Breakfast and farewell",
        citation:
          "One last morning together, between breakfasts and goodbyes.",
        warning: "One final morning together before the journeys home.",
        items: [
          { time: "Morning", title: "Breakfast", body: "Breakfast included for guests staying in the guest houses." },
          { time: "Midday", title: "Farewell", body: "Final moments together and departures." },
        ],
      },

    },
    petanqueTribute: {
      eyebrow: 'Pétanque',
      title: 'A tribute to pétanque',
      intro:
        'Pétanque is a traditional French ball game played outdoors, tossing metal balls as close as possible to a small wooden target called the « cochonnet ». It was born in the south of France and is now played all over the world.',
      body:
        'For us, pétanque is much more than a game: it is the thread that has connected us to an incredible community of friends and clubmates, here in Mexico and around the world. Thanks to pétanque we have built friendships that travel with us wherever we go.',
      homage:
        'As a tribute to this beautiful game, we want our guests to have the chance to meet and play with our pétanque mates. An afternoon of boules, laughter and good company.',
      photosLabel: 'Our pétanque mates',
      photoAlts: [
        'A pétanque game among friends',
        'Pétanque balls on the ground',
        'Our pétanque club',
        'A cochonnet and the balls',
      ],
      navNext: 'Accommodation',
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
        { time: "8–12 am", title: "A crisp, clear morning", body: "Clear skies and a cool start; perfect for coffee outdoors." },
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
      navNext: "See the programme",
    },
    food: {
      eyebrow: "Flavours of Jalisco and Mexico",
      title: "A weekend to taste, toast, and share",
      body:
        "We want every meal to feel simple, generous, and unmistakably Mexican. Here's a preview of the dishes you'll be able to taste.",

      flavoursEyebrow: "Flavours of Jalisco and Mexico",

      flavoursTitle: "What will we be tasting?",
      flavourType: { food: "Food", drink: "Drink" },
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
          key: "taquiza",
          type: "food",
          title: "Taquiza",
          body: "A spread of Mexican stews, warm tortillas, and toppings so everyone can assemble their own tacos.",
        },
        {
          key: "aguas",
          type: "drink",
          title: "Aguas de sabores",
          body: "Fresh fruit water served over ice: a delicious, refreshing set of natural fruit flavours to accompany the meal.",
        },
        {
          key: "nopales",
          type: "food",
          title: "Nopal cactus salad",
          body: "Tender nopal cactus with tomato, onion, herbs, and cheese: a fresh, Mexican, vegetarian option.",
        },
        {
          key: "esquites",
          type: "food",
          title: "Esquites",
          body: "Boiled corn prepared esquites-style, served in cups with mayonnaise, cheese, chilli, and lime.",
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
          key: "tequila",
          type: "drink",
          title: "Tequila",
          body: "A selection of tequila and mezcal to toast and accompany the end of the meal, with salt, lime, and orange.",
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
      listenLabel: "Listen",
      websiteLabel: "Website",
      acts: [

        {
          moment: "After the aperitif",
          name: "Marimba",
          note: "For the first toast before the carnitas.",
          image: "marimba",
        },

        {
          moment: "After the lighthouse ceremony",
          name: "Mariachi",
          note: "A festive opening to dinner.",
          image: "mariachi",
        },
        {
          moment: "After dinner",
          name: "Norteño",
          note: "To open the party, sing, and start dancing.",
          image: "norteno",
        },
        {
          moment: "If they are up for it",
          name: "38 tonnes",
          note: "A small musical bridge between our two cultures.",
          image: "frenchBand",
          logo: "frenchBandLogo",
          link: "https://youtu.be/5ZK7WTeiGwE?si=lOhp2RsyNKOC9M_k",
          website: "https://www.38tonnes.fr/",
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
      navNext: "At the table",
      citation:

        "We will be at Roca Azul from Thursday. Guests may arrive from around midday on Friday, and Saturday’s main celebration will be an afternoon wedding.",
      body:
        "We have accommodation at the venue for approximately 80 people, so we can't offer a place to every guest, and we can't afford to cover everyone's lodging. As the guest houses and rooms need to be allocated carefully, please let us know as soon as possible if you would like to use this option.",
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
        onSiteTitle: "Accommodation is planned for you!",
        onSiteBody:
          "This is the option we thought of for you, we hope you like it. If this option doesn't suit you, no worries, just let us know so we can reassign it to other people.",
        onSiteCoveredBody:
          "We are happy to invite you to this accommodation for free.",
        independentTitle:
          "All on-site accommodation is already booked. However, if someone cancels, a spot may become available. In the meantime, here are some suggestions:",

        independentBody:
          "We recommend looking for a hotel or an Airbnb nearby. Here are some suggestions:",

        cabinLabel: "Guest house",
        roomLabel: "Room",
        cabinCapacityLabel: "Guest house capacity",
        roomCapacityLabel: "Room capacity",
        cabinPriceLabel: "Guest house price · 2 nights",
        personPriceLabel: "Price per person · 2 nights",
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
        button: "Update my RSVP",
        planCardTitle: "Your plan",
        planCardPerPerson: "Price per person · 2 nights",
        planCardGroupTotal: "Group total",
        planCardCovered: "Covered by the couple",
        planCardPartiallyCovered: "Partially covered",
        planCardNotCovered: "To pay",
        planCardSale: "Promotional price",
        planCardSaleLabel: "Covered by the couple",
        planCardEurDisclaimer: "Estimated exchange rate: 1 € = 20 MXN",

        planCardEstimate: "Estimate",
      },



      contactPrompt: "More info",

      cabinsShowcase: {
        privateVideoEyebrow: "Private video",
        privateVideoTitle: "A tour of the guest houses",
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

      ctaNote: "The private form is now available below.",
    },
    attire: {
      eyebrow: "Attire",
      title: "Mexican aesthetic and dress code",
      body:
        "We are overjoyed to share this day with you, and just as every person has left a special mark on our lives, we would love each of you to bring a little of your own essence to this celebration.",
      dressCode: {
        title: "Dress in colour",
        paragraphs: [
          "We believe colours convey energy, joy, and personality.",
          "That is why we would love you to join us wearing vibrant tones, ideally avoiding black, grey, and white.",
          "Our wedding will have a Mexican inspiration, with white-toned décor and artisanal details.",
          "David will wear a white linen guayabera with golden embroidery, and we will both wear pieces embroidered by artisans from a community in Oaxaca, as a tribute to the richness of our traditions.",
          "The only rule is that you be yourselves: elegant, comfortable, and ready to celebrate, dance, and fill this day with colour, love, and good energy.",
        ],
        pictograms: {
          ariaLabel: "Dress code pictograms",
          noWhite: "No white",
          noBlack: "No black",
          noGrey: "No grey",
          colorGreen: "Wear green",
          colorTeal: "Wear teal",
          colorMarigold: "Wear marigold",
          dressNoWhite: "No white dress",
          dressNoBlack: "No black dress",
          dressNoGrey: "No grey dress",
          dressColor: "Colourful dress",
          funky: "Funky",
          mexican: "Mexican patterns",
        },
      },
      guestNote:
        "Thank you for being part of our story! ✨🌼",
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
            "Cuenta Clave: 012 320 01559313382 0",
            "Bank: BBVA",
            "Name: David AILI",
          ],
        },
      },
      cta: "Talk to the couple",
      navNext: "Thanks",
    },
    thanks: {
      eyebrow: "Acknowledgements",
      title: "Thank you",
      subtitle:
        "Without our padrinos and helpers, none of this would be possible. We want to thank, with all our gratitude…",
      credits: [
        { name: "Manuel Amezcua", role: "Wedding planner" },
        { name: "Manuel Amezcua", role: "Friday pizzas" },
        { name: "Manuel Amezcua", role: "Friday pizzas" },
        { name: "Ismael", role: "Pizzas" },
        { name: "Isabel Guadalupe", role: "The couple’s outfits" },
      ],
      humor: [
        "If you would like to appear here, contact our padrino affiliate programme service.",
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
        navNext: "Gifts",
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
        organizerLabel: "Organised by: Pierre",
        organizerWhatsapp: "https://wa.me/523310212012",
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
