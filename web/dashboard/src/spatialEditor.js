// ─────────────────────────────────────────────────────────────────────────
// spatialEditor.js — the wedding spatial layout & seating editor (vanilla).
//
// This module is a PRESENTATION/controller layer:
//   - renders an SVG canvas (real meters, pan/zoom, adaptive grid)
//   - selection / drag / rotate / group / guest-assignment
//   - delegates ALL geometry + domain rules to `spatial/*` (pure)
//   - persists ONLY via `planRepository` (autosave on semantic commit)
//
// It never touches Firestore directly and never computes geometry inline.
// ─────────────────────────────────────────────────────────────────────────

import {
  createPlan,
  reducePlan,
  computeDragCandidate,
  validatePlacement,
  findDefinition,
  instanceFootprint,
  findFreePosition,
} from "./spatial/editor-state.js";

import {
  SYSTEM_DEFINITIONS,
  PROVIDER_DEFINITIONS,
  isSystemDefinition,
  normalizeDefinition,
  canDeleteDefinition,
  canEditDefinition,
  definitionSeatCount,
  definitionUsageCount,
} from "./spatial/catalog.js";

import { seatAnchorsForDefinition } from "./spatial/seating.js";
import { blockedSeatIds } from "./spatial/connections.js";
import { computeSeatingIntegrity } from "./spatial/integrity.js";
import { snapToGrid, normalizeDims, getFootprintBounds } from "./spatial/geometry.js";
import { createHistory } from "./spatial/history.js";
import { screenToWorld, gridSteps, zoomAt, panByScreen, clampZoom, EDITOR_DEFAULTS } from "./spatial/viewport.js";

import { savePlan, loadPlan } from "./repositories/planRepository.js";
import { loadCatalogDefinitions, saveCatalogDefinition } from "./repositories/catalogRepository.js";
import { getActiveGuests, getGuest } from "./guests.js";

// ── Module state (transient editor state + authoritative plan) ──────────
let container = null;
let svg = null;
let plan = createPlan();
let history = createHistory();
let camera = { panX: 0, panY: 0, pxPerMeter: EDITOR_DEFAULTS.defaultPxPerMeter };
let selection = new Set();
let drag = null; // { mode:"pan"|"object", startWorld, movedIds, startTransform, ghostEl, active, pinch? }
let saveState = "idle"; // idle | saving | saved | error
let initialized = false;
let pendingGuest = null; // pre-selected guest (assign to next tapped seat)
let showGrid = true; // grid visibility toggle
let guestDrag = null; // in-flight guest drag { guestId, fromInstanceId, fromSeatId }
let showOnlyUnassigned = false; // guest filter: only unassigned
let showOnlySat5 = false; // guest filter: only SAT level 5
let showOnlyChildren = false; // guest filter: only children (age "Niño")
let planLoaded = false; // true once the authoritative plan is in memory (guards writes)
let reorderDragId = null; // in-flight sidebar reorder drag (instance id)

// ── Debug logging ────────────────────────────────────────────────────────
function log(...args) {
  console.log("[spatialEditor]", ...args);
}

// Compact view of the persisted seating state: instanceId → occupied seat count.
function summarizeAssignments() {
  const out = {};
  for (const [iid, seats] of Object.entries(plan.guestAssignments || {})) {
    out[iid] = Object.keys(seats).length;
  }
  return out;
}

// ── Guest helpers ────────────────────────────────────────────────────────
function guestFullName(guest) {
  if (!guest) return "—";
  const i = guest.identity || {};
  return [i.firstName || guest.firstName, i.middleName || guest.middleName, i.lastName || guest.lastName, i.maternalLastName || guest.maternalLastName]
    .filter(Boolean).join(" ") || guest.id || "—";
}
function guestAvatarUrl(guest) {
  const id = guest?.identity?.cloudinaryId || guest?.cloudinaryId;
  return id ? `https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${id}` : "";
}
function guestInitials(guest) {
  const n = guestFullName(guest);
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts[parts.length - 1]?.[0] || "";
  return (first + last).toUpperCase() || "•";
}
function resolveGuestName(guestId) {
  return guestFullName(getGuest(guestId));
}

// Saturday RSVP scale level (0-5). Unknown/missing → 0.
function saturdayLevel(guest) {
  const lvl = guest?.rsvp?.answers?.saturday;
  if (lvl === undefined || lvl === null || lvl === "" || lvl === 0) return 0;
  const n = Number(lvl);
  return Number.isFinite(n) ? n : 0;
}

function isChildGuest(guest) {
  const age = String(guest?.identity?.age ?? guest?.age ?? "").trim();
  return age === "Niño";
}

function saturdayBadge(guest) {
  const lvl = saturdayLevel(guest);
  return `<span class="se-sat-badge se-sat-${lvl}" title="Sábado RSVP nivel ${lvl}">S${lvl || "—"}</span>`;
}

// Color for the small Saturday-RSVP status dot shown on a canvas avatar.
function saturdayDotColor(level) {
  if (level >= 4) return "#2e7d32"; // confirmed (S4/S5) → green
  if (level >= 1) return "#ed6c02"; // partial (S1..S3) → amber
  return "#9e9e9e"; // no answer → gray
}

// ── Rendering ────────────────────────────────────────────────────────────

function svgSize() {
  const rect = svg.getBoundingClientRect();
  return { w: rect.width || 800, h: rect.height || 600 };
}

function visibleViewBox() {
  const { w, h } = svgSize();
  return { minX: camera.panX, minY: camera.panY, w: w / camera.pxPerMeter, h: h / camera.pxPerMeter };
}

function gridLines() {
  const vb = visibleViewBox();
  const { major, minor } = gridSteps(camera.pxPerMeter);
  const lines = [];
  const x0 = Math.floor(vb.minX / minor) * minor;
  const x1 = vb.minX + vb.w;
  const y0 = Math.floor(vb.minY / minor) * minor;
  const y1 = vb.minY + vb.h;

  for (let x = x0; x <= x1 + 1e-9; x += minor) {
    const isMajor = Math.abs(x / major - Math.round(x / major)) < 1e-6;
    lines.push(`<line x1="${x}" y1="${vb.minY}" x2="${x}" y2="${vb.minY + vb.h}" class="se-grid ${isMajor ? "is-major" : ""}"/>`);
  }
  for (let y = y0; y <= y1 + 1e-9; y += minor) {
    const isMajor = Math.abs(y / major - Math.round(y / major)) < 1e-6;
    lines.push(`<line x1="${vb.minX}" y1="${y}" x2="${vb.minX + vb.w}" y2="${y}" class="se-grid ${isMajor ? "is-major" : ""}"/>`);
  }
  return lines.join("");
}

function zoneMarkup(zone) {
  const selected = selection.has(zone.id);
  return `
    <g class="se-zone ${selected ? "is-selected" : ""}" data-zone-id="${zone.id}" transform="translate(${zone.x} ${zone.y})">
      <rect width="${zone.width}" height="${zone.height}" class="se-zone-body"/>
    </g>`;
}

function instanceDef(inst) {
  return findDefinition(plan, inst.definitionId);
}

function instanceSeats(inst) {
  const def = instanceDef(inst);
  if (!def) return { def: null, anchors: [], blocked: new Set(), seatCount: 0 };
  const norm = normalizeDefinition(def);
  const seatCount = definitionSeatCount(norm);
  const anchors = seatAnchorsForDefinition(norm, seatCount);
  const blocked = blockedSeatIds(anchors, plan.connections, inst.id);
  return { def: norm, anchors, blocked, seatCount };
}

// Per-definition visual style → SVG CSS custom properties (read by `.se-object-body`).
function objectStyleVars(def) {
  return `--se-fill:${def.fillColor};--se-stroke:${def.strokeColor};--se-stroke-width:${def.strokeWidth};--se-opacity:${def.opacity}`;
}

// SVG paint order: lower zIndex first (behind), higher last (on top). A toldo
// (zIndex 20) therefore renders OVER the tables placed beneath it.
function zIndexOf(inst) {
  const def = instanceDef(inst);
  return def ? (normalizeDefinition(def).zIndex ?? 10) : 10;
}

function guestAt(instanceId, seatId) {
  const gid = plan.guestAssignments?.[instanceId]?.[seatId];
  return gid ? getGuest(gid) : null;
}

