// ─────────────────────────────────────────────────────────────────────────
// Tables manager — real-life 30m × 6m seating canvas.
//
// The main canvas represents the actual banquet hall floor at real-life
// dimensions (30 m wide × 6 m tall). The NOVIOS banquet table (22 guests,
// 11 north + 11 south) sits centered horizontally; the remaining round
// tables of 10 are distributed evenly — 6 on the left, 6 on the right.
// A 14th table lives on a secondary canvas (e.g. a separate room).
//
// Data model (Firestore `tables` collection):
//   id, name, shape ("round"|"rectangle"|"square"), capacity,
//   slots (object), x, y, rotation, guestIds (array)
// ─────────────────────────────────────────────────────────────────────────

import { collection, doc, setDoc, onSnapshot, limit, query } from "firebase/firestore";
import { db } from "./firebase.js";
import { getGuest } from "./guests.js";
import { collections } from "../../shared/firestore-paths.js";

// ── Real-life canvas dimensions (meters) ────────────────────────────────
const CANVAS_W = 30; // 30 m wide
const CANVAS_H = 6; // 6 m tall

// Round table diameter for 10 guests (meters) — a standard 10-seat round.
const ROUND_DIAM = 1.8;

// NOVIOS banquet table dimensions (meters).
const NOVIOS_W = 7; // length
const NOVIOS_H = 1.5; // width

// How many round tables of 10 go on each side of the NOVIOS table.
const ROUNDS_PER_SIDE = 6;

// The NOVIOS table holds 22 guests (11 north + 11 south).
const NOVIOS_CAPACITY = 22;

// ── Module state ────────────────────────────────────────────────────────
let tables = [];
let unsub = null;

// ── Helpers ─────────────────────────────────────────────────────────────

function guestFullName(guest) {
  if (!guest) return "";
  const identity = guest.identity || {};
  return [
    identity.firstName || guest.firstName,
    identity.middleName || guest.middleName,
    identity.lastName || guest.lastName,
    identity.maternalLastName || guest.maternalLastName,
  ].filter(Boolean).join(" ");
}

function guestAvatarUrl(guest) {
  const id = guest?.identity?.cloudinaryId || guest?.cloudinaryId;
  if (!id) return "";
  return `https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${id}`;
}

function isNoviosTable(table) {
  return (
    table.capacity >= NOVIOS_CAPACITY ||
    /novios/i.test(table.name || "") ||
    /^22$/i.test(String(table.id || ""))
  );
}

function tableShape(table) {
  // "Mesa N" tables are always square (matches the dashboard convention).
  if (/^Mesa\s+\d+$/i.test(table.name || "")) return "square";
  return table.shape || (isNoviosTable(table) ? "rectangle" : "round");
}

// ── Real-life layout ────────────────────────────────────────────────────
// Returns { x, y } in meters for the CENTER of a table, based on its role.
// The NOVIOS table is centered horizontally; round tables fan out evenly
// to the left and right.

// The main canvas holds the NOVIOS table + up to 12 round tables (6 per side).
// Any round table beyond that (the 14th) is treated as the secondary table.
function isSecondaryTable(table) {
  if (isNoviosTable(table)) return false;
  const rounds = tables.filter((t) => !isNoviosTable(t));
  const roundIndex = rounds.indexOf(table);
  return roundIndex >= ROUNDS_PER_SIDE * 2;
}

function computeLayout(table) {
  const shape = tableShape(table);

  if (isNoviosTable(table)) {
    // Centered horizontally, vertically centered.
    return { x: CANVAS_W / 2, y: CANVAS_H / 2, shape };
  }

  // Round tables: split into left (first half) and right (second half).
  const rounds = tables.filter((t) => !isNoviosTable(t));
  const roundIndex = rounds.indexOf(table);

  // The secondary table (beyond the 12 main rounds) is centered on its own
  // canvas.
  if (roundIndex >= ROUNDS_PER_SIDE * 2) {
    return { x: CANVAS_W / 2, y: CANVAS_H / 2, shape };
  }

  const side = roundIndex < ROUNDS_PER_SIDE ? "left" : "right";
  const localIndex = roundIndex % ROUNDS_PER_SIDE;

  // 2 columns × 3 rows per side.
  const col = localIndex % 2;
  const row = Math.floor(localIndex / 2);

  // Left side occupies x ∈ [1, 10.5]; right side x ∈ [19.5, 29].
  const leftXs = [3, 7.5];
  const rightXs = [22.5, 27];
  const xs = side === "left" ? leftXs : rightXs;

  // Rows spread across the 6 m height (with margin for the 1.8 m diameter).
  const rows = [1.5, 3, 4.5];

  return {
    x: xs[col],
    y: rows[row],
    shape,
  };
}

