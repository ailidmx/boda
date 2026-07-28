import { TRAVEL_TIMELINE_DATA as data } from "./data.js";

const DAY_MS = 86_400_000;
const app = document.querySelector("#app");
let language = window.localStorage.getItem("travel-timeline-language") || "es";

const copy = {
  es: {
    kicker: "Planeación privada",
    title: "Timeline de viajes",
    intro:
      "Vista por grupos para coordinar vuelos, estancias, recogidas y regresos. Las fechas tentativas se mantienen visibles sin confundirse con reservas confirmadas.",
    groups: "Grupos",
    people: "Personas",
    confirmedAttendance: "Asistencia confirmada",
    datesToConfirm: "Fechas por confirmar",
    weddingWeekend: "Fin de semana de la boda",
    weddingDay: "Boda",
    booked: "Reservado",
    partial: "Parcial",
    tentative: "Tentativo",
    confirmed: "Confirmada",
    origin: "Origen",
    airport: "Llegada",
    coordinator: "Coordinador",
    members: "Integrantes",
    attendance: "Asistencia",
    travel: "Viaje",
    noData: "Pendiente",
    source:
      "Fuente: grupos_viaje.csv + grupo_miembros.csv. Esta vista no debe publicarse.",
  },
  fr: {
    kicker: "Planification privee",
    title: "Calendrier des voyages",
    intro:
      "Vue par groupes pour coordonner vols, sejours, accueils et retours. Les dates provisoires restent visibles sans etre confondues avec des reservations confirmees.",
    groups: "Groupes",
    people: "Personnes",
    confirmedAttendance: "Presence confirmee",
    datesToConfirm: "Dates a confirmer",
    weddingWeekend: "Week-end du mariage",
    weddingDay: "Mariage",
    booked: "Reserve",
    partial: "Partiel",
    tentative: "Provisoire",
    confirmed: "Confirmee",
    origin: "Origine",
    airport: "Arrivee",
    coordinator: "Coordinateur",
    members: "Membres",
    attendance: "Presence",
    travel: "Voyage",
    noData: "A definir",
    source:
      "Source : grupos_viaje.csv + grupo_miembros.csv. Cette vue ne doit pas etre publiee.",
  },
};

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysBetween(start, end) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

function formatDate(value, locale, options = {}) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...options,
  }).format(parseDate(value));
}

function getRange() {
  const starts = data.groups.map((group) => parseDate(group.fecha_llegada));
  const ends = data.groups.map((group) => parseDate(group.fecha_salida));
  starts.push(parseDate(data.weddingWeekendStart));
  ends.push(parseDate(data.weddingWeekendEnd));

  return {
    start: addDays(new Date(Math.min(...starts)), -2),
    end: addDays(new Date(Math.max(...ends)), 2),
  };
}

function positionFor(value, range) {
  const total = daysBetween(range.start, range.end) + 1;
  return (daysBetween(range.start, parseDate(value)) / total) * 100;
}

function widthFor(start, end, range) {
  const total = daysBetween(range.start, range.end) + 1;
  return ((daysBetween(parseDate(start), parseDate(end)) + 1) / total) * 100;
}

function tickMarkup(range, locale) {
  const ticks = [];
  const totalDays = daysBetween(range.start, range.end);

  for (let index = 0; index <= totalDays; index += 1) {
    const date = addDays(range.start, index);
    const day = date.getUTCDate();
    const isWedding =
      date.toISOString().slice(0, 10) === data.weddingDate;
    const showLabel = day === 1 || day % 5 === 0 || isWedding;

    if (!showLabel) continue;

    ticks.push(`
      <span
        class="timeline-tick${isWedding ? " is-wedding" : ""}"
        style="left:${(index / (totalDays + 1)) * 100}%"
      >
        ${new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(date)}
      </span>
    `);
  }

  return ticks.join("");
}

function memberMarkup(group, t) {
  return group.members
    .map(
      (member) => `
        <li>
          <span>${member.nombre}</span>
          <small>${t.travel}: ${t[member.estado_viaje] || t.noData}</small>
        </li>
      `,
    )
    .join("");
}

