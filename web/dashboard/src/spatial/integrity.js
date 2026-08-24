// integrity.js — pure seating-integrity checks for the spatial plan.
// Detects the inconsistencies the couple cares about:
//   1. duplicated guests (one guest in multiple seats),
//   2. guests confirmed for Saturday but with NO seat,
//   3. guests NOT confirmed for Saturday but WITH a seat.
// No Firestore / React / DOM.

/**
 * @param {object} opts
 * @param {Object<string, Object<string, string>>} opts.guestAssignments  plan.guestAssignments
 * @param {Array<object|string>} opts.allGuests  all active guests (or ids)
 * @param {(guest:any)=>number} opts.getSaturdayLevel  RSVP saturday scale (0–5)
 * @returns {{ duplicated: Array, satYesNoSeat: Array, satNoWithSeat: Array, seatedCount: number }}
 */
export function computeSeatingIntegrity({ guestAssignments = {}, allGuests = [], getSaturdayLevel = () => null }) {
  const seated = new Map(); // guestId -> [ "instance/seat", ... ]
  for (const [iid, seats] of Object.entries(guestAssignments || {})) {
    for (const [sid, gid] of Object.entries(seats || {})) {
      if (gid == null) continue;
      if (!seated.has(gid)) seated.set(gid, []);
      seated.get(gid).push(`${iid}/${sid}`);
    }
  }

  const duplicated = [...seated.entries()]
    .filter(([, locs]) => locs.length > 1)
    .map(([guestId, seats]) => ({ guestId, seats }));

  const satYesNoSeat = [];
  const satNoWithSeat = [];
  for (const g of allGuests || []) {
    const id = typeof g === "string" ? g : g?.id;
    if (!id) continue;
    const lvl = Number(getSaturdayLevel(g)) || 0;
    const hasSeat = seated.has(id);
    if (lvl >= 4 && !hasSeat) satYesNoSeat.push(id); // confirmed Saturday, no seat
    if (lvl >= 1 && lvl < 4 && hasSeat) satNoWithSeat.push(id); // not confirmed, but seated
  }

  return { duplicated, satYesNoSeat, satNoWithSeat, seatedCount: seated.size };
}

export default { computeSeatingIntegrity };