function instanceMarkup(inst) {
  const { def, anchors, blocked } = instanceSeats(inst);
  if (!def) return "";
  const dims = normalizeDims(def);
  const cx = inst.transform.x;
  const cy = inst.transform.y;
  const rotation = inst.transform.rotation || 0;
  const isSelected = selection.has(inst.id);
  const group = plan.groups.find((g) => g.objectIds.includes(inst.id));
  // 1-based position in the "Objetos reales" list (Novios = 1).
  const position = plan.instances.findIndex((i) => i.id === inst.id) + 1;

  const style = objectStyleVars(def);
  let shapeHtml = "";
  if (dims.shape === "circle") {
    shapeHtml = `<circle r="${dims.radius}" class="se-object-body" style="${style}"/>`;
  } else {
    shapeHtml = `<rect x="${-dims.width / 2}" y="${-dims.height / 2}" width="${dims.width}" height="${dims.height}" class="se-object-body" style="${style}"/>`;
  }
  const positionHtml = `<text class="se-instance-position" text-anchor="middle" dominant-baseline="central" y="0.08">${position}</text>`;

  const seatHtml = anchors.map((a) => {
    const isBlocked = blocked.has(a.id);
    const guest = guestAt(inst.id, a.id);
    const px = a.x;
    const py = a.y;
    const cls = isBlocked ? "is-blocked" : guest ? "is-occupied" : "is-available";
    // Occupied seats render the guest's avatar face (clipped to a circle), or
    // their 2-character initials when they have no photo. Empty seats show a
    // "?" placeholder. No other text on the canvas.
    let inner;
    if (guest && guestAvatarUrl(guest)) {
      inner = `<image href="${guestAvatarUrl(guest)}" x="-0.32" y="-0.32" width="0.64" height="0.64" preserveAspectRatio="xMidYMid slice" clip-path="url(#se-seat-clip)"/>`;
    } else if (guest) {
      inner = `<text class="se-seat-initial" font-size="0.16" text-anchor="middle" dominant-baseline="central" y="0.04">${guestInitials(guest)}</text>`;
    } else {
      inner = `<text class="se-seat-empty-mark" font-size="0.16" text-anchor="middle" dominant-baseline="central" y="0.04">?</text>`;
    }
    const rsvpDot = guest
      ? `<circle class="se-seat-rsvp-badge" cx="0" cy="-0.34" r="0.09" fill="${saturdayDotColor(saturdayLevel(guest))}"/>`
      : "";
    return `<g class="se-seat ${cls}" data-instance-id="${inst.id}" data-seat-id="${a.id}" transform="translate(${px} ${py})">
      <circle r="0.32" class="se-seat-circle"/>
      ${inner}
      ${rsvpDot}
      <title>${guest ? resolveGuestName(guest.id) : `Asiento ${a.index + 1}`}</title>
    </g>`;
  }).join("");

  return `
    <g class="se-instance ${isSelected ? "is-selected" : ""} ${group ? "is-grouped" : ""}"
      data-instance-id="${inst.id}"
      transform="translate(${cx} ${cy}) rotate(${rotation})">
      <g class="se-rotatable">${shapeHtml}${positionHtml}</g>
      <g class="se-seats">${seatHtml}</g>
    </g>`;
}

function ghostMarkup() {
  if (!drag || drag.mode !== "object" || !drag.ghost) return "";
  const inst = plan.instances.find((i) => i.id === drag.movedIds[0]);
  if (!inst) return "";
  const { def } = instanceSeats(inst);
  if (!def) return "";
  const dims = normalizeDims(def);
  const cx = drag.ghost.x;
  const cy = drag.ghost.y;
  const rotation = drag.ghost.rotation;
  const valid = drag.valid;
  const style = objectStyleVars(def);
  const shapeHtml = dims.shape === "circle"
    ? `<circle r="${dims.radius}" class="se-object-body" style="${style}"/>`
    : `<rect x="${-dims.width / 2}" y="${-dims.height / 2}" width="${dims.width}" height="${dims.height}" class="se-object-body" style="${style}"/>`;
  return `<g class="se-ghost ${valid ? "" : "is-invalid"}" transform="translate(${cx} ${cy}) rotate(${rotation})">${shapeHtml}</g>`;
}

// A guest is "already seated" if they appear in any instance's assignments.
function guestSeatLocation(guestId) {
  for (const [instanceId, seats] of Object.entries(plan.guestAssignments || {})) {
    for (const [sid, gid] of Object.entries(seats)) {
      if (gid === guestId) {
        const inst = plan.instances.find((i) => i.id === instanceId);
        return {
          instanceId,
          seatId: sid,
          label: inst?.metadata?.displayName || instanceId,
          badge: instanceBadge(instanceId),
          placed: !inst?.unplaced,
        };
      }
    }
  }
  return null;
}

// "console effect" badge for an instance: "#01-Novios" (1-based position + name).
function instanceBadge(instanceId) {
  const inst = plan.instances.find((i) => i.id === instanceId);
  if (!inst) return "";
  const position = plan.instances.findIndex((i) => i.id === instanceId) + 1;
  const def = instanceDef(inst);
  const name = inst.metadata?.displayName || def?.name || inst.id;
  return `#${String(position).padStart(2, "0")}-${name}`;
}

function instanceSlotsMarkup(inst) {
  const { anchors, blocked } = instanceSeats(inst);
  const assigned = plan.guestAssignments?.[inst.id] || {};
  const rows = anchors.map((a) => {
    const gid = assigned[a.id];
    const guest = gid ? getGuest(gid) : null;
    const cls = [
      guest ? "is-occupied" : "is-empty",
      blocked.has(a.id) ? "is-blocked" : "",
    ].join(" ").trim();
    return `
      <div class="se-slot ${cls}" role="button" tabindex="0"
        data-slot-instance="${inst.id}" data-slot-id="${a.id}" data-slot-open="${inst.id}|${a.id}"
        ${guest ? `draggable="true" data-drag-guest="${gid}"` : ""}
        title="${guest ? `Clic para reasignar · ${guestFullName(guest)}` : `Clic para asignar · Asiento ${a.index + 1}`}">
        <span class="se-slot-idx">${a.index + 1}</span>
        <span class="se-slot-guest">${guest ? guestFullName(guest) : "— vacío —"}</span>
        ${guest
          ? `<button class="se-slot-remove" data-unassign-instance="${inst.id}" data-unassign-seat="${a.id}" type="button" title="Quitar asignación">✕</button>`
          : ""}
      </div>`;
  }).join("");
  return `
    <div class="se-slots" data-slots-list="${inst.id}" hidden>${rows}</div>`;
}

