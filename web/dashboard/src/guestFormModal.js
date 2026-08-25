// guestFormModal.js — Shared guest form modal (CREATE + EDIT) with a tab nav
// that mirrors the INVITADOS table's column groups (Identidad / Presencia /
// Pétanque / Playa / Vuelos). The field list and ORDER match the table's
// columnDefs in guestTable.js.
//
// This is a PRESENTATION module: it renders the modal + fields and wires DOM
// events, but NEVER touches Firestore directly. Every write flows through the
// injected save functions (saveGuestInline / saveGuestEmail / saveGuestRsvpAnswer
// / saveGuestHosting / saveGuestFlightInfo / createGuest), which the dashboard
// wires to the repositories + Cloud Functions. The email change uses the SAME
// `updateGuestEmail` Cloud Function path as the table's inline email editor
// (via the injected `saveGuestEmail`).

import { getFunctions, httpsCallable } from "firebase/functions";

const TABS = [
  { id: "identity", label: "Identidad" },
  { id: "presencia", label: "Presencia" },
  { id: "petanque", label: "Pétanque" },
  { id: "playa", label: "Playa" },
  { id: "vuelos", label: "Vuelos" },
];

const GENDER_OPTIONS = [
  { value: "", label: "—" },
  { value: "M", label: "👩 Mujer" },
  { value: "H", label: "👨 Hombre" },
];
const AGE_OPTIONS = [
  { value: "", label: "—" },
  { value: "Adulto", label: "Adulto" },
  { value: "Niño", label: "Niño" },
];
const LANG_OPTIONS = [
  { value: "", label: "—" },
  { value: "es", label: "🇪🇸 Español" },
  { value: "fr", label: "🇫🇷 Français" },
  { value: "en", label: "🇬🇧 English" },
];
// Top-level booleans saved via saveGuestInline ("true"/"false"/"").
const TOP_BOOL_OPTIONS = [
  { value: "", label: "—" },
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];
// RSVP yes/no questions saved via saveGuestRsvpAnswer (1 = Sí, 2 = No).
const RSVP_BOOL_OPTIONS = [
  { value: "", label: "—" },
  { value: "1", label: "Sí" },
  { value: "2", label: "No" },
];
const SCALE_OPTIONS = [0, 1, 2, 3, 4, 5];

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

const optionsHtml = (opts, selected) =>
  opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected) ? "selected" : ""}>${o.label}</option>`).join("");

const scaleOptions = (selected) =>
  SCALE_OPTIONS.map((n) => `<option value="${n}" ${n === selected ? "selected" : ""}>${n === 0 ? "—" : n}</option>`).join("");

const field = (label, control) =>
  `<div class="dashboard-modal-field"><label>${esc(label)}</label>${control}</div>`;

const textInput = (attr, value, placeholder) =>
  `<input type="text" data-f-${attr} value="${esc(value ?? "")}" placeholder="${esc(placeholder || "")}" />`;

const selectInput = (attr, options) =>
  `<select data-f-${attr}>${options}</select>`;

const dateInput = (attr, value) =>
  `<input type="date" data-f-${attr} value="${esc(value || "")}" />`;

const timeInput = (attr, value) =>
  `<input type="time" data-f-${attr} value="${esc(value || "")}" />`;

// ── Cloudinary avatar upload (mirrors the invitation's uploadAvatar) ────
const AVATAR_CLOUD_NAME = "k2ajcgxv";
const AVATAR_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "boda_avatars_unsigned";
const AVATAR_FOLDER = "boda/avatars";

async function uploadAvatarToCloudinary(file) {
  if (!file) throw new Error("No file selected");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large (max 8 MB)");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", AVATAR_UPLOAD_PRESET);
  formData.append("folder", AVATAR_FOLDER);

  const endpoint = `https://api.cloudinary.com/v1_1/${AVATAR_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upload failed (${response.status}) ${text}`);
  }
  const data = await response.json();
  if (!data?.public_id) throw new Error("Upload failed: no public id returned");
  return data.public_id;
}