// ── Seat positions ──────────────────────────────────────────────────────
// Returns an array of { x, y } seat positions (in meters, relative to the
// table's center) for a table with the given capacity and shape.

function tableSeatPos(shape, capacity) {
  const seats = [];
  if (shape === "round") {
    const radius = ROUND_DIAM / 2;
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
      seats.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
  } else if (shape === "rectangle") {
    // Two rows along the long edges (north/south). For the NOVIOS table,
    // 11 north + 11 south. For other rectangles, split evenly.
    const half = Math.ceil(capacity / 2);
    const length = NOVIOS_W / 2;
    const width = NOVIOS_H / 2;
    for (let i = 0; i < half; i++) {
      const t = half === 1 ? 0 : (i / (half - 1)) * 2 - 1;
      seats.push({ x: t * length, y: -width });
    }
    for (let i = 0; i < capacity - half; i++) {
      const t = capacity - half === 1 ? 0 : (i / (capacity - half - 1)) * 2 - 1;
      seats.push({ x: t * length, y: width });
    }
  } else {
    // square: seats around the 4 edges.
    const side = 1.4;
    const perSide = Math.max(1, Math.round(capacity / 4));
    const positions = [];
    for (let i = 0; i < perSide; i++) {
      const t = perSide === 1 ? 0 : (i / (perSide - 1)) * 2 - 1;
      positions.push({ x: t * (side / 2), y: -side / 2 }); // top
      positions.push({ x: side / 2, y: t * (side / 2) }); // right
      positions.push({ x: t * (side / 2), y: side / 2 }); // bottom
      positions.push({ x: -side / 2, y: t * (side / 2) }); // left
    }
    for (let i = 0; i < capacity; i++) {
      seats.push(positions[i % positions.length]);
    }
  }
  return seats;
}

// ── Rendering ───────────────────────────────────────────────────────────

function renderTableCard(table, pxPerMeter, isSecondary) {
  const shape = tableShape(table);
  const layout = computeLayout(table);
  const centerX = layout.x * pxPerMeter;
  const centerY = layout.y * pxPerMeter;

  const isNovios = isNoviosTable(table);
  const width = isNovios ? NOVIOS_W * pxPerMeter : ROUND_DIAM * pxPerMeter;
  const height = isNovios ? NOVIOS_H * pxPerMeter : ROUND_DIAM * pxPerMeter;

  const seats = tableSeatPos(shape, table.capacity || 10);
  const guests = (table.guestIds || [])
    .map((id) => getGuest(id))
    .filter(Boolean);

  const seatHtml = seats
    .map((seat, i) => {
      const guest = guests[i];
      const avatar = guest ? guestAvatarUrl(guest) : "";
      const name = guest ? guestFullName(guest) : "";
      return `
        <div class="dashboard-table-seat"
          style="left:${seat.x * pxPerMeter + width / 2}px;top:${seat.y * pxPerMeter + height / 2}px;"
          title="${name || `Asiento ${i + 1}`}"
          data-seat-index="${i}"
          data-table-id="${table.id}">
          ${avatar ? `<img src="${avatar}" alt="" />` : `<span>${i + 1}</span>`}
        </div>
      `;
    })
    .join("");

  return `
    <div class="dashboard-table-card ${isNovios ? "is-novios" : ""} ${isSecondary ? "is-secondary" : ""}"
      style="left:${centerX - width / 2}px;top:${centerY - height / 2}px;width:${width}px;height:${height}px;"
      data-table-id="${table.id}"
      data-table-shape="${shape}"
      draggable="true">
      <div class="dashboard-table-label">
        <strong>${table.name || table.id}</strong>
        <span>${guests.length}/${table.capacity || 10}</span>
      </div>
      <div class="dashboard-table-seats">${seatHtml}</div>
    </div>
  `;
}