function panelMarkup() {
  // ── 1. ABSTRACT objects (definitions) — create a REAL instance from these ──
  const seatLabel = (d) => {
    const cap = definitionSeatCount(d);
    return cap > 0 ? `${cap} asientos` : "sin asientos";
  };
  // Built-in catalog objects now come from `plan.definitions` (loaded from the
  // `catalog_definitions` collection), so the sidebar is fully DB-driven.
  const catalogDefs = plan.definitions.filter((d) => isSystemDefinition(d));
  const systemItems = catalogDefs.map((d) => {
    const usage = definitionUsageCount(plan.instances, d.id);
    const cap = definitionSeatCount(d);
    return `<div class="se-catalog-custom" data-custom-def="${d.id}">
      <button class="se-catalog-item" data-add-def="${d.id}" data-drag-def="${d.id}" draggable="true" type="button" title="Clic: crear una instancia real · Arrastrar: crear y colocar directamente">
        <span class="se-catalog-badge">Estándar · ${d.category || "objeto"}</span>
        <strong>${d.name}</strong>
        <small>${d.metadata?.description || ""} · ${seatLabel(d)}${d.collidable === false ? " · sin colisión" : ""}${usage ? ` · ${usage} en uso` : ""}</small>
        <small class="se-catalog-hint">＋ Crear instancia · ⇱ arrastrar al salón</small>
      </button>
      <button class="se-catalog-action" data-edit-def="${d.id}" type="button" title="Editar definición">✏️</button>
    </div>`;
  }).join("");

  const customDefs = plan.definitions.filter((d) => !isSystemDefinition(d));
  const customItems = customDefs.map((d) => {
    const usage = definitionUsageCount(plan.instances, d.id);
    const cap = definitionSeatCount(d);
    return `<div class="se-catalog-custom" data-custom-def="${d.id}">
      <button class="se-catalog-item" data-add-def="${d.id}" data-drag-def="${d.id}" draggable="true" type="button" title="Clic: crear una instancia real · Arrastrar: crear y colocar">
        <span class="se-catalog-badge">Personalizado</span>
        <strong>${d.name || d.id}</strong>
        <small>${d.shape} · ${cap > 0 ? `${cap} asientos` : "sin asientos"} · ${usage} en uso${d.collidable === false ? " · sin colisión" : ""}</small>
        <small class="se-catalog-hint">＋ Crear instancia · ⇱ arrastrar al salón</small>
      </button>
      <button class="se-catalog-action" data-edit-def="${d.id}" type="button" title="Editar definición">✏️</button>
      <button class="se-catalog-action" data-delete-def="${d.id}" type="button" title="Eliminar definición">🗑</button>
    </div>`;
  }).join("");

  // ── 2. REAL instances (already created) — drag THESE to the canvas ──
  const realInstances = plan.instances.map((inst, index) => {
    const def = instanceDef(inst);
    const label = inst.metadata?.displayName || def?.name || inst.id;
    const occupied = Object.keys(plan.guestAssignments?.[inst.id] || {}).length;
    const seatCount = def ? definitionSeatCount(def) : 0;
    const isPlaced = !inst.unplaced;
    return `
      <div class="se-instance-wrap" data-reorder-wrap="${inst.id}">
        <div class="se-instance-item ${isPlaced ? "is-placed" : "is-unplaced"} ${selection.has(inst.id) ? "is-selected" : ""}"
          data-sel-instance="${inst.id}"
          ${!isPlaced ? `data-drag-instance="${inst.id}" draggable="true"` : ""}
          title="${isPlaced ? "Haz clic para enfocar en el salón" : "Arrastra al salón o usa ⚑ para colocación automática"}">
          <span class="se-instance-grip" data-reorder-instance="${inst.id}" draggable="true" title="Arrastrar para reordenar">⋮⋮</span>
          <button class="se-instance-name" type="button" data-focus-instance="${inst.id}">
            <span class="se-instance-dot ${isPlaced ? "is-placed" : "is-unplaced"}"></span>
            <span class="se-instance-name-text">${label}</span>
            <span class="se-instance-cap">${occupied}/${seatCount}</span>
          </button>
          <span class="se-instance-reorder">
            <button class="se-reorder-btn" data-reorder-instance="${inst.id}" data-dir="up" type="button" ${index === 0 ? "disabled" : ""} title="Subir">▲</button>
            <button class="se-reorder-btn" data-reorder-instance="${inst.id}" data-dir="down" type="button" ${index === plan.instances.length - 1 ? "disabled" : ""} title="Bajar">▼</button>
          </span>
          ${isPlaced
            ? ""
            : `<button class="se-instance-auto" data-auto-place="${inst.id}" type="button" title="Colocar automáticamente en un espacio libre">⚑</button>
               <span class="se-instance-tag">sin colocar</span>`}
          <button class="se-instance-toggle" data-toggle-slots="${inst.id}" type="button" title="Ver asientos" aria-expanded="false">▸</button>
          <button class="se-instance-rename" data-rename-instance="${inst.id}" type="button" title="Renombrar">✎</button>
          <button class="se-catalog-action" data-del-instance="${inst.id}" type="button" title="Eliminar instancia">🗑</button>
        </div>
        ${instanceSlotsMarkup(inst)}
      </div>`;
  }).join("");

  // ── 3. GUESTS (pre-select before assigning to a table) ──
  const guests = getActiveGuests()
    .slice()
    .sort((a, b) => guestFullName(a).localeCompare(guestFullName(b)))
    .filter((g) => {
      const seat = guestSeatLocation(g.id);
      if (showOnlyUnassigned && seat) return false;
      if (showOnlySat5 && saturdayLevel(g) !== 5) return false;
      if (showOnlyChildren && !isChildGuest(g)) return false;
      return true;
    });
  const guestItems = guests.slice(0, 400).map((g) => {
    const seat = guestSeatLocation(g.id);
    const isPending = pendingGuest === g.id;
    return `<button class="se-guest-option ${seat ? "is-seated" : ""} ${isPending ? "is-pending" : ""}" data-guest-pick="${g.id}" type="button" title="${seat ? `Sentado en ${seat.label}` : "Seleccionar para asignar a un asiento"}">
      ${guestAvatarUrl(g) ? `<img src="${guestAvatarUrl(g)}" alt=""/>` : `<span class="se-guest-avatar-init">${guestInitials(g)}</span>`}
      <span class="se-guest-name">${guestFullName(g)}</span>
      ${saturdayBadge(g)}
      ${seat ? `<span class="se-table-badge">${seat.badge}</span>` : ""}
      ${isPending ? `<span class="se-guest-pending">✓ seleccionado</span>` : ""}
    </button>`;
  }).join("");

  const pendingBanner = pendingGuest
    ? `<div class="se-pending-banner">Asignando a <strong>${resolveGuestName(pendingGuest)}</strong> — toca un asiento en el salón. <button class="se-btn" data-clear-pending type="button">Cancelar</button></div>`
    : "";

  const zone = plan.zones[0];
  const zoneHeader = zone
    ? `<div class="se-zone-control">
        <span class="se-zone-control-name">${zone.name || zone.id}</span>
        <span class="se-zone-control-meta">${zone.width} × ${zone.height} m</span>
        <button class="se-btn" data-rename-zone-sidebar="${zone.id}" type="button" title="Renombrar salón">✎</button>
      </div>`
    : "";

  // Seating integrity: duplicated guests + RSVP(Saturday) ↔ seat mismatches.
  const integrity = computeSeatingIntegrity({
    guestAssignments: plan.guestAssignments,
    allGuests: getActiveGuests(),
    getSaturdayLevel: saturdayLevel,
  });
  const dupCount = integrity.duplicated.length;
  const integrityBanner = dupCount || integrity.satYesNoSeat.length || integrity.satNoWithSeat.length
    ? `<div class="se-integrity">
        <strong>⚠️ Revisión de asientos</strong>
        ${dupCount ? `<p>${dupCount} invitado(s) duplicado(s) en varias mesas.</p>` : ""}
        ${integrity.satYesNoSeat.length ? `<p>${integrity.satYesNoSeat.length} confirmado(s) sábado sin asiento.</p>` : ""}
        ${integrity.satNoWithSeat.length ? `<p>${integrity.satNoWithSeat.length} no confirmado(s) sábado con asiento.</p>` : ""}
        ${dupCount ? `<button class="se-btn" data-dedupe-guests type="button">Corregir duplicados</button>` : ""}
      </div>`
    : "";

  // Order: 1. Invitados · 2. Mesas · 3. Catálogo.
  return `
    <div class="se-sidebar-sections">
      ${integrityBanner}
      ${zoneHeader}
      <details class="se-sidebar-section" data-se-section="guests" open>
        <summary>Invitados <span class="se-count">${guests.length}</span></summary>
        <div class="se-guest-search"><input type="search" data-guest-filter placeholder="Buscar invitado…"/></div>
        <div class="se-guest-filters">
          <label><input type="checkbox" data-filter-unassigned ${showOnlyUnassigned ? "checked" : ""}/> Sin mesa</label>
          <label><input type="checkbox" data-filter-sat5 ${showOnlySat5 ? "checked" : ""}/> Sábado = 5</label>
          <label><input type="checkbox" data-filter-children ${showOnlyChildren ? "checked" : ""}/> Niños</label>
        </div>
        ${pendingBanner}
        <div class="se-guest-panel-list">${guestItems}</div>
      </details>

      <details class="se-sidebar-section" data-se-section="real" open>
        <summary>Mesas <span class="se-count">${plan.instances.length}</span></summary>
        ${realInstances ? `<div class="se-instance-list">${realInstances}</div>` : '<p class="se-empty">Aún no hay mesas.</p>'}
        <p class="se-sidebar-hint">Los objetos "sin colocar" se arrastran al salón.</p>
      </details>

      <details class="se-sidebar-section" data-se-section="abstract" open>
        <summary>Catálogo</summary>
        <div class="se-catalog-head">
          <small>Estos son moldes. Crea una <strong>instancia real</strong> para poder colocarla.</small>
          <button class="se-btn" data-new-custom type="button">＋ Nuevo</button>
        </div>
        <div class="se-catalog-group">${systemItems}</div>
        ${customDefs.length ? `<div class="se-catalog-subhead">Personalizados</div><div class="se-catalog-group">${customItems}</div>` : ""}
      </details>
    </div>`;
}

function render() {
  if (!svg) return;
  const vb = visibleViewBox();
  svg.setAttribute("viewBox", `${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`);
  svg.innerHTML = `
    <defs>
      <clipPath id="se-seat-clip" clipPathUnits="userSpaceOnUse"><circle r="0.32"/></clipPath>
    </defs>
    ${showGrid ? `<g class="se-grid-layer">${gridLines()}</g>` : ""}
    <g class="se-zones">${plan.zones.filter((z) => z.visible !== false).map(zoneMarkup).join("")}</g>
    <g class="se-instances">${[...plan.instances].filter((i) => !i.unplaced).sort((a, b) => zIndexOf(a) - zIndexOf(b)).map(instanceMarkup).join("")}</g>
    ${ghostMarkup()}
  `;

  // ── Panel (catalog + toolbar) ──────────────────────────────────────────
  renderPanel();
}

function renderPanel() {
  const panel = container?.querySelector("[data-se-sidebar]");
  if (!panel) return;
  // Preserve sidebar scroll position, open/expand state, and search text
  // across re-renders so an action doesn't reset the user's context.
  const scrollTop = panel.scrollTop;
  const openSections = new Set();
  panel.querySelectorAll(".se-sidebar-section[open]").forEach((s) => {
    if (s.dataset.seSection) openSections.add(s.dataset.seSection);
  });
  const expandedSlots = new Set();
  panel.querySelectorAll("[data-slots-list]").forEach((el) => {
    if (!el.hidden) expandedSlots.add(el.dataset.slotsList);
  });
  const guestFilterValue = panel.querySelector("[data-guest-filter]")?.value || "";

  panel.innerHTML = panelMarkup();

  panel.querySelectorAll(".se-sidebar-section").forEach((s) => {
    if (openSections.has(s.dataset.seSection)) s.setAttribute("open", "");
    else s.removeAttribute("open");
  });
  panel.querySelectorAll("[data-slots-list]").forEach((el) => {
    el.hidden = !expandedSlots.has(el.dataset.slotsList);
    const toggle = panel.querySelector(`[data-toggle-slots="${el.dataset.slotsList}"]`);
    if (toggle) toggle.setAttribute("aria-expanded", String(!el.hidden));
  });
  const filterInput = panel.querySelector("[data-guest-filter]");
  if (filterInput) filterInput.value = guestFilterValue;

  panel.scrollTop = scrollTop;
}

function renderSaveStatus() {
  const el = container?.querySelector("[data-se-save]");
  if (!el) return;
  const map = { idle: "", saving: "Guardando…", saved: "Guardado", error: "Error al guardar" };
  el.textContent = map[saveState] || "";
  el.dataset.state = saveState;
}