// Photo / avatar field (edit mode only). Mirrors the table's avatar + edit badge.
function avatarField(guest, ctx) {
  const photo = ctx.guestAvatarUrl?.(guest);
  const initials = ctx.guestInitials?.(guest);
  const cloudinaryId = guest?.identity?.cloudinaryId || guest?.cloudinaryId || "";
  return `
    <div class="dashboard-modal-field">
      <label>Foto de perfil</label>
      <div class="dashboard-avatar-upload">
        <span class="dashboard-avatar-upload-preview" data-avatar-preview>
          ${photo ? `<img src="${esc(photo)}" alt="Foto actual" />` : `<span class="dashboard-avatar-upload-placeholder">${esc(initials)}</span>`}
        </span>
        <div class="dashboard-avatar-upload-controls">
          <label class="dashboard-button dashboard-button-secondary dashboard-avatar-upload-btn" for="gf-avatar-file">📷 Subir foto</label>
          <input id="gf-avatar-file" data-avatar-file type="file" accept="image/*" hidden />
          <small data-avatar-upload-status>Se subirá a Cloudinary (boda/avatars).</small>
        </div>
      </div>
      <input type="text" data-f-cloudinaryId value="${esc(cloudinaryId)}" placeholder="O pega un Cloudinary ID" style="margin-top:0.5rem;" />
    </div>`;
}

function identityTab({ mode, guest, ctx }) {
  const id = guest?.identity || {};
  const parts = [];

  if (mode === "edit") parts.push(avatarField(guest, ctx));

  // Nombre (4 inline fields, matching the table's name editor order).
  parts.push(`
    <div class="dashboard-modal-field">
      <label>Nombre</label>
      <div class="dashboard-modal-name-fields">
        <input type="text" data-f-firstName value="${esc(id.firstName || guest?.firstName || "")}" placeholder="Nombre" />
        <input type="text" data-f-middleName value="${esc(id.middleName || guest?.middleName || "")}" placeholder="2º nombre" />
        <input type="text" data-f-lastName value="${esc(id.lastName || guest?.lastName || "")}" placeholder="Apellido" />
        <input type="text" data-f-maternalLastName value="${esc(id.maternalLastName || guest?.maternalLastName || "")}" placeholder="2º apellido" />
      </div>
    </div>`);

  parts.push(field("Teléfono", textInput("phone", id.phone || guest?.phone || "", "+52 …")));
  parts.push(field(
    "Correo de acceso",
    textInput("email", mode === "edit" ? (ctx.getAuthEmail?.(guest.id) || "") : "", "invitado@correo.com"),
  ));

  if (mode === "edit") {
    const sent = guest?.invitationSent === true ? "true" : "";
    parts.push(field("Enviada", selectInput("invitationSent", optionsHtml(TOP_BOOL_OPTIONS, sent))));
  }

  const invGroups = ctx.getInvitationGroupOptions?.() || [];
  const groups = ctx.getGroupOptions?.() || [];
  parts.push(`
    <div class="dashboard-modal-field">
      <label>Invitación (grupo de invitación)</label>
      <input type="text" data-f-invitationGroup list="gf-inv-groups" value="${esc(guest?.invitationGroup || "")}" placeholder="Ej: Familia López" />
      <datalist id="gf-inv-groups">${invGroups.map((g) => `<option value="${esc(g)}"></option>`).join("")}</datalist>
    </div>`);
  parts.push(`
    <div class="dashboard-modal-field">
      <label>Grupo interno</label>
      <input type="text" data-f-tagGroup list="gf-groups" value="${esc(guest?.group || guest?.tagGroup || "")}" placeholder="Ej: PetanclubGDL" />
      <datalist id="gf-groups">${groups.map((g) => `<option value="${esc(g)}"></option>`).join("")}</datalist>
    </div>`);

  parts.push(field("Idioma", selectInput("lang", optionsHtml(LANG_OPTIONS, id.lang || guest?.lang || ""))));
  parts.push(field("Género", selectInput("gender", optionsHtml(GENDER_OPTIONS, id.gender || guest?.gender || ""))));
  parts.push(field("Edad", selectInput("age", optionsHtml(AGE_OPTIONS, id.age || guest?.age || ""))));
  parts.push(field("Mensaje", textInput("message", guest?.message || id.message || guest?.messageAuthor || "", "Autor del mensaje")));

  if (mode === "edit") {
    parts.push(field("Verificación de identidad", selectInput("idCheckUser", optionsHtml(
      [{ value: "true", label: "Sí" }, { value: "false", label: "No" }],
      guest?.idCheckUser === true ? "true" : "false",
    ))));
  } else {
    parts.push(`
      <div class="dashboard-modal-field">
        <label>ID generado</label>
        <input type="text" data-create-id readonly placeholder="Se genera al escribir el nombre" />
      </div>`);
  }

  return parts.join("");
}

