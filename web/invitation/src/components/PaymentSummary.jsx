import React from "react";
import { getActiveGuests } from "../guests.js";
import { resolveLiveGuest, resolveGuestName } from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomDescription } from "../rooms.js";
import { Avatar } from "../features/identity/Avatar.jsx";


const MXN_PER_EUR = 20;

export function formatPrice(amount, language) {

  const locale =
    language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    amount,
  );
}

/* Two-line price block: line 1 shows MXN, line 2 shows EUR. When the stay is
   covered by the couple, each line shows the original price struck through
   next to the discounted price to pay (red); otherwise it shows the plain
   price. Mirrors the e-commerce "on sale" pattern used in StayPlanCard. */
function PriceLines({ original, toPay, language, showSale }) {
  return (
    <>
      <span className="rsvp-payment-line">
        {showSale && (
          <span className="rsvp-payment-original">
            {formatPrice(original, language)} MXN
          </span>
        )}
        <strong>{formatPrice(toPay, language)} MXN</strong>
      </span>
      <span className="rsvp-payment-line">
        {showSale && (
          <span className="rsvp-payment-original">
            ≈ {formatPrice(original / MXN_PER_EUR, language)} €
          </span>
        )}
        <small>≈ {formatPrice(toPay / MXN_PER_EUR, language)} €</small>
      </span>
    </>
  );
}

/**
 * Compute the per-person and per-group amounts for a given stay (primary cabin
 * or extra cabin), following the same pricing rules as StayPlanCard:
 *
 *   - per-person price = cabin total ÷ number of occupants (capped at capacity)
 *   - per-person to pay = 0 when the current guest is covered by the couple
 *   - group total = sum of per-person prices across all group members
 *   - group to pay = group total − covered total
 *
 * The stay is described by two resolvers so the same logic drives either the
 * primary cabin (`hosting.cabin` / `isCabinPaidByNovios`) or the extra cabin
 * (`hosting.xtraCabin` / `isXtraCabinPaidByNovios`):
 *   - getAssignedCabinId(candidate) → cabin id for this stay
 *   - resolveMemberCovered(member)  → whether this stay is paid by the couple
 *
 * Returns null when the active member has no cabin assigned for this stay.
 */
export function computeStayAmounts({
  activeMember,
  groupMembers,
  getAssignedCabinId,
  resolveMemberCovered,
}) {
  const activeGuests = getActiveGuests();

  const cabinPerPersonPrice = (cabinObj, occupantCount) => {
    if (!cabinObj?.totalPrice2Nights) return 0;
    const capacity = cabinObj.capacity || 1;
    const divisor = occupantCount > 0 ? occupantCount : 1;
    return cabinObj.totalPrice2Nights / divisor;
  };

  // Number of active guests assigned to a given cabin for this stay.
  const cabinOccupantCount = (cabinId) =>
    activeGuests.filter(
      (candidate) => getAssignedCabinId(candidate) === cabinId,
    ).length;

  const liveActive = resolveLiveGuest(activeMember) || activeMember;
  const assignedCabin = getAssignedCabinId(liveActive);
  const cabin = getCabin(assignedCabin);
  if (!cabin) return null;

  const cabinOccupants = activeGuests.filter(
    (candidate) => getAssignedCabinId(candidate) === assignedCabin,
  );
  const activeCabinPerPerson = cabinPerPersonPrice(
    cabin,
    cabinOccupants.length,
  );
  const paidByCouple = resolveMemberCovered(liveActive);

  // Per-person to pay: 0 when the current guest is covered by the couple.
  const perPersonToPay = paidByCouple ? 0 : activeCabinPerPerson;

  // ── Group accommodation totals ─────────────────────────────────────────
  const groupTotal = groupMembers.reduce((sum, member) => {
    const memberCabin = getCabin(getAssignedCabinId(member));
    const memberCount = memberCabin ? cabinOccupantCount(memberCabin.id) : 0;
    return sum + cabinPerPersonPrice(memberCabin, memberCount);
  }, 0);

  const coveredTotal = groupMembers.reduce((sum, member) => {
    const memberCabin = getCabin(getAssignedCabinId(member));
    const memberCovered = resolveMemberCovered(member);
    const memberCount = memberCabin ? cabinOccupantCount(memberCabin.id) : 0;
    return sum + (memberCovered ? cabinPerPersonPrice(memberCabin, memberCount) : 0);
  }, 0);

  const groupToPay = Math.max(0, groupTotal - coveredTotal);
  const anyCovered = groupMembers.some(resolveMemberCovered);

  return {
    cabin,
    assignedCabin,
    liveActive,
    activeCabinPerPerson,
    paidByCouple,
    perPersonToPay,
    groupTotal,
    coveredTotal,
    groupToPay,
    anyCovered,
    perPersonSale: paidByCouple && perPersonToPay < activeCabinPerPerson,
    groupSale: anyCovered && groupToPay < groupTotal,
  };
}