// ── Persistence (autosave, semantic-only) ────────────────────────────────
//
// Every committed semantic change MUST be persisted reliably. Guest moves and
// removals are especially easy to lose if the user reloads before a debounced
// timer fires, so we:
//   1. Save IMMEDIATELY on every commit (no debounce).
//   2. Serialize writes through a promise queue so rapid sequential edits
//      can't interleave and overwrite each other with a stale snapshot.
//   3. Flush on `beforeunload`/`visibilitychange` as a best-effort backup.
// ──────────────────────────────────────────────────────────────────────────

let persistQueue = Promise.resolve();

async function persist() {
  if (!planLoaded) {
    console.warn("[spatialEditor] persist SKIPPED (plan not loaded yet)", summarizeAssignments());
    return; // never write before the real plan is loaded
  }
  saveState = "saving";
  renderSaveStatus();
  console.log("[spatialEditor] persist:start", summarizeAssignments());
  try {
    await savePlan(plan);
    saveState = "saved";
    console.log("[spatialEditor] persist:ok", summarizeAssignments());
  } catch (err) {
    console.error("[spatialEditor] persist:FAILED", err);
    saveState = "error";
  }
  renderSaveStatus();
}

function schedulePersist() {
  // Chain onto the queue. `persist` reads the LIVE `plan`, so the last
  // queued write always reflects the newest state even after rapid commits.
  persistQueue = persistQueue.then(() => {
    console.log("[spatialEditor] persist:queued", summarizeAssignments());
    return persist();
  }).catch((err) => {
    console.error("[spatialEditor] persist queue error", err);
    saveState = "error";
    renderSaveStatus();
  });
}

// Best-effort flush when the user navigates away or backgrounds the tab.
//
// CRITICAL: these must NOT write before the authoritative plan has been loaded.
// During the initial async `loadPlan()`, the module-level `plan` is still the
// empty `createPlan()` default — writing it would CLOBBER the real plan (this
// bit us: hiding the tab mid-load wiped all instances). Guards on `planLoaded`.
window.addEventListener("beforeunload", () => {
  if (!planLoaded || saveState === "saving") return;
  savePlan(plan).catch(() => {});
});
document.addEventListener("visibilitychange", () => {
  if (!planLoaded || document.visibilityState !== "hidden" || saveState === "saving") return;
  savePlan(plan).catch(() => {});
});

// ── Focus a placed instance in the canvas (pan/zoom toward it) ───────────
function focusInstance(instanceId) {
  const inst = plan.instances.find((i) => i.id === instanceId);
  if (!inst) return;
  const fp = instanceFootprint(plan, inst);
  if (!fp) return;
  const b = getFootprintBounds(fp);
  const { w, h } = svgSize();
  const contentW = (b.maxX - b.minX) || 1;
  const contentH = (b.maxY - b.minY) || 1;
  const pxPerMeter = clampZoom(Math.min(w / (contentW * 2), h / (contentH * 2), EDITOR_DEFAULTS.maxZoom / 2));
  camera = {
    pxPerMeter,
    panX: (b.minX + b.maxX) / 2 - (w / pxPerMeter) / 2,
    panY: (b.minY + b.maxY) / 2 - (h / pxPerMeter) / 2,
  };
  selection = new Set([instanceId]);
  log(`focusInstance ${instanceId} → center (${(b.minX + b.maxX) / 2}, ${(b.minY + b.maxY) / 2})`);
  render();
}

// ── Fit camera to the plan ──────────────────────────────────────────────
// Centers + zooms the camera so the whole plan (zones + instances) is visible
// on first load. Useful for migrated plans whose coordinates are centered on
// the NOVIOS table at (0,0) but span negative values.
function fitPlanToView() {
  const bounds = [];
  for (const inst of plan.instances) {
    if (inst.unplaced) continue;
    const fp = instanceFootprint(plan, inst);
    if (fp) bounds.push(getFootprintBounds(fp));
  }
  for (const zone of plan.zones) {
    bounds.push({ minX: zone.x, minY: zone.y, maxX: zone.x + zone.width, maxY: zone.y + zone.height });
  }
  if (!bounds.length) return;

  const minX = Math.min(...bounds.map((b) => b.minX));
  const minY = Math.min(...bounds.map((b) => b.minY));
  const maxX = Math.max(...bounds.map((b) => b.maxX));
  const maxY = Math.max(...bounds.map((b) => b.maxY));

  const { w, h } = svgSize();
  const contentW = maxX - minX || 1;
  const contentH = maxY - minY || 1;
  const margin = 0.15; // 15% breathing room
  const pxPerMeter = clampZoom(Math.min(w / (contentW * (1 + margin)), h / (contentH * (1 + margin))));
  camera = {
    pxPerMeter,
    panX: minX - (w / pxPerMeter - contentW) / 2,
    panY: minY - (h / pxPerMeter - contentH) / 2,
  };
}

// ── Command dispatch (semantic action + history + autosave) ─────────────

function dispatch(action, { record = true, save = true } = {}) {
  log(`dispatch ${action.type}`, action);
  const before = plan;
  const next = reducePlan(plan, action);
  if (next === plan) {
    log(`dispatch ${action.type} :: REJECTED (no change)`);
    return false; // rejected (invalid placement / immutability guard)
  }
  plan = next;
  if (record) history.commit(before, action);
  render();
  if (save) schedulePersist();
  return true;
}

// ── Selection / editing helpers ──────────────────────────────────────────

function selectOnly(ids) {
  selection = new Set(ids);
  render();
}

function selectedInstances() {
  return plan.instances.filter((i) => selection.has(i.id));
}

function createInstance(definitionId, { placed = true, x = 0, y = 0 } = {}) {
  const def = findDefinition(plan, definitionId);
  if (!def) return null;
  const id = `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const instance = {
    id,
    definitionId,
    zoneId: plan.zones[0]?.id || "main",
    transform: { x: snapToGrid(x, EDITOR_DEFAULTS.snap), y: snapToGrid(y, EDITOR_DEFAULTS.snap), rotation: 0 },
  };
  if (!placed) instance.unplaced = true;
  log(`createInstance ${definitionId} → ${id} (${placed ? "placed" : "unplaced"})`);
  dispatch({ type: "ADD_INSTANCE", instance });
  selection = new Set([id]);
  render();
  return instance;
}

// Clicking an abstract catalog item creates an UNPLACED real instance (shown
// under "Objetos reales", ready to drag onto the canvas).
function addInstance(definitionId) {
  createInstance(definitionId, { placed: false });
}

// Drop an abstract definition directly onto the canvas (create + place).
function addInstanceAt(definitionId, x, y) {
  createInstance(definitionId, { placed: true, x, y });
}

// Drag an UNPLACED real instance onto the canvas → place it there.
function placeUnplacedInstanceOnDrop(e) {
  e.preventDefault();
  const instanceId = e.dataTransfer.getData("text/custom-instance");
  if (!instanceId) return;
  const inst = plan.instances.find((i) => i.id === instanceId);
  if (!inst) return;
  const world = worldOf(e);
  const transform = {
    ...inst.transform,
    x: snapToGrid(world.x, EDITOR_DEFAULTS.snap),
    y: snapToGrid(world.y, EDITOR_DEFAULTS.snap),
  };
  log(`placeUnplacedInstanceOnDrop ${instanceId} → (${transform.x}, ${transform.y})`);
  dispatch({ type: "MOVE_INSTANCES", moves: [{ id: instanceId, transform }] }, { record: true });
  selection = new Set([instanceId]);
  render();
}

// Drag start for BOTH abstract definitions and real (unplaced) instances.
function onCatalogDragStart(e) {
  const reorderGrip = e.target.closest?.("[data-reorder-instance]");
  if (reorderGrip) {
    reorderDragId = reorderGrip.dataset.reorderInstance;
    e.dataTransfer.setData("text/reorder-instance", reorderDragId);
    e.dataTransfer.effectAllowed = "move";
    log(`dragstart reorder-instance ${reorderDragId}`);
    return;
  }
  const inst = e.target.closest?.("[data-drag-instance]");
  if (inst) {
    e.dataTransfer.setData("text/custom-instance", inst.dataset.dragInstance);
    e.dataTransfer.effectAllowed = "move";
    log(`dragstart real-instance ${inst.dataset.dragInstance}`);
    return;
  }
  // Guest drag (moving a guest between slots).
  const guest = e.target.closest?.("[data-drag-guest]");
  if (guest) {
    const slot = guest.closest("[data-slot-instance]");
    guestDrag = {
      guestId: guest.dataset.dragGuest,
      fromInstanceId: slot.dataset.slotInstance,
      fromSeatId: slot.dataset.slotId,
    };
    e.dataTransfer.setData("text/custom-guest", JSON.stringify(guestDrag));
    e.dataTransfer.effectAllowed = "move";
    log(`dragstart guest ${guestDrag.guestId} from ${guestDrag.fromInstanceId}/${guestDrag.fromSeatId}`);
    return;
  }
  const def = e.target.closest?.("[data-drag-def]");
  if (def) {
    e.dataTransfer.setData("text/plain", def.dataset.dragDef);
    e.dataTransfer.effectAllowed = "copy";
    log(`dragstart abstract-def ${def.dataset.dragDef}`);
  }
}

function onSlotDragOver(e) {
  const slot = e.target.closest?.("[data-slot-instance]");
  if (!slot) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function onSlotDrop(e) {
  const slot = e.target.closest?.("[data-slot-instance]");
  if (!slot) return;
  e.preventDefault();
  const raw = e.dataTransfer.getData("text/custom-guest");
  if (!raw) return;
  let drag;
  try { drag = JSON.parse(raw); } catch { return; }
  const toInstanceId = slot.dataset.slotInstance;
  const toSeatId = slot.dataset.slotId;
  // No-op if dropping onto the same seat.
  if (drag.fromInstanceId === toInstanceId && drag.fromSeatId === toSeatId) return;

  // Prevent dropping onto a connection-blocked seat.
  const targetInst = plan.instances.find((i) => i.id === toInstanceId);
  if (targetInst) {
    const { blocked } = instanceSeats(targetInst);
    if (blocked.has(toSeatId)) {
      log(`slot drop blocked: ${toInstanceId}/${toSeatId} is connection-blocked`);
      return;
    }
  }

  log(`move guest ${drag.guestId} → ${toInstanceId}/${toSeatId}`);
  dispatch({
    type: "MOVE_GUEST",
    fromInstanceId: drag.fromInstanceId,
    fromSeatId: drag.fromSeatId,
    toInstanceId,
    toSeatId,
    guestId: drag.guestId,
  }, { record: true });
  guestDrag = null;
}

function onReorderDragOver(e) {
  if (reorderDragId == null) return;
  const wrap = e.target.closest?.("[data-reorder-wrap]");
  if (!wrap) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function onReorderDrop(e) {
  if (reorderDragId == null) return;
  e.preventDefault();
  const wrap = e.target.closest?.("[data-reorder-wrap]");
  const id = reorderDragId;
  reorderDragId = null;
  if (!wrap) return;
  const targetId = wrap.dataset.reorderWrap;
  // Insertion index measured in the list AFTER removing the dragged item.
  const remaining = plan.instances.filter((i) => i.id !== id);
  const targetIdx = remaining.findIndex((i) => i.id === targetId);
  if (targetIdx === -1) return;
  const rect = wrap.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  const insertAt = before ? targetIdx : targetIdx + 1;
  log(`reorder ${id} → index ${insertAt} (${before ? "before" : "after"} ${targetId})`);
  dispatch({ type: "MOVE_INSTANCE_INDEX", id, toIndex: insertAt }, { record: true });
}

function autoPlaceInstance(instanceId) {
  const inst = plan.instances.find((i) => i.id === instanceId);
  if (!inst) return;
  const transform = findFreePosition(plan, inst);
  if (!transform) {
    log(`autoPlaceInstance ${instanceId} :: NO FREE SPACE`);
    return;
  }
  log(`autoPlaceInstance ${instanceId} → (${transform.x}, ${transform.y})`);
  dispatch({ type: "MOVE_INSTANCES", moves: [{ id: instanceId, transform }] }, { record: true });
  selection = new Set([instanceId]);
  focusInstance(instanceId);
}

function onCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
}

function onCanvasDrop(e) {
  e.preventDefault();
  const instanceId = e.dataTransfer.getData("text/custom-instance");
  if (instanceId) {
    placeUnplacedInstanceOnDrop(e);
    return;
  }
  const definitionId = e.dataTransfer.getData("text/plain");
  if (definitionId) {
    const world = worldOf(e);
    addInstanceAt(definitionId, world.x, world.y);
  }
}

function removeSelection() {
  for (const id of [...selection]) {
    dispatch({ type: "REMOVE_INSTANCE", id }, { record: false });
  }
  // Record removal as a single semantic action is tricky; just record last.
  // For usable undo, re-apply remove via a composite commit.
  selection = new Set();
  render();
  schedulePersist();
}

function duplicateSelection() {
  for (const id of [...selection]) {
    const inst = plan.instances.find((i) => i.id === id);
    if (!inst) continue;
    const copy = {
      ...inst,
      id: `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      transform: { ...inst.transform, x: inst.transform.x + 1, y: inst.transform.y + 0.5 },
    };
    dispatch({ type: "ADD_INSTANCE", instance: copy }, { record: false });
  }
  schedulePersist();
}