function presenciaTab({ guest, ctx }) {
  const h = guest?.hosting || {};
  const a = guest?.rsvp?.answers || {};
  const cabins = ctx.getCabinNames?.() || [];

  const cabinOptions = (currentDisplay) =>
    [`<option value="">—</option>`, ...cabins.map((n) => `<option value="${esc(n)}" ${n === currentDisplay ? "selected" : ""}>${esc(n)}</option>`)].join("");
  const roomOptions = (cabinDisplay, currentRoom) => {
    const rooms = cabinDisplay ? (ctx.getRoomsByCabin?.(cabinDisplay) || []) : [];
    return [`<option value="">—</option>`, ...rooms.map((r) => `<option value="${esc(r.id)}" ${r.id === currentRoom ? "selected" : ""}>${esc(r.id)}</option>`)].join("");
  };

  const cabinDisplay = h.cabin ? ctx.getCabinDisplayName?.(h.cabin) : "";
  const xtraCabinDisplay = h.xtraCabin ? ctx.getCabinDisplayName?.(h.xtraCabin) : "";

  return [
    field("Viernes", selectInput("friday", scaleOptions(Number(a.friday) || 0))),
    field("Sábado", selectInput("saturday", scaleOptions(Number(a.saturday) || 0))),
    field("Domingo", selectInput("sunday", scaleOptions(Number(a.sunday) || 0))),
    field("Alojamiento", selectInput("accommodationConfirm", optionsHtml(RSVP_BOOL_OPTIONS, a.accommodationConfirm))),
    field("Lista espera", selectInput("cabinWaitingList", optionsHtml(RSVP_BOOL_OPTIONS, a.cabinWaitingList))),
    field("Cabaña", selectInput("cabin", cabinOptions(cabinDisplay))),
    field("Cuarto", selectInput("room", roomOptions(cabinDisplay, h.room))),
    field("Cabaña extra", selectInput("xtraCabin", cabinOptions(xtraCabinDisplay))),
    field("Cuarto extra", selectInput("xtraRoom", roomOptions(xtraCabinDisplay, h.xtraRoom))),
    field("Roca Azul", selectInput("rocaAzul", scaleOptions(Number(a.rocaAzul) || 0))),
    field("Pago", selectInput("paymentConfirmed", optionsHtml(TOP_BOOL_OPTIONS,
      guest?.paymentConfirmed === true ? "true" : guest?.paymentConfirmed === false ? "false" : ""))),
  ].join("");
}

function petanqueTab({ guest }) {
  const a = guest?.rsvp?.answers || {};
  return [
    field("Pétanque", selectInput("petanqueParticipation", optionsHtml(RSVP_BOOL_OPTIONS, a.petanqueParticipation))),
    field("Boules", selectInput("petanqueOwnBoules", optionsHtml(RSVP_BOOL_OPTIONS, a.petanqueOwnBoules))),
  ].join("");
}

function playaTab({ guest }) {
  const a = guest?.rsvp?.answers || {};
  return field("Playa", selectInput("playa", scaleOptions(Number(a.playa) || 0)));
}

