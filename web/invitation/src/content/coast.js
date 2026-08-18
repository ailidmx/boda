export const coast = {
  es: {
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
      modifyButton: "Modificar mis respuestas",
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
      citation:
        "Hemos previsto una cabaña para ti para la segunda parte de la estancia, del domingo al martes.",
    },
    
  },
  fr: {
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
      modifyButton: "Modifier mes réponses",
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
      eyebrow: "Ton séjour du dimanche au mardi",
      title: "Voici l'option que nous avons prévu pour toi, nous espérons qu'elle te plaira",
      citation:
        "Nous avons prévu une cabane pour toi pour la deuxième partie du séjour, du dimanche au mardi.",
    },
    
  },
  en: {
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
      modifyButton: "Modify my answers",
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
      citation:
        "We have planned a guest house for you for the second part of your stay, from Sunday to Tuesday.",
    },
    
  },
};