function rotateSelection(deg = 90) {
  const changed = [];
  for (const inst of selectedInstances()) {
    const def = instanceDef(inst);
    const norm = def && normalizeDefinition(def);
    if (norm && !norm.canRotate) continue;
    const rotation = (((inst.transform.rotation || 0) + deg) % 360 + 360) % 360;
    if (dispatch({ type: "ROTATE_INSTANCE", id: inst.id, rotation }, { record: false })) {
      changed.push(inst.id);
    }
  }
  if (changed.length) schedulePersist();
}

function groupSelection() {
  if (selection.size < 2) return;
  const id = `grp-${Date.now().toString(36)}`;
  const objectIds = [...selection];
  const zoneId = plan.instances.find((i) => i.id === objectIds[0])?.zoneId || plan.zones[0]?.id;
  dispatch({ type: "GROUP", id, objectIds, zoneId });
  selection = new Set([id]);
  render();
}

function ungroupSelection() {
  for (const id of [...selection]) {
    const group = plan.groups.find((g) => g.id === id);
    if (group) {
      dispatch({ type: "UNGROUP", id });
      selection = new Set(group.objectIds);
      render();
      return;
    }
  }
}

// ── Canvas size editor ──────────────────────────────────────────────────

function openVenueModal() {
  const zone = plan.zones[0] || { width: 56, height: 56 };
  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  overlay.innerHTML = `
    <div class="se-modal">
      <div class="se-modal-head">
        <h3>Tamaño del salón</h3>
        <button class="se-modal-close" type="button" data-close>✕</button>
      </div>
      <div class="se-modal-form">
        <p class="se-venue-note">Los objetos solo se pueden colocar dentro de este rectángulo. Se puede redimensionar cuando se necesite más (o menos) espacio.</p>
        <div class="se-form-row">
          <label>Ancho (m) <input type="number" min="1" step="0.5" data-venue-w value="${zone.width}"/></label>
          <label>Alto (m) <input type="number" min="1" step="0.5" data-venue-h value="${zone.height}"/></label>
        </div>
        <div class="se-modal-actions">
          <button class="se-btn is-primary" data-save type="button">Guardar</button>
          <button class="se-btn" data-close type="button">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-save]").addEventListener("click", () => {
    const w = Number(overlay.querySelector("[data-venue-w]").value);
    const h = Number(overlay.querySelector("[data-venue-h]").value);
    if (dispatch({ type: "UPDATE_VENUE", width: w, height: h }, { record: true })) close();
  });
}

// ── Rename prompt (instance name/tag + zone title) ──────────────────────
function openRenameModal(label, current, onSave) {
  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  overlay.innerHTML = `
    <div class="se-modal">
      <div class="se-modal-head">
        <h3>${label}</h3>
        <button class="se-modal-close" type="button" data-close>✕</button>
      </div>
      <div class="se-modal-form">
        <label>Nombre <input data-rename-value value="${current || ""}"/></label>
        <div class="se-modal-actions">
          <button class="se-btn is-primary" data-save type="button">Guardar</button>
          <button class="se-btn" data-close type="button">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-save]").addEventListener("click", () => {
    const value = overlay.querySelector("[data-rename-value]").value.trim();
    if (value) onSave(value);
    close();
  });
}

function renameInstance(instanceId) {
  const inst = plan.instances.find((i) => i.id === instanceId);
  if (!inst) return;
  const current = inst.metadata?.displayName || "";
  openRenameModal("Renombrar mesa / etiqueta", current, (value) => {
    log(`rename instance ${instanceId} → ${value}`);
    dispatch({ type: "UPDATE_INSTANCE_META", id: instanceId, metadata: { displayName: value } }, { record: true });
  });
}

function renameZone(zoneId) {
  const zone = plan.zones.find((z) => z.id === zoneId);
  if (!zone) return;
  openRenameModal("Renombrar salón", zone.name, (value) => {
    log(`rename zone ${zoneId} → ${value}`);
    dispatch({ type: "UPDATE_ZONE", id: zoneId, zone: { ...zone, name: value } }, { record: true });
  });
}

// ── Guest assignment modal ───────────────────────────────────────────────