/**
 * Resolve a human-readable "Cabin · Room" label for a candidate on a given
 * stay. Falls back to just the cabin name when no room is assigned.
 */
function resolveCabinRoomLabel(candidate, getAssignedCabinId, getAssignedRoomId, language) {
  const cabinId = getAssignedCabinId(candidate);
  const cabin = getCabin(cabinId);
  const cabinName = cabin?.name || cabin?.id || cabinId || "";

  const roomId = getAssignedRoomId ? getAssignedRoomId(candidate) : null;
  const room = roomId ? getRoom(roomId) : null;
  const roomName = room ? getRoomDescription(room, language) : "";

  if (cabinName && roomName) return `${cabinName} · ${roomName}`;
  return cabinName || roomName || "";
}

/**
 * Read-only "À payer" summary block shown in the final RSVP. It renders the
 * per-person and per-group amounts for a given stay (primary cabin or extra
 * cabin), following the same pricing rules as StayPlanCard.
 *
 * When a price differs from its original (i.e. someone is covered), the block
 * shows the original struck through next to the discounted price and a
 * "covered by the couple" banner, following e-commerce sale conventions.
 *
 * The stay is described by two resolvers so the same component drives either
 * the primary cabin (`hosting.cabin` / `isCabinPaidByNovios`) or the extra
 * cabin (`hosting.xtraCabin` / `isXtraCabinPaidByNovios`):
 *   - getAssignedCabinId(candidate) → cabin id for this stay
 *   - getAssignedRoomId(candidate)  → room id for this stay (optional)
 *   - resolveMemberCovered(member)  → whether this stay is paid by the couple
 */
export function PaymentSummary({
  activeMember,
  groupMembers,
  getAssignedCabinId,
  getAssignedRoomId,
  resolveMemberCovered,
  language,
  payment,
  coveredLabel,
}) {
  const amounts = computeStayAmounts({
    activeMember,
    groupMembers,
    getAssignedCabinId,
    resolveMemberCovered,
  });
  if (!amounts) return null;

  const {
    activeCabinPerPerson,
    paidByCouple,
    perPersonToPay,
    groupTotal,
    groupToPay,
    anyCovered,
    perPersonSale,
    groupSale,
  } = amounts;

  // The active guest's own cabin · room label.
  const activeLabel = resolveCabinRoomLabel(
    amounts.liveActive,
    getAssignedCabinId,
    getAssignedRoomId,
    language,
  );

  // The active guest's first name, used to personalise the per-person label.
  const { firstName: activeFirstName } = resolveGuestName(amounts.liveActive);

  // One "Cabin · Room" label per group member (deduplicated, in order).
  const groupLabels = [];
  groupMembers.forEach((member) => {
    const label = resolveCabinRoomLabel(
      member,
      getAssignedCabinId,
      getAssignedRoomId,
      language,
    );
    if (label && !groupLabels.includes(label)) groupLabels.push(label);
  });

  return (
    <div className="rsvp-payment-block">
      <h4 className="rsvp-payment-block-title">{payment.cabinTitle}</h4>
      <dl className="rsvp-payment-rows">
        <div className="rsvp-payment-row">
          <dt>
            <span className="rsvp-payment-label-text">
              {payment.perPerson.replace("{name}", activeFirstName || "")}
            </span>
            <span className="rsvp-payment-label-avatar">
              <Avatar guest={amounts.liveActive} size={28} />
            </span>
          </dt>
          <dd className={`rsvp-payment-value${perPersonSale ? " is-sale" : ""}`}>
            {activeLabel && (
              <span className="rsvp-payment-cabinroom">{activeLabel}</span>
            )}
            <PriceLines
              original={activeCabinPerPerson}
              toPay={perPersonToPay}
              language={language}
              showSale={perPersonSale}
            />
            {paidByCouple && <em>{coveredLabel}</em>}
          </dd>
        </div>
        {/* The per-group row only makes sense when the group has more than one
            person; with a single guest it would just duplicate the per-person
            amount. */}
        {groupMembers.length > 1 && (
          <div className="rsvp-payment-row">
            <dt>
              <span className="rsvp-payment-label-text">{payment.perGroup}</span>
              <span className="rsvp-payment-label-avatar rsvp-payment-label-avatar--stack">
                {groupMembers.map((member) => (
                  <Avatar key={member.id} guest={member} size={28} />
                ))}
              </span>
            </dt>
            <dd className={`rsvp-payment-value${groupSale ? " is-sale" : ""}`}>
              {groupLabels.length > 0 && (
                <span className="rsvp-payment-cabinroom-list">
                  {groupLabels.map((label) => (
                    <span key={label} className="rsvp-payment-cabinroom">
                      {label}
                    </span>
                  ))}
                </span>
              )}
              <PriceLines
                original={groupTotal}
                toPay={groupToPay}
                language={language}
                showSale={groupSale}
              />
              {anyCovered && <em>{coveredLabel}</em>}
            </dd>
          </div>
        )}


      </dl>
    </div>
  );
}

