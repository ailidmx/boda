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
      icon: "🎬",
      title: "Générique de cinéma",
      body: "La section des remerciements est devenue un film : tous les invités défilent dans une liste infinie avec leurs photos.",
    },
    {
      icon: "🍰",
      title: "Desserts à table",
      body: "Découvrez les desserts qui vous attendent : jericalla, les plus tapatíos des desserts et gelées artisanales.",
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
      body: "Trois playlists à écouter dès maintenant, et un lecteur que vous pouvez activer depuis votre menu.",
    },
    {
      icon: "🎳",
      title: "Pétanque le vendredi",
      body: "Tout ce qu'il faut savoir pour l'après-midi pétanque : horaires, équipes et comment participer.",
    },
    {
      icon: "🪪",
      title: "Votre profil invité",
      body: "Confirmez votre nom, ajoutez votre photo et votre téléphone pour que tout le monde vous reconnaisse.",
    },
    {
      icon: "🌐",
      title: "Dans votre langue",
      body: "Changez la langue de l'invitation quand vous voulez : espagnol, français ou anglais.",
    },
  ],
  en: [
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