function groupMarkup(group, range, t, locale) {
  const left = positionFor(group.fecha_llegada, range);
  const width = widthFor(group.fecha_llegada, group.fecha_salida, range);
  const status = t[group.estado_fechas] || group.estado_fechas;

  return `
    <article class="group-row">
      <div class="group-summary">
        <div>
          <span class="group-id">${group.group_id}</span>
          <h2>${group.nombre_grupo}</h2>
        </div>
        <p>
          ${formatDate(group.fecha_llegada, locale)}
          <span aria-hidden="true">→</span>
          ${formatDate(group.fecha_salida, locale)}
        </p>
        <span class="status status-${group.estado_fechas}">${status}</span>
      </div>

      <div class="group-track">
        <div
          class="wedding-band"
          style="
            left:${positionFor(data.weddingWeekendStart, range)}%;
            width:${widthFor(
              data.weddingWeekendStart,
              data.weddingWeekendEnd,
              range,
            )}%;
          "
          aria-label="${t.weddingWeekend}"
        ></div>
        <div
          class="wedding-day"
          style="left:${positionFor(data.weddingDate, range)}%"
          aria-label="${t.weddingDay}"
        ></div>
        <div
          class="travel-bar travel-bar-${group.estado_fechas}"
          style="left:${left}%;width:${width}%"
          title="${group.nombre_grupo}: ${status}"
        >
          <span>${group.total_personas}</span>
        </div>
      </div>

      <details class="group-details">
        <summary>${t.members} · ${group.total_personas}</summary>
        <dl>
          <div><dt>${t.origin}</dt><dd>${group.origen || t.noData}</dd></div>
          <div><dt>${t.airport}</dt><dd>${group.aeropuerto_llegada || t.noData}</dd></div>
          <div><dt>${t.coordinator}</dt><dd>${group.coordinador || t.noData}</dd></div>
          <div><dt>${t.attendance}</dt><dd>${t[group.estado_asistencia] || group.estado_asistencia}</dd></div>
        </dl>
        <ul>${memberMarkup(group, t)}</ul>
        <p>${group.notas}</p>
      </details>
    </article>
  `;
}

function render() {
  const t = copy[language] || copy.es;
  const locale = language === "fr" ? "fr-FR" : "es-MX";
  const range = getRange();
  const totalPeople = data.groups.reduce(
    (total, group) => total + group.total_personas,
    0,
  );
  const tentative = data.groups.filter(
    (group) => group.estado_fechas !== "booked",
  ).length;
  const confirmedAttendance = data.groups
    .filter((group) => group.estado_asistencia === "confirmed")
    .reduce((total, group) => total + group.total_personas, 0);

  document.documentElement.lang = language;
  app.innerHTML = `
    <div class="page">
      <header class="page-header">
        <div>
          <p class="kicker">${t.kicker}</p>
          <h1>${t.title}</h1>
          <p class="intro">${t.intro}</p>
        </div>
        <div class="language-switch" aria-label="Language">
          <button type="button" data-lang="es" aria-pressed="${language === "es"}">ES</button>
          <button type="button" data-lang="fr" aria-pressed="${language === "fr"}">FR</button>
        </div>
      </header>

      <section class="metrics" aria-label="Summary">
        <article><strong>${data.groups.length}</strong><span>${t.groups}</span></article>
        <article><strong>${totalPeople}</strong><span>${t.people}</span></article>
        <article><strong>${confirmedAttendance}</strong><span>${t.confirmedAttendance}</span></article>
        <article><strong>${tentative}</strong><span>${t.datesToConfirm}</span></article>
      </section>

      <section class="legend">
        <span><i class="legend-swatch booked"></i>${t.booked}</span>
        <span><i class="legend-swatch partial"></i>${t.partial}</span>
        <span><i class="legend-swatch tentative"></i>${t.tentative}</span>
        <span><i class="legend-swatch wedding"></i>${t.weddingWeekend}</span>
      </section>

      <section class="timeline-scroll">
        <div class="timeline" style="--label-width:17rem">
          <div class="timeline-axis">
            <div class="axis-spacer"></div>
            <div class="axis-track">${tickMarkup(range, locale)}</div>
          </div>
          ${data.groups
            .map((group) => groupMarkup(group, range, t, locale))
            .join("")}
        </div>
      </section>

      <footer>
        <p>${t.source}</p>
        <small>${data.generatedFrom.join(" · ")}</small>
      </footer>
    </div>
  `;

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      language = button.dataset.lang;
      window.localStorage.setItem("travel-timeline-language", language);
      render();
    });
  });
}

render();
