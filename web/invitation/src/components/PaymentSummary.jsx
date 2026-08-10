import React from "react";
import { getActiveGuests } from "../guests.js";
import { resolveLiveGuest } from "../guest-profiles.js";
import { getCabin } from "../cabins.js";

const MXN_PER_EUR = 20;

function formatPrice(amount, language) {
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
 * Read-only "À payer" summary block shown in the final RSVP. It renders the
 * per-person and per-group amounts for a given stay (primary cabin or extra
 * cabin), following the same pricing rules as StayPlanCard:
 *
 *   - per-person price = cabin total ÷ number of occupants (capped at capacity)
 *   - per-person to pay = 0 when the current guest is covered by the couple
 *   - group total = sum of per-person prices across all group members
 *   - group to pay = group total − covered total
 *
 * When a price differs from its original (i.e. someone is covered), the block
 * shows the original struck through next to the discounted price and a
 * "covered by the couple" banner, following e-commerce sale conventions.
 *
 * The stay is described by two resolvers so the same component drives either
 * the primary cabin (`hosting.cabin` / `isCabinPaidByNovios`) or the extra
 * cabin (`hosting.xtraCabin` / `isXtraCabinPaidByNovios`):
 *   - getAssignedCabinId(candidate) → cabin id for this stay
 *   - resolveMemberCovered(member)  → whether this stay is paid by the couple
 */
export function PaymentSummary({
  activeMember,
  groupMembers,
  getAssignedCabinId,
  resolveMemberCovered,
  language,
  payment,
  coveredLabel,
}) {
  const activeGuests = getActiveGuests();

  const cabinPerPersonPrice = (cabinObj, occupantCount) => {
    if (!cabinObj?.totalPrice2Nights) return 0;
    const capacity = cabinObj.capacity || 1;
    const divisor = Math.min(occupantCount, capacity);
    return divisor > 0 ? cabinObj.totalPrice2Nights / divisor : 0;
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

  const perPersonSale = paidByCouple && perPersonToPay < activeCabinPerPerson;
  const groupSale = anyCovered && groupToPay < groupTotal;

  return (
    <div className="rsvp-payment-block">
      <h4 className="rsvp-payment-block-title">{payment.cabinTitle}</h4>
      <dl className="rsvp-payment-rows">
        <div className="rsvp-payment-row">
          <dt>{payment.perPerson}</dt>
          <dd className={`rsvp-payment-value${perPersonSale ? " is-sale" : ""}`}>
            <PriceLines
              original={activeCabinPerPerson}
              toPay={perPersonToPay}
              language={language}
              showSale={perPersonSale}
            />
            {paidByCouple && <em>{coveredLabel}</em>}
          </dd>
        </div>
        <div className="rsvp-payment-row">
          <dt>{payment.perGroup}</dt>
          <dd className={`rsvp-payment-value${groupSale ? " is-sale" : ""}`}>
            <PriceLines
              original={groupTotal}
              toPay={groupToPay}
              language={language}
              showSale={groupSale}
            />
            {anyCovered && <em>{coveredLabel}</em>}
          </dd>
        </div>
      </dl>
    </div>
  );
}