function renderCanvas(container, isSecondary) {
  const canvas = document.createElement("div");
  canvas.className = `dashboard-tables-canvas ${isSecondary ? "is-secondary" : ""}`;
  canvas.style.aspectRatio = `${CANVAS_W} / ${CANVAS_H}`;

  // Scale: fit the canvas width to the container.
  const pxPerMeter = isSecondary ? 12 : 20;

  const relevant = isSecondary
    ? tables.filter((t) => isSecondaryTable(t))
    : tables.filter((t) => !isSecondaryTable(t));

  canvas.innerHTML = `
    <div class="dashboard-tables-canvas-inner" style="width:${CANVAS_W * pxPerMeter}px;height:${CANVAS_H * pxPerMeter}px;">
      <div class="dashboard-tables-dimensions">
        <span>${CANVAS_W} m</span>
        <span>${CANVAS_H} m</span>
      </div>
      ${relevant.map((t) => renderTableCard(t, pxPerMeter, isSecondary)).join("")}
    </div>
  `;

  return canvas;
}

export function renderTablesManager(container) {
  container.innerHTML = `
    <div class="dashboard-tables-toolbar">
      <div class="dashboard-tables-toolbar-info">
        <strong>Salón principal</strong>
        <span>30 m × 6 m · Mesa de novios al centro · 6 mesas redondas a cada lado</span>
      </div>
      <button class="dashboard-button dashboard-button-secondary" type="button" data-auto-layout>Auto-ordenar</button>
    </div>
    <div class="dashboard-tables-main" data-tables-main></div>
    <div class="dashboard-tables-secondary-heading">
      <strong>Salón secundario</strong>
      <span>Mesa adicional</span>
    </div>
    <div class="dashboard-tables-secondary" data-tables-secondary></div>
  `;

  const main = container.querySelector("[data-tables-main]");
  const secondary = container.querySelector("[data-tables-secondary]");

  main.replaceChildren(renderCanvas(main, false));
  secondary.replaceChildren(renderCanvas(secondary, true));

  // ── Auto-layout: persist computed positions ──
  container.querySelector("[data-auto-layout]")?.addEventListener("click", async () => {
    const pxPerMeter = 20;
    for (const table of tables) {
      const layout = computeLayout(table);
      const payload = {
        x: layout.x,
        y: layout.y,
        shape: layout.shape,
        updatedAt: new Date(),
      };
      try {
        await setDoc(doc(db, collections.tables, table.id), payload, { merge: true });
      } catch (err) {
        console.error("Failed to save table layout", err);
      }
    }
    renderTablesManager(container);
  });

  // ── Drag-and-drop reassignment ──
  container.querySelectorAll(".dashboard-table-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.tableId);
    });
  });
  container.querySelectorAll(".dashboard-table-seat").forEach((seat) => {
    seat.addEventListener("dragover", (e) => e.preventDefault());
    seat.addEventListener("drop", async (e) => {
      e.preventDefault();
      const fromTableId = e.dataTransfer.getData("text/plain");
      const toTableId = seat.dataset.tableId;
      const seatIndex = Number(seat.dataset.seatIndex);
      if (!fromTableId || fromTableId === toTableId) return;

      const fromTable = tables.find((t) => t.id === fromTableId);
      const toTable = tables.find((t) => t.id === toTableId);
      if (!fromTable || !toTable) return;

      const fromGuests = [...(fromTable.guestIds || [])];
      const toGuests = [...(toTable.guestIds || [])];
      const guestId = fromGuests.shift();
      if (!guestId) return;

      // Insert into the target seat, shifting others.
      toGuests.splice(Math.min(seatIndex, toGuests.length), 0, guestId);

      try {
        await setDoc(doc(db, collections.tables, fromTableId), { guestIds: fromGuests }, { merge: true });
        await setDoc(doc(db, collections.tables, toTableId), { guestIds: toGuests }, { merge: true });
        renderTablesManager(container);
      } catch (err) {
        console.error("Failed to move guest between tables", err);
      }
    });
  });
}

// ── Data loading ────────────────────────────────────────────────────────

export async function loadTables() {
  if (unsub) unsub();
  unsub = onSnapshot(
    query(collection(db, collections.tables), limit(100)),
    (snapshot) => {
      tables = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Re-render the tables panel if it exists.
      const container = document.querySelector("[data-table-assignments]");
      if (container) renderTablesManager(container);
    },
  );
}