function openGuestPicker(instanceId, seatId) {
  const current = plan.guestAssignments?.[instanceId]?.[seatId];
  // Same local filter state as the sidebar "Invitados" panel, kept in sync so
  // toggling a filter in one view updates the other ("1 way adds both ways").
  let modalFilter = { unassigned: showOnlyUnassigned, sat5: showOnlySat5, children: showOnlyChildren };

  function modalGuests() {
    return getActiveGuests()
      .slice()
      .sort((a, b) => guestFullName(a).localeCompare(guestFullName(b)))
      .filter((g) => {
        if (modalFilter.unassigned && guestSeatLocation(g.id)) return false;
        if (modalFilter.sat5 && saturdayLevel(g) !== 5) return false;
        if (modalFilter.children && !isChildGuest(g)) return false;
        return true;
      });
  }

  function renderList() {
    const listEl = overlay.querySelector("[data-guest-list]");
    if (!listEl) return;
    listEl.innerHTML = `
      ${current ? `<button class="se-guest-option is-unassign" data-guest="">— Quitar asignación —</button>` : ""}
      ${modalGuests().slice(0, 400).map((g) => {
        const seat = guestSeatLocation(g.id);
        return `
        <button class="se-guest-option ${g.id === current ? "is-current" : ""}" data-guest="${g.id}" type="button">
          ${guestAvatarUrl(g) ? `<img src="${guestAvatarUrl(g)}" alt=""/>` : `<span class="se-guest-avatar-init">${guestInitials(g)}</span>`}
          <span>${guestFullName(g)}</span>
          ${saturdayBadge(g)}
          ${seat ? `<span class="se-guest-seat">${seat.label}</span>` : ""}
        </button>`;
      }).join("")}`;
  }

  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  overlay.innerHTML = `
    <div class="se-modal">
      <div class="se-modal-head">
        <h3>Asignar invitado</h3>
        <button class="se-modal-close" type="button" data-close>✕</button>
      </div>
      <div class="se-modal-search"><input type="search" data-search placeholder="Buscar invitado…"/></div>
      <div class="se-guest-filters">
        <label><input type="checkbox" data-mfilter-unassigned ${modalFilter.unassigned ? "checked" : ""}/> Sin mesa</label>
        <label><input type="checkbox" data-mfilter-sat5 ${modalFilter.sat5 ? "checked" : ""}/> Sábado = 5</label>
        <label><input type="checkbox" data-mfilter-children ${modalFilter.children ? "checked" : ""}/> Niños</label>
      </div>
      <div class="se-guest-list" data-guest-list></div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector("[data-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-search]").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    overlay.querySelectorAll(".se-guest-option[data-guest]").forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });

  // Shared filters: toggling here updates the sidebar state too.
  overlay.querySelector("[data-mfilter-unassigned]").addEventListener("change", (e) => {
    modalFilter.unassigned = e.target.checked;
    showOnlyUnassigned = e.target.checked;
    renderList();
  });
  overlay.querySelector("[data-mfilter-sat5]").addEventListener("change", (e) => {
    modalFilter.sat5 = e.target.checked;
    showOnlySat5 = e.target.checked;
    renderList();
  });
  overlay.querySelector("[data-mfilter-children]").addEventListener("change", (e) => {
    modalFilter.children = e.target.checked;
    showOnlyChildren = e.target.checked;
    renderList();
  });

  renderList();
  overlay.querySelectorAll("[data-guest]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guestId = btn.dataset.guest || null;
      if (guestId) {
        dispatch({ type: "ASSIGN_GUEST", instanceId, seatId, guestId });
      } else {
        console.log(`[spatialEditor] unassign:modal ${instanceId}/${seatId}`, summarizeAssignments());
        dispatch({ type: "UNASSIGN_GUEST", instanceId, seatId });
      }
      close();
    });
  });
}

// ── Custom definition modal ──────────────────────────────────────────────

function openCustomDefModal(defId = null) {
  const def = defId ? findDefinition(plan, defId) : null;
  const isEdit = Boolean(def);
  const isBuiltIn = def ? isSystemDefinition(def) : false;
  const can = def ? canEditDefinition(def, plan.instances) : { canEdit: true, usage: 0, geometryLocked: false };
  const norm = def ? normalizeDefinition(def) : {};

  const shape = norm.shape || "circle";
  const locked = can.geometryLocked;
  const lockAttr = locked ? "disabled" : "";
  const lockNote = locked
    ? `<p class="se-warning">🔒 Este objeto se usa ${can.usage} veces. Su geometría (forma / tamaño / asientos) está bloqueada mientras existan instancias. Puedes editar nombre, colisión y estilo.</p>`
    : "";
  const overlay = document.createElement("div");
  overlay.className = "se-modal-overlay";
  overlay.innerHTML = `
    <div class="se-modal">
      <div class="se-modal-head">
        <h3>${isEdit ? "Editar objeto" : "Nuevo objeto"}</h3>
        <button class="se-modal-close" type="button" data-close>✕</button>
      </div>
      <div class="se-modal-form">
        ${lockNote}
        <label>Nombre <input data-name value="${norm.name || ""}"/></label>
        <label>Forma
          <select data-shape ${lockAttr}>
            <option value="circle" ${shape === "circle" ? "selected" : ""}>Círculo</option>
            <option value="rectangle" ${shape === "rectangle" ? "selected" : ""}>Rectángulo</option>
            <option value="square" ${shape === "square" ? "selected" : ""}>Cuadrado</option>
          </select>
        </label>
        <label>Ancho / Diámetro (m) <input type="number" step="0.1" min="0.2" data-width value="${norm.width ?? norm.diameter ?? 1.8}" ${lockAttr}/></label>
        <div class="se-form-row">
          <label>Alto (m) <input type="number" step="0.1" min="0.2" data-height value="${norm.height ?? 0.9}" ${lockAttr}/></label>
        </div>
        <label>Asientos
          <select data-seat-mode ${lockAttr}>
            <option value="none" ${norm.seating?.enabled === false ? "selected" : ""}>Ninguno</option>
            <option value="auto" ${norm.seating?.enabled !== false && norm.seating?.mode !== "fixed" ? "selected" : ""}>Automático</option>
            <option value="fixed" ${norm.seating?.mode === "fixed" ? "selected" : ""}>Fijo</option>
          </select>
        </label>
        <label><input type="checkbox" data-collidable ${norm.collidable === false ? "" : "checked"}/> Tiene colisión (desmarcar para objetos altos: toldo, decoración, escenario)</label>
        <label class="se-fixed-seats ${norm.seating?.mode === "fixed" ? "" : "is-hidden"}" data-fixed-field>
          Cantidad fija <input type="number" min="1" data-seat-count value="${norm.seating?.seatCount ?? 10}" ${lockAttr}/>
        </label>
        <div class="se-form-row se-form-style">
          <label>Color borde <input type="color" data-stroke-color value="${norm.strokeColor || "#8a6a36"}"/></label>
          <label>Color relleno <input type="color" data-fill-color value="${norm.fillColor || "#f4ead2"}"/></label>
        </div>
        <div class="se-form-row se-form-style">
          <label>Grosor borde <input type="number" step="0.01" min="0.01" data-stroke-width value="${norm.strokeWidth ?? 0.05}"/></label>
          <label>Opacidad <input type="number" step="0.05" min="0" max="1" data-opacity value="${norm.opacity ?? 1}"/></label>
          <label>Z-index <input type="number" step="1" data-z-index value="${norm.zIndex ?? 10}"/></label>
        </div>
        <div class="se-modal-actions">
          <button class="se-btn is-primary" data-save type="button">Guardar</button>
          <button class="se-btn" data-close type="button">Cancelar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector("[data-shape]").addEventListener("change", (e) => {
    overlay.querySelector("[data-height]").closest(".se-form-row").style.display = e.target.value === "rectangle" ? "" : "none";
  });
  overlay.querySelector("[data-seat-mode]").addEventListener("change", (e) => {
    overlay.querySelector("[data-fixed-field]").classList.toggle("is-hidden", e.target.value !== "fixed");
  });
  overlay.querySelector("[data-save]").addEventListener("click", async () => {
    const name = overlay.querySelector("[data-name]").value.trim() || "Objeto";
    const shape = overlay.querySelector("[data-shape]").value;
    const width = Number(overlay.querySelector("[data-width]").value) || 1.8;
    const height = Number(overlay.querySelector("[data-height]").value) || 0.9;
    const seatMode = overlay.querySelector("[data-seat-mode]").value;
    const seatCount = Number(overlay.querySelector("[data-seat-count]").value) || 10;
    const collidable = overlay.querySelector("[data-collidable]").checked;
    const strokeColor = overlay.querySelector("[data-stroke-color]").value;
    const fillColor = overlay.querySelector("[data-fill-color]").value;
    const strokeWidth = Number(overlay.querySelector("[data-stroke-width]").value) || 0.05;
    const opacity = Number(overlay.querySelector("[data-opacity]").value);
    const zIndex = Number(overlay.querySelector("[data-z-index]").value);

    const seatsEnabled = seatMode !== "none";
    const nextDef = {
      id: def?.id || `custom-${Date.now().toString(36)}`,
      origin: def?.origin || "custom",
      name,
      category: def?.category || "object",
      shape,
      width,
      height: shape === "rectangle" ? height : width,
      diameter: shape === "circle" ? width : undefined,
      radius: shape === "circle" ? width / 2 : undefined,
      rotationMode: shape === "circle" ? "none" : "orthogonal",
      canRotate: shape !== "circle",
      collidable,
      strokeColor,
      fillColor,
      strokeWidth,
      opacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1,
      zIndex: Number.isFinite(zIndex) ? zIndex : 10,
      seating: { enabled: seatsEnabled, mode: seatMode, seatCount: seatMode === "fixed" ? seatCount : null, enabledEdges: shape === "square" ? ["north", "east", "south", "west"] : ["north", "south"] },
      connection: { enabled: shape !== "circle", ports: shape === "circle" ? [] : ["north", "east", "south", "west"] },
      metadata: { description: def?.metadata?.description || "" },
    };

    if (isEdit) {
      dispatch({ type: "UPDATE_DEFINITION", id: def.id, definition: nextDef });
      if (isBuiltIn) {
        // Built-in catalog objects live in `catalog_definitions` — persist there.
        try {
          await saveCatalogDefinition(nextDef);
        } catch (err) {
          console.error("[spatialEditor] saveCatalogDefinition failed", err);
          window.alert("No se pudo guardar el objeto en el catálogo.");
        }
      }
    } else {
      dispatch({ type: "ADD_DEFINITION", definition: nextDef });
    }
    close();
  });
}

// ── Pointer interaction (pan / drag / pinch) ─────────────────────────────

