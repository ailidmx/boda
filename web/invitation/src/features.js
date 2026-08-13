// ─────────────────────────────────────────────────────────────────────────────
//  What's new — user-facing feature list
//  ----------------------------------------------------------------------------
//  This file feeds the "About / À propos" popup in the user menu. It is meant
//  to be kept up to date as we ship new things, and it is written for guests,
//  not developers: plain language, feature-first, no technical jargon.
//
//  To add a feature: append a new object to the top of the array for each
//  language. Each entry has:
//    - icon   : a small emoji shown next to the title
//    - title  : short, catchy feature name
//    - body   : one or two sentences explaining what it does for the guest
//  Newest features go FIRST so they appear at the top of the popup.
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURES = {
  es: [
    {
      icon: "⭐",
      title: "Vota por tus favoritos",
      body: "Califica con estrellas los platillos y los grupos musicales para ayudarnos a armar el menú y la fiesta perfectos.",
    },
    {
      icon: "🎨",
      title: "La música a tu estilo",
      body: "Cambia el aspecto de la sección de música con tres temas visuales: clásico, noche eléctrica o atardecer.",
    },
    {
      icon: "👥",
      title: "Cada invitado, su detalle",
      body: "En la sección de quedarse unos días más, cambia entre los miembros de tu grupo para ver el detalle de cada uno.",
    },
    {
      icon: "✏️",
      title: "Modifica tus respuestas",
      body: "En los mini-RSVP puedes volver atrás y cambiar tus respuestas antes de guardarlas, sin empezar de cero.",
    },
    {
      icon: "📝",
      title: "Tu confirmación, todo en uno",
      body: "Responde todo desde un solo lugar: tu asistencia, si participas en la pétanque y tus planes para quedarte unos días más.",
    },
    {
      icon: "💰",
      title: "Cuánto pagarás, claro",
      body: "Antes de confirmar, mira un resumen de lo que pagarás por persona y por grupo por tu cabaña, con los descuentos aplicados.",
    },
    {
      icon: "✅",
      title: "Guarda todo con un toque",
      body: "Un solo botón guarda todas tus respuestas y te confirma que las recibimos, sin pasos extra.",
    },
    {
      icon: "💛",
      title: "Te hablamos de tú",
      body: "La invitación ahora te habla de forma cercana y personal, como una charla entre amigos.",
    },
    {
      icon: "🎬",
      title: "Créditos de cine",
      body: "La sección de agradecimientos ahora es una película: todos los invitados desfilan en una lista infinita con sus fotos.",
    },
    {
      icon: "🍰",
      title: "Postres en la mesa",
      body: "Descubre los postres que te esperan: jericalla, los más tapatíos de los postres y gelatinas artesanales.",
    },
    {
      icon: "🏖️",
      title: "¿Y después de la boda?",
      body: "Nueva sección con ideas para quedarse unos días más: casas de Airbnb y hoteles cerca de Roca Azul.",
    },
    {
      icon: "🎁",
      title: "Regalos con cariño",
      body: "La sección de regalos ahora tiene un fondo de orbes simbólicos y un mensaje más claro y cálido.",
    },
    {
      icon: "🎵",
      title: "Música para todos",
      body: "Tres playlists para escuchar desde ya, y un reproductor que puedes encender desde tu menú.",
    },
    {
      icon: "🎳",
      title: "Pétanque el viernes",
      body: "Todo lo que necesitas saber para la tarde de pétanque: horarios, equipos y cómo participar.",
    },
    {
      icon: "🪪",
      title: "Tu perfil de invitado",
      body: "Confirma tu nombre, añade tu foto y tu teléfono para que todos te reconozcamos.",
    },
    {
      icon: "🌐",
      title: "En tu idioma",
      body: "Cambia el idioma de la invitación cuando quieras: español, francés o inglés.",
    },
  ],
  fr: [
    {
      icon: "⭐",
      title: "Vote pour tes favoris",
      body: "Note avec des étoiles les plats et les groupes de musique pour nous aider à composer le menu et la fête parfaits.",
    },
    {
      icon: "🎨",
      title: "La musique à ton style",
      body: "Change l'apparence de la section musique avec trois thèmes visuels : classique, nuit électrique ou coucher de soleil.",
    },
    {
      icon: "👥",
      title: "Chaque invité, son détail",
      body: "Dans la section pour rester quelques jours de plus, bascule entre les membres de ton groupe pour voir le détail de chacun.",
    },
    {
      icon: "✏️",
      title: "Modifie tes réponses",
      body: "Dans les mini-RSVP, tu peux revenir en arrière et changer tes réponses avant de les enregistrer, sans tout recommencer.",
    },
    {
      icon: "📝",
      title: "Ta confirmation, tout en un",
      body: "Réponds à tout depuis un seul endroit : ta présence, ta participation à la pétanque et tes envies de rester quelques jours de plus.",
    },
    {
      icon: "💰",
      title: "Combien tu paieras, clair",
      body: "Avant de confirmer, regarde un récapitulatif de ce que tu paieras par personne et par groupe pour ta cabane, remises appliquées.",
    },
    {
      icon: "✅",
      title: "Tout sauvegarder d'un geste",
      body: "Un seul bouton enregistre toutes tes réponses et te confirme que nous les avons bien reçues, sans étapes en plus.",
    },
    {
      icon: "💛",
      title: "On te parle en tutoiement",
      body: "L'invitation s'adresse maintenant à toi de façon chaleureuse et personnelle, comme une conversation entre amis.",
    },
    {
      icon: "🎬",
      title: "Générique de cinéma",
      body: "La section des remerciements est devenue un film : tous les invités défilent dans une liste infinie avec leurs photos.",
    },
    {
      icon: "🍰",
      title: "Desserts à table",
      body: "Découvre les desserts qui t'attendent : jericalla, les plus tapatíos des desserts et gelées artisanales.",
    },
    {
      icon: "🏖️",
      title: "Et après le mariage ?",
      body: "Nouvelle section avec des idées pour rester quelques jours de plus : maisons Airbnb et hôtels près de Roca Azul.",
    },
    {
      icon: "🎁",
      title: "Cadeaux avec amour",
      body: "La section cadeaux a maintenant un fond d'orbes symboliques et un message plus clair et chaleureux.",
    },
    {
      icon: "🎵",
      title: "De la musique pour tous",
      body: "Trois playlists à écouter dès maintenant, et un lecteur que tu peux activer depuis ton menu.",
    },
    {
      icon: "🎳",
      title: "Pétanque le vendredi",
      body: "Tout ce qu'il faut savoir pour l'après-midi pétanque : horaires, équipes et comment participer.",
    },
    {
      icon: "🪪",
      title: "Ton profil invité",
      body: "Confirme ton nom, ajoute ta photo et ton téléphone pour que tout le monde te reconnaisse.",
    },
    {
      icon: "🌐",
      title: "Dans ta langue",
      body: "Change la langue de l'invitation quand tu veux : espagnol, français ou anglais.",
    },
  ],
  en: [
    {
      icon: "⭐",
      title: "Vote for your favorites",
      body: "Rate the dishes and music acts with stars to help us craft the perfect menu and party.",
    },
    {
      icon: "🎨",
      title: "Music, your way",
      body: "Switch the look of the music section with three visual themes: classic, electric night, or sunset.",
    },
    {
      icon: "👥",
      title: "Each guest, their detail",
      body: "In the stay-a-few-more-days section, switch between your group members to see each person's detail.",
    },
    {
      icon: "✏️",
      title: "Edit your answers",
      body: "In the mini-RSVPs you can go back and change your answers before saving, without starting over.",
    },
    {
      icon: "📝",
      title: "Your RSVP, all in one",
      body: "Answer everything from one place: your attendance, whether you'll join the pétanque, and your plans to stay a few more days.",
    },
    {
      icon: "💰",
      title: "Know what you'll pay",
      body: "Before confirming, see a clear summary of what you'll pay per person and per group for your cabin, with discounts applied.",
    },
    {
      icon: "✅",
      title: "Save it all in one tap",
      body: "A single button saves all your answers and confirms we received them, with no extra steps.",
    },
    {
      icon: "💛",
      title: "We talk to you directly",
      body: "The invitation now speaks to you in a warm, personal way, like a chat between friends.",
    },
    {
      icon: "🎬",
      title: "Movie credits",
      body: "The thanks section is now a film: every guest scrolls by in an endless list with their photos.",
    },
    {
      icon: "🍰",
      title: "Desserts at the table",
      body: "Discover the desserts waiting for you: jericalla, the most tapatío of desserts, and artisan jellies.",
    },
    {
      icon: "🏖️",
      title: "After the wedding?",
      body: "New section with ideas to stay a few more days: Airbnb homes and hotels near Roca Azul.",
    },
    {
      icon: "🎁",
      title: "Gifts with love",
      body: "The gifts section now has a symbolic orbs background and a clearer, warmer message.",
    },
    {
      icon: "🎵",
      title: "Music for everyone",
      body: "Three playlists to listen to right away, plus a player you can turn on from your menu.",
    },
    {
      icon: "🎳",
      title: "Pétanque on Friday",
      body: "Everything you need to know for the pétanque afternoon: times, teams, and how to join.",
    },
    {
      icon: "🪪",
      title: "Your guest profile",
      body: "Confirm your name, add your photo and phone number so everyone can recognize you.",
    },
    {
      icon: "🌐",
      title: "In your language",
      body: "Switch the invitation language whenever you like: Spanish, French, or English.",
    },
  ],
};