function vuelosTab({ guest }) {
  const f = guest?.flightInfo || {};
  const dep = f.departure || {};
  const conn = (list) => (Array.isArray(list) ? list.map((x) => x?.iata || "").filter(Boolean).join(", ") : "");

  return [
    field("Avión", selectInput("travelsByPlane", optionsHtml(TOP_BOOL_OPTIONS,
      guest?.travelsByPlane === true ? "true" : guest?.travelsByPlane === false ? "false" : ""))),
    field("Origen", textInput("originIata", f.origin?.iata || "", "IATA (ej. CDG)")),
    field("Conexiones", textInput("connections", conn(f.connections), "IATA separados por coma")),
    field("Destino", textInput("destinationIata", f.destination?.iata || "", "IATA (ej. GDL)")),
    field("Llegada", dateInput("arrivalDate", f.arrivalDate)),
    field("Hora", timeInput("arrivalTime", f.arrivalTime)),
    field("Nº vuelo", textInput("finalFlightNumber", f.finalFlightNumber, "ej. AM39")),
    field("Origen (vuelta)", textInput("depOriginIata", dep.origin?.iata || "", "IATA")),
    field("Conexiones (vuelta)", textInput("depConnections", conn(dep.connections), "IATA separados por coma")),
    field("Destino (vuelta)", textInput("depDestinationIata", dep.destination?.iata || "", "IATA")),
    field("Vuelta", dateInput("departureDate", dep.departureDate)),
    field("Hora (vuelta)", timeInput("departureTime", dep.departureTime)),
    field("Nº vuelo (vuelta)", textInput("depFlightNumber", dep.finalFlightNumber, "ej. AM38")),
  ].join("");
}

const TAB_RENDERERS = {
  identity: identityTab,
  presencia: presenciaTab,
  petanque: petanqueTab,
  playa: playaTab,
  vuelos: vuelosTab,
};