function eventPos(e) {
  const rect = svg.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
function worldOf(e) {
  return screenToWorld(eventPos(e), camera);
}

function findInstanceTarget(e) {
  const el = e.target.closest?.("[data-instance-id]");
  if (!el) return null;
  const seatEl = e.target.closest?.("[data-seat-id]");
  return { instanceId: el.dataset.instanceId, seatId: seatEl?.dataset.seatId || null };
}

function beginObjectDrag(instanceId, e) {
  const inst = plan.instances.find((i) => i.id === instanceId);
  if (!inst) return;
  const movedIds = selection.has(instanceId) ? [...selection].filter((id) => plan.instances.some((i) => i.id === id)) : [instanceId];
  const startWorld = worldOf(e);
  const startTransforms = new Map(movedIds.map((id) => [id, { ...plan.instances.find((i) => i.id === id).transform }]));
  drag = {
    mode: "object",
    startWorld,
    movedIds,
    startTransforms,
    ghost: { ...inst.transform },
    valid: true,
    active: true,
  };
  svg.setPointerCapture(e.pointerId);
  render();
}

function updateObjectDrag(e) {
  const { startWorld, movedIds, startTransforms } = drag;
  const cur = worldOf(e);
  const dx = cur.x - startWorld.x;
  const dy = cur.y - startWorld.y;

  // Primary instance drives snapping (connection + grid).
  const primaryId = movedIds[0];
  const primary = plan.instances.find((i) => i.id === primaryId);
  const rawTransform = {
    ...startTransforms.get(primaryId),
    x: snapToGrid(startTransforms.get(primaryId).x + dx, EDITOR_DEFAULTS.snap),
    y: snapToGrid(startTransforms.get(primaryId).y + dy, EDITOR_DEFAULTS.snap),
  };
  const cand = computeDragCandidate(plan, primary, { ...rawTransform, rotation: rawTransform.rotation }, EDITOR_DEFAULTS.snap);

  // Move other selected objects by the same snapped delta.
  const snapDx = cand.transform.x - startTransforms.get(primaryId).x;
  const snapDy = cand.transform.y - startTransforms.get(primaryId).y;

  drag.ghost = cand.transform;
  drag.connection = cand.connection || null;
  drag.candidateMoves = movedIds.map((id) => ({ id, transform: { ...startTransforms.get(id), x: startTransforms.get(id).x + snapDx, y: startTransforms.get(id).y + snapDy } }));

  // Validate (all moves, atomic).
  drag.valid = drag.candidateMoves.every(({ id, transform }) => {
    const inst = plan.instances.find((i) => i.id === id);
    return inst ? validatePlacement(plan, inst, transform).valid : true;
  });

  // Update ghost element directly (no full re-render during drag).
  const ghostEl = svg.querySelector(".se-ghost");
  if (ghostEl) {
    ghostEl.setAttribute("transform", `translate(${drag.ghost.x} ${drag.ghost.y}) rotate(${drag.ghost.rotation || 0})`);
    ghostEl.classList.toggle("is-invalid", !drag.valid);
  }
}

function endObjectDrag() {
  if (!drag?.candidateMoves || !drag.active) { drag = null; return; }
  const moves = drag.candidateMoves;
  const connection = drag.connection;
  drag = null;

  if (moves.length) dispatch({ type: "MOVE_INSTANCES", moves }, { record: true });
  if (connection) {
    dispatch({
      type: "CONNECT",
      connection: {
        objectAId: moves[0].id,
        portA: connection.movingEdge,
        objectBId: connection.staticId,
        portB: connection.staticEdge,
      },
    }, { record: true });
  }
  render();
}

function beginPan(e) {
  drag = { mode: "pan", last: eventPos(e), active: true };
  svg.setPointerCapture(e.pointerId);
}
function updatePan(e) {
  const cur = eventPos(e);
  camera = panByScreen(camera, cur.x - drag.last.x, cur.y - drag.last.y);
  drag.last = cur;
  render();
}
function endPan() {
  drag = null;
}

function handleSeatClick(instanceId, seatId) {
  // If a guest was pre-selected in the sidebar, assign them directly.
  if (pendingGuest) {
    const guestId = pendingGuest;
    log(`assign pending guest ${guestId} → ${instanceId}/${seatId}`);
    dispatch({ type: "ASSIGN_GUEST", instanceId, seatId, guestId }, { record: true });
    pendingGuest = null;
    render();
    return;
  }
  openGuestPicker(instanceId, seatId);
}

function onPointerDown(e) {
  const target = findInstanceTarget(e);
  if (target) {
    if (target.seatId) {
      handleSeatClick(target.instanceId, target.seatId);
      return;
    }
    if (!e.shiftKey && !selection.has(target.instanceId)) selectOnly([target.instanceId]);
    else if (e.shiftKey) {
      const next = new Set(selection);
      if (next.has(target.instanceId)) next.delete(target.instanceId); else next.add(target.instanceId);
      selection = next;
      render();
    }
    beginObjectDrag(target.instanceId, e);
  } else {
    if (!e.shiftKey) selection = new Set();
    beginPan(e);
  }
}

function onPointerMove(e) {
  if (!drag?.active) return;
  if (drag.mode === "pan") updatePan(e);
  else if (drag.mode === "object") updateObjectDrag(e);
}

function onPointerUp(e) {
  if (drag?.mode === "object") endObjectDrag();
  else if (drag?.mode === "pan") endPan();
}

function onWheel(e) {
  e.preventDefault();
  const pos = eventPos(e);
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  camera = zoomAt(camera, camera.pxPerMeter * factor, pos);
  render();
}

function onKeyDown(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) { const r = history.redo(); if (r) { plan = reducePlan(plan, r.action); render(); schedulePersist(); } }
    else { const u = history.undo(); if (u) { plan = reducePlan(plan, u.action); render(); schedulePersist(); } }
    return;
  }
  if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); const r = history.redo(); if (r) { plan = reducePlan(plan, r.action); render(); schedulePersist(); } return; }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeSelection(); return; }
  if (e.key.toLowerCase() === "r") { rotateSelection(90); return; }
  if (e.key.toLowerCase() === "d" && mod) { e.preventDefault(); duplicateSelection(); return; }
  if (e.key.toLowerCase() === "g" && mod) { e.preventDefault(); if (e.shiftKey) ungroupSelection(); else groupSelection(); return; }
  if (e.key === "Escape") { selection = new Set(); render(); }
}

// ── Public entry ─────────────────────────────────────────────────────────