function openGuestForm({ mode, guest, ctx }) {
  const overlay = document.createElement("div");
  overlay.className = "dashboard-modal-overlay";
  const title = mode === "create" ? "Agregar invitado" : "Editar invitado";

  const panels = TABS.map((t) => {
    if (mode === "create" && t.id !== "identity") {
      return `<section class="gf-panel" data-gf-panel="${t.id}" hidden><p class="gf-empty-tab">Disponible después de crear el invitado.</p></section>`;
    }
    return `<section class="gf-panel" data-gf-panel="${t.id}" ${t.id !== "identity" ? "hidden" : ""}>${TAB_RENDERERS[t.id]({ mode, guest, ctx })}</section>`;
  }).join("");

  overlay.innerHTML = `
    <div class="dashboard-modal gf-modal">
      <div class="dashboard-modal-heading">
        <h3>${esc(title)}</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <div class="gf-tabs" role="tablist">
        ${TABS.map((t) => `<button type="button" role="tab" class="gf-tab ${t.id === "identity" ? "is-active" : ""}" data-gf-tab="${t.id}">${esc(t.label)}</button>`).join("")}
      </div>
      <div class="dashboard-modal-body gf-body">${panels}</div>
      <div class="gf-footer">
        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="button" data-gf-save>${mode === "create" ? "Crear invitado" : "Guardar cambios"}</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-gf-status></small>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => btn.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const status = overlay.querySelector("[data-gf-status]");
  const setStatus = (text, state) => { status.textContent = text; status.dataset.state = state || ""; };

  // ── Tab switching ──
  overlay.querySelectorAll("[data-gf-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      overlay.querySelectorAll("[data-gf-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      overlay.querySelectorAll("[data-gf-panel]").forEach((p) => { p.hidden = p.dataset.gfPanel !== btn.dataset.gfTab; });
    });
  });

  // ── Cabin → room dynamic options (Presencia tab) ──
  const repopulateRooms = (cabinAttr, roomAttr) => {
    const cabinSel = overlay.querySelector(`[data-f-${cabinAttr}]`);
    const roomSel = overlay.querySelector(`[data-f-${roomAttr}]`);
    if (!cabinSel || !roomSel) return;
    const display = cabinSel.value;
    const rooms = display ? (ctx.getRoomsByCabin?.(display) || []) : [];
    roomSel.innerHTML = [`<option value="">—</option>`, ...rooms.map((r) => `<option value="${esc(r.id)}">${esc(r.id)}</option>`)].join("");
  };
  overlay.querySelector("[data-f-cabin]")?.addEventListener("change", () => repopulateRooms("cabin", "room"));
  overlay.querySelector("[data-f-xtraCabin]")?.addEventListener("change", () => repopulateRooms("xtraCabin", "xtraRoom"));

  // ── Avatar upload (edit mode) ──
  const avatarFile = overlay.querySelector("[data-avatar-file]");
  const avatarStatus = overlay.querySelector("[data-avatar-upload-status]");
  avatarFile?.addEventListener("change", async () => {
    const file = avatarFile.files?.[0];
    if (!file) return;
    avatarStatus.textContent = "Subiendo…";
    try {
      const publicId = await uploadAvatarToCloudinary(file);
      overlay.querySelector("[data-f-cloudinaryId]").value = publicId;
      overlay.querySelector("[data-avatar-preview]").innerHTML = `<img src="https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${publicId}" alt="Nueva foto" />`;
      avatarStatus.textContent = `✅ Subida: ${publicId}`;
    } catch (err) {
      console.error("Avatar upload failed", err);
      avatarStatus.textContent = `❌ ${err.message || "Error al subir la foto"}`;
    }
  });

  // ── Create mode: live id preview ──
  if (mode === "create") {
    const idInput = overlay.querySelector("[data-create-id]");
    const refreshId = () => {
      const firstName = overlay.querySelector("[data-f-firstName]").value.trim();
      const lastName = overlay.querySelector("[data-f-lastName]").value.trim();
      const maternalLastName = overlay.querySelector("[data-f-maternalLastName]").value.trim();
      const base = ctx.buildGuestId({ firstName, lastName, maternalLastName });
      const existing = (ctx.getActiveGuests?.() || []).map((g) => g.id);
      idInput.value = base ? ctx.uniqueGuestId(base, existing) : "";
    };
    ["[data-f-firstName]", "[data-f-lastName]", "[data-f-maternalLastName]"].forEach((sel) => {
      overlay.querySelector(sel)?.addEventListener("input", refreshId);
    });
  }

  overlay.querySelector("[data-gf-save]").addEventListener("click", async () => {
    try {
      if (mode === "create") await saveCreate(overlay, ctx, setStatus);
      else await saveEdit(overlay, guest, ctx, setStatus);
      ctx.renderGuestManager?.();
      setStatus("✅ Guardado.", "success");
      setTimeout(close, 900);
    } catch (err) {
      console.error("guest form save failed", err);
      setStatus(`❌ ${err.message || "Error al guardar."}`, "error");
    }
  });
}

async function saveCreate(overlay, ctx, setStatus) {
  const v = (attr) => overlay.querySelector(`[data-f-${attr}]`)?.value ?? "";
  const firstName = v("firstName").trim();
  const lastName = v("lastName").trim();
  if (!firstName || !lastName) throw new Error("El nombre y el apellido son obligatorios.");

  const guestId = overlay.querySelector("[data-create-id]")?.value.trim();
  if (!guestId) throw new Error("No se pudo generar un ID a partir del nombre.");

  const email = v("email").trim();
  const payload = ctx.buildGuestCreatePayload({
    guestId,
    firstName,
    middleName: v("middleName"),
    lastName,
    maternalLastName: v("maternalLastName"),
    gender: v("gender"),
    age: v("age"),
    lang: v("lang"),
    invitationGroup: v("invitationGroup"),
    tagGroup: v("tagGroup"),
    phone: v("phone"),
    cloudinaryId: "",
    timestamp: new Date(),
  });
  await ctx.createGuest(guestId, payload);

  // Provision the Firebase Auth account (uid == guest doc id) when an email was given.
  if (email) {
    const functions = getFunctions();
    const createGuestAuth = httpsCallable(functions, "createGuestAuth");
    await createGuestAuth({ guestId, email });
  }
}

async function saveEdit(overlay, guest, ctx, setStatus) {
  const guestId = guest.id;
  const g = ctx.getGuest?.(guestId) || guest;
  const id = g.identity || {};
  const rsvp = g.rsvp?.answers || {};
  const hosting = g.hosting || {};
  const v = (attr) => overlay.querySelector(`[data-f-${attr}]`)?.value ?? "";
  const changed = (a, b) => String(a ?? "") !== String(b ?? "");

  const textFields = [
    ["firstName", id.firstName || g.firstName || ""],
    ["middleName", id.middleName || g.middleName || ""],
    ["lastName", id.lastName || g.lastName || ""],
    ["maternalLastName", id.maternalLastName || g.maternalLastName || ""],
    ["phone", id.phone || g.phone || ""],
    ["message", g.message || id.message || g.messageAuthor || ""],
    ["invitationGroup", g.invitationGroup || ""],
    ["tagGroup", g.tagGroup || g.group || ""],
    ["cloudinaryId", id.cloudinaryId || g.cloudinaryId || ""],
  ];
  for (const [field, current] of textFields) {
    if (changed(v(field), current)) await ctx.saveGuestInline(guestId, field, v(field).trim());
  }

  for (const [field, current] of [["gender", id.gender || g.gender || ""], ["age", id.age || g.age || ""], ["lang", id.lang || g.lang || ""]]) {
    if (changed(v(field), current)) await ctx.saveGuestInline(guestId, field, v(field));
  }

  const idCheck = v("idCheckUser") === "true";
  if (idCheck !== (g.idCheckUser === true)) await ctx.saveGuestInline(guestId, "idCheckUser", idCheck);

  const invitationSent = v("invitationSent") === "true";
  if (invitationSent !== (g.invitationSent === true)) await ctx.saveGuestInline(guestId, "invitationSent", invitationSent);

  const travelsByPlane = v("travelsByPlane");
  const travelsCurrent = g.travelsByPlane === true ? "true" : g.travelsByPlane === false ? "false" : "";
  if (travelsByPlane !== travelsCurrent) await ctx.saveGuestInline(guestId, "travelsByPlane", travelsByPlane);

  const payment = v("paymentConfirmed");
  const paymentCurrent = g.paymentConfirmed === true ? "true" : g.paymentConfirmed === false ? "false" : "";
  if (payment !== paymentCurrent) await ctx.saveGuestInline(guestId, "paymentConfirmed", payment);

  // Email (auth) — same `updateGuestEmail` Cloud Function path as the table.
  const email = v("email").trim();
  const currentEmail = ctx.getAuthEmail?.(guestId) || "";
  if (email && email !== currentEmail) {
    const ok = await ctx.saveGuestEmail(guestId, email);
    if (!ok) throw new Error("No se pudo actualizar el correo de acceso.");
  }

  for (const key of ["friday", "saturday", "sunday", "playa", "rocaAzul"]) {
    const level = Number(v(key)) || 0;
    if (level !== (Number(rsvp[key]) || 0)) await ctx.saveGuestRsvpAnswer(guestId, key, level);
  }

  for (const key of ["accommodationConfirm", "cabinWaitingList", "petanqueParticipation", "petanqueOwnBoules"]) {
    const level = Number(v(key)) || 0;
    if (level !== (Number(rsvp[key]) || 0)) await ctx.saveGuestRsvpAnswer(guestId, key, level);
  }

  const cabinDisplay = v("cabin");
  const cabinUnit = cabinDisplay ? (ctx.getCabinUnitCode?.(cabinDisplay) || "") : "";
  const room = v("room");
  if (cabinUnit !== (hosting.cabin || "") || room !== (hosting.room || "")) {
    await ctx.saveGuestHosting(guestId, "primary", cabinUnit, room);
  }
  const xtraCabinDisplay = v("xtraCabin");
  const xtraCabinUnit = xtraCabinDisplay ? (ctx.getCabinUnitCode?.(xtraCabinDisplay) || "") : "";
  const xtraRoom = v("xtraRoom");
  if (xtraCabinUnit !== (hosting.xtraCabin || "") || xtraRoom !== (hosting.xtraRoom || "")) {
    await ctx.saveGuestHosting(guestId, "extra", xtraCabinUnit, xtraRoom);
  }

  await ctx.saveGuestFlightInfo?.(guestId, {
    originIata: v("originIata"),
    connections: v("connections"),
    destinationIata: v("destinationIata"),
    arrivalDate: v("arrivalDate"),
    arrivalTime: v("arrivalTime"),
    finalFlightNumber: v("finalFlightNumber"),
    depOriginIata: v("depOriginIata"),
    depConnections: v("depConnections"),
    depDestinationIata: v("depDestinationIata"),
    departureDate: v("departureDate"),
    departureTime: v("departureTime"),
    depFlightNumber: v("depFlightNumber"),
  });
}

export function openCreateGuestModal(ctx) {
  openGuestForm({ mode: "create", guest: null, ctx });
}

export function openGuestEditor(guest, ctx) {
  openGuestForm({ mode: "edit", guest, ctx });
}