export async function loadSpatialEditor(root) {
  container = root;
  if (initialized) {
    render();
    renderSaveStatus();
    return;
  }
  initialized = true;

  root.innerHTML = `
    <div class="se-layout" data-se-layout>
      <aside class="se-sidebar" data-se-sidebar></aside>
      <div class="se-resizer" data-se-resizer title="Arrastrar para redimensionar"></div>
      <div class="se-main">
        <div class="se-toolbar">
          <button class="se-btn" data-undo type="button" title="Deshacer (Ctrl+Z)">↶</button>
          <button class="se-btn" data-redo type="button" title="Rehacer (Ctrl+Shift+Z)">↷</button>
          <button class="se-btn" data-rotate type="button" title="Rotar 90° (R)">⟳ 90°</button>
          <button class="se-btn" data-group type="button" title="Agrupar (Ctrl+G)">Agrupar</button>
          <button class="se-btn" data-ungroup type="button" title="Desagrupar (Ctrl+Shift+G)">Desagrupar</button>
          <button class="se-btn" data-duplicate type="button" title="Duplicar (Ctrl+D)">Duplicar</button>
          <button class="se-btn" data-delete type="button" title="Eliminar (Supr)">Eliminar</button>
          <button class="se-btn" data-venue type="button" title="Tamaño del salón">⛶ Salón</button>
          <button class="se-btn" data-grid-toggle type="button" title="Mostrar/ocultar la cuadrícula"># Cuadrícula</button>
          <button class="se-btn" data-zoom-out title="Alejar">−</button>
          <button class="se-btn" data-zoom-in title="Acercar">＋</button>
          <span class="se-save" data-se-save></span>
        </div>
        <div class="se-canvas-wrap">
          <svg class="se-canvas" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>
        <div class="se-legend">Arrastra un objeto del catálogo al salón · Arrastra una mesa para moverla · Rueda para zoom · Arrastra el fondo para desplazar · Haz clic en un asiento para asignar invitado</div>
      </div>
    </div>`;

  svg = root.querySelector(".se-canvas");

  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", onPointerUp);
  svg.addEventListener("pointercancel", onPointerUp);
  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("dragover", onCanvasDragOver);
  svg.addEventListener("drop", onCanvasDrop);
  document.addEventListener("keydown", onKeyDown);

  // Toolbar wiring (delegated).
  root.querySelector("[data-undo]").addEventListener("click", () => { const r = history.undo(); if (r) { plan = reducePlan(plan, r.action); render(); schedulePersist(); } });
  root.querySelector("[data-redo]").addEventListener("click", () => { const r = history.redo(); if (r) { plan = reducePlan(plan, r.action); render(); schedulePersist(); } });
  root.querySelector("[data-rotate]").addEventListener("click", () => rotateSelection(90));
  root.querySelector("[data-group]").addEventListener("click", groupSelection);
  root.querySelector("[data-ungroup]").addEventListener("click", ungroupSelection);
  root.querySelector("[data-duplicate]").addEventListener("click", duplicateSelection);
  root.querySelector("[data-delete]").addEventListener("click", removeSelection);
  root.querySelector("[data-zoom-in]").addEventListener("click", () => { const { w, h } = svgSize(); camera = zoomAt(camera, camera.pxPerMeter * 1.25, { x: w / 2, y: h / 2 }); render(); });
  root.querySelector("[data-zoom-out]").addEventListener("click", () => { const { w, h } = svgSize(); camera = zoomAt(camera, camera.pxPerMeter / 1.25, { x: w / 2, y: h / 2 }); render(); });
  root.querySelector("[data-venue]").addEventListener("click", openVenueModal);
  root.querySelector("[data-grid-toggle]").addEventListener("click", () => {
    showGrid = !showGrid;
    log(`grid visibility: ${showGrid ? "on" : "off"}`);
    render();
  });

  // Draggable divider between sidebar and canvas.
  const layoutEl = root.querySelector("[data-se-layout]");
  const resizerEl = root.querySelector("[data-se-resizer]");
  if (layoutEl && resizerEl) {
    let resizing = false;
    const MIN_W = 200;
    const MAX_W = 620;

    resizerEl.addEventListener("pointerdown", (e) => {
      resizing = true;
      resizerEl.setPointerCapture(e.pointerId);
      layoutEl.classList.add("is-resizing");
      e.preventDefault();
    });
    resizerEl.addEventListener("pointermove", (e) => {
      if (!resizing) return;
      const rect = layoutEl.getBoundingClientRect();
      const width = Math.min(MAX_W, Math.max(MIN_W, e.clientX - rect.left));
      layoutEl.style.setProperty("--sidebar-width", `${width}px`);
    });
    const stopResize = () => {
      if (!resizing) return;
      resizing = false;
      layoutEl.classList.remove("is-resizing");
    };
    resizerEl.addEventListener("pointerup", stopResize);
    resizerEl.addEventListener("pointercancel", stopResize);
  }

  // Catalog event delegation (click + dragstart + slot drag-drop).
  const sidebar = root.querySelector("[data-se-sidebar]");
  sidebar.addEventListener("dragstart", onCatalogDragStart);
  sidebar.addEventListener("dragover", onSlotDragOver);
  sidebar.addEventListener("drop", onSlotDrop);
  sidebar.addEventListener("dragover", onReorderDragOver);
  sidebar.addEventListener("drop", onReorderDrop);
  sidebar.addEventListener("dragend", () => { reorderDragId = null; });
  sidebar.addEventListener("click", (e) => {
    // Remove guest assignment from a slot.
    const unassignBtn = e.target.closest("[data-unassign-instance]");
    if (unassignBtn) {
      const instanceId = unassignBtn.dataset.unassignInstance;
      const seatId = unassignBtn.dataset.unassignSeat;
      const guestId = plan.guestAssignments?.[instanceId]?.[seatId];
      console.log(`[spatialEditor] unassign:start ${instanceId}/${seatId} (guest=${guestId})`, summarizeAssignments());
      const ok = dispatch({ type: "UNASSIGN_GUEST", instanceId, seatId }, { record: true });
      console.log(`[spatialEditor] unassign:done ok=${ok} stillAssigned=${Boolean(plan.guestAssignments?.[instanceId]?.[seatId])}`, summarizeAssignments());
      return;
    }
    // Click a seat slot (left pane) → open the find-guest modal to reassign it.
    const slotOpen = e.target.closest("[data-slot-open]");
    if (slotOpen) {
      const [instanceId, seatId] = slotOpen.dataset.slotOpen.split("|");
      if (instanceId && seatId) {
        pendingGuest = null;
        openGuestPicker(instanceId, seatId);
        return;
      }
    }
    const addBtn = e.target.closest("[data-add-def]");
    if (addBtn) { addInstance(addBtn.dataset.addDef); return; }
    const dedupeBtn = e.target.closest("[data-dedupe-guests]");
    if (dedupeBtn) {
      dispatch({ type: "DEDUPE_GUESTS" }, { record: true });
      return;
    }
    const editBtn = e.target.closest("[data-edit-def]");
    if (editBtn) { openCustomDefModal(editBtn.dataset.editDef); return; }
    const delBtn = e.target.closest("[data-delete-def]");
    if (delBtn) {
      const def = findDefinition(plan, delBtn.dataset.deleteDef);
      if (!def) return;
      const res = canDeleteDefinition(def, plan.instances);
      if (!res.canDelete) {
        window.alert(res.reason === "system"
          ? "No se puede eliminar un objeto del sistema."
          : `No se puede eliminar este objeto: está en uso por ${res.usage} instancias.`);
        return;
      }
      dispatch({ type: "DELETE_DEFINITION", id: def.id });
      return;
    }
    const newBtn = e.target.closest("[data-new-custom]");
    if (newBtn) { openCustomDefModal(); return; }

    // Real instance actions.
    const delInstBtn = e.target.closest("[data-del-instance]");
    if (delInstBtn) {
      dispatch({ type: "REMOVE_INSTANCE", id: delInstBtn.dataset.delInstance }, { record: true });
      return;
    }
    const focusBtn = e.target.closest("[data-focus-instance]");
    if (focusBtn) {
      focusInstance(focusBtn.dataset.focusInstance);
      return;
    }
    const autoPlaceBtn = e.target.closest("[data-auto-place]");
    if (autoPlaceBtn) {
      autoPlaceInstance(autoPlaceBtn.dataset.autoPlace);
      return;
    }
    const reorderBtn = e.target.closest("[data-reorder-instance][data-dir]");
    if (reorderBtn) {
      dispatch({ type: "REORDER_INSTANCES", id: reorderBtn.dataset.reorderInstance, dir: reorderBtn.dataset.dir }, { record: true });
      return;
    }

    // Guest pre-select.
    const guestPick = e.target.closest("[data-guest-pick]");
    if (guestPick) {
      pendingGuest = pendingGuest === guestPick.dataset.guestPick ? null : guestPick.dataset.guestPick;
      log(`guest pre-selected: ${pendingGuest}`);
      renderPanel();
      return;
    }
    const clearPending = e.target.closest("[data-clear-pending]");
    if (clearPending) {
      pendingGuest = null;
      renderPanel();
      return;
    }

    // Toggle an instance's seat list (inline button, no dedicated line).
    const toggleBtn = e.target.closest("[data-toggle-slots]");
    if (toggleBtn) {
      const list = sidebar.querySelector(`[data-slots-list="${toggleBtn.dataset.toggleSlots}"]`);
      if (list) {
        const willOpen = list.hidden;
        list.hidden = !willOpen;
        toggleBtn.setAttribute("aria-expanded", String(willOpen));
        toggleBtn.textContent = willOpen ? "▾" : "▸";
      }
      return;
    }

    // Rename instance.
    const renameBtn = e.target.closest("[data-rename-instance]");
    if (renameBtn) {
      renameInstance(renameBtn.dataset.renameInstance);
      return;
    }
    // Rename zone (sidebar control).
    const renameZoneBtn = e.target.closest("[data-rename-zone-sidebar]");
    if (renameZoneBtn) {
      renameZone(renameZoneBtn.dataset.renameZoneSidebar);
    }
  });

  // Guest filter checkboxes.
  sidebar.addEventListener("change", (e) => {
    if (e.target.matches?.("[data-filter-unassigned]")) {
      showOnlyUnassigned = e.target.checked;
      log(`filter unassigned: ${showOnlyUnassigned}`);
      renderPanel();
      return;
    }
    if (e.target.matches?.("[data-filter-sat5]")) {
      showOnlySat5 = e.target.checked;
      log(`filter sat5: ${showOnlySat5}`);
      renderPanel();
    }
    if (e.target.matches?.("[data-filter-children]")) {
      showOnlyChildren = e.target.checked;
      log(`filter children: ${showOnlyChildren}`);
      renderPanel();
    }
  });

  // Guest filter (input).
  sidebar.addEventListener("input", (e) => {
    const filter = e.target.closest?.("[data-guest-filter]");
    if (!filter) return;
    const q = filter.value.toLowerCase();
    sidebar.querySelectorAll("[data-guest-pick]").forEach((el) => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });

  // Load the authoritative plan + the DB-backed object catalog.
  const loaded = await loadPlan();
  let catalogDefs = [];
  try {
    catalogDefs = await loadCatalogDefinitions();
  } catch (err) {
    console.warn("[spatialEditor] could not load catalog definitions", err);
  }
  // Fall back to the hardcoded built-ins if the catalog collection is empty
  // (e.g. before the seed script has run).
  const builtIns = catalogDefs.length ? catalogDefs : [...SYSTEM_DEFINITIONS, ...PROVIDER_DEFINITIONS];
  if (loaded && loaded.instances) {
    const customDefs = (loaded.definitions || []).filter((d) => !isSystemDefinition(d));
    plan = { ...createPlan(), ...loaded, definitions: [...builtIns, ...customDefs] };
  } else {
    plan = createPlan();
    plan.definitions = [...builtIns];
  }
  // Only now is `plan` authoritative — allow autosave/unload writes.
  planLoaded = true;

  if (loaded && loaded.instances?.length) fitPlanToView();
  render();
  renderSaveStatus();
}

export function renderSpatialEditor(root, injected = {}) {
  loadSpatialEditor(root, injected);
}

export default { loadSpatialEditor, renderSpatialEditor };