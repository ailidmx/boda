import React from "react";
import { getActiveGuests } from "../guests.js";
import { resolveLiveGuest, resolveGuestName } from "../guest-profiles.js";
import { getCabin } from "../cabins.js";
import { getRoom, getRoomDescription } from "../rooms.js";

const MXN_PER_EUR = 20;

function formatPrice(amount, language) {
  const locale = language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

/* Two-line price block: line 1 shows MXN, line 2 shows EUR. When the stay is
   covered by the couple, each line shows the original price struck through
   next to the discounted price to pay (red); otherwise it shows the plain
   price. */
function PriceLines({ original, toPay, language, showSale }) {
  return (
    <>
      <span className="accommodation-plan-line">
        {showSale && (
          <span className="accommodation-plan-original">
            {formatPrice(original, language)} MXN
          </span>
        )}
        <strong>{formatPrice(toPay, language)} MXN</strong>
      </span>
      <span className="accommodation-plan-line">
        {showSale && (
          <span className="accommodation-plan-original">
            ≈ {formatPrice(original / MXN_PER_EUR, language)} €
          </span>
        )}
        <small>≈ {formatPrice(toPay / MXN_PER_EUR, language)} €</small>
      </span>
    </>
  );
}

function AccommodationPrice({ original, toPay, language, covered = false, coveredLabel, showSale }) {
  const isSale = showSale ?? (covered && toPay < original);
  return (
    <dd className={`accommodation-price${isSale ? " is-sale" : ""}`}>
      <span className="accommodation-price-values">
        <PriceLines
          original={original}
          toPay={toPay}
          language={language}
          showSale={isSale}
        />
      </span>
      {covered && <em>{coveredLabel}</em>}
    </dd>
  );
}

/* Price block used inside the plan card rows. When the stay is covered by the
   couple it shows the original price struck through next to the discounted
   price to pay (red); otherwise it shows the plain price. */
function PlanPrice({ original, toPay, language, covered = false }) {
  const showSale = covered && toPay < original;
  return (
    <div className={`accommodation-plan-price${showSale ? " is-sale" : ""}`}>
      <PriceLines
        original={original}
        toPay={toPay}
        language={language}
        showSale={showSale}
      />
    </div>
  );
}

/**
 * Reusable "stay plan card + details" block used by both the Hébergement
 * section (primary stay, Fri→Sun) and the "Et après ?" section (extra stay,
 * Sun→Tue). It computes the dynamic per-person / group / cabin pricing for a
 * given stay and renders the plan card and the details list.
 *
 * The stay is described by three resolvers so the same component can drive
 * either the primary cabin (`hosting.cabin` / `isCabinPaidByNovios`) or the
 * extra cabin (`hosting.xtraCabin` / `isXtraCabinPaidByNovios`):
 *   - getAssignedCabinId(candidate)  → cabin id for this stay
 *   - getAssignedRoomId(candidate)   → room id for this stay
 *   - resolveMemberCovered(member)   → whether this stay is paid by the couple
 *   - resolveMemberPaid(member)      → whether this stay is already paid
 */
export function StayPlanCard({
  activeMember,
  groupMembers,
  getAssignedCabinId,
  getAssignedRoomId,
  resolveMemberCovered,
  resolveMemberPaid,
  option,
  language,
  showExtraCabinRow = false,
  extraCabin,
  extraRoom,
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
    activeGuests.filter((candidate) => getAssignedCabinId(candidate) === cabinId).length;

  // Active member's cabin / room for this stay.
  const liveActive = resolveLiveGuest(activeMember) || activeMember;
  const { firstName: activeFirstName } = resolveGuestName(liveActive);
  const assignedCabin = getAssignedCabinId(liveActive);
  const assignedRoom = getAssignedRoomId(liveActive);
  const room = assignedRoom ? getRoom(assignedRoom) : null;
  const roomDescription = getRoomDescription(room, language);
  const cabinId = room?.cabin || assignedCabin;
  const cabin = getCabin(cabinId);
  const cabinName = cabin?.name?.replace(/\s+/g, " ") || cabinId;

  const cabinArrangement = cabin?.isPrivate === true
    ? option.occupancy?.privada
    : cabin?.isPrivate === false
      ? option.occupancy?.compartida
      : option.occupancy?.[activeMember?.occupancy];
  const roomArrangement = room
    ? option.occupancy?.[room.isShared ? "compartida" : "privada"]
    : null;

  const paidByCouple = resolveMemberCovered(activeMember);
  const isPaid = resolveMemberPaid(activeMember);
  const paymentLabel = paidByCouple
    ? option.payment?.covered
    : isPaid || activeMember?.payment === "pagada"
      ? option.payment?.paid
      : option.payment?.pending;

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

  const priceToPay = Math.max(0, groupTotal - coveredTotal);
  const anyCovered = groupMembers.some(resolveMemberCovered);

  // ── Cabin total price across all occupants ─────────────────────────────
  const cabinOccupants = activeGuests.filter(
    (candidate) => getAssignedCabinId(candidate) === cabinId,
  );
  const cabinOccupantCovered = (occupantId) => {
    const occupant = activeGuests.find((g) => g.id === occupantId);
    return resolveMemberCovered(occupant);
  };
  const activeCabinPerPerson = cabinPerPersonPrice(cabin, cabinOccupants.length);
  const cabinPriceToPay = cabinOccupants.reduce((sum, occupant) => {
    if (cabinOccupantCovered(occupant.id)) return sum;
    return sum + activeCabinPerPerson;
  }, 0);
  const anyCabinCovered = cabinOccupants.some((o) => cabinOccupantCovered(o.id));

  if (!cabin) return null;

  return (
    <>
      <div className="accommodation-plan-card">
        <h4>{option.planCardTitle}</h4>

        {activeCabinPerPerson > 0 && (
          <div className="accommodation-plan-row">
            <span className="accommodation-plan-label">
              {option.planCardPerPerson.replace("{name}", activeFirstName || "")}
            </span>
            <PlanPrice
              original={activeCabinPerPerson}
              toPay={paidByCouple ? 0 : activeCabinPerPerson}
              language={language}
              covered={paidByCouple}
            />
            {paidByCouple && <em>{option.planCardSaleLabel}</em>}
          </div>
        )}

        {groupMembers.length > 1 && (
          <div className="accommodation-plan-row">
            <span className="accommodation-plan-label">
              {option.planCardGroupTotal}
            </span>
            <PlanPrice
              original={groupTotal}
              toPay={priceToPay}
              language={language}
              covered={anyCovered}
            />
            {anyCovered && <em>{option.planCardSaleLabel}</em>}
          </div>
        )}

        <p className="accommodation-plan-disclaimer">
          {option.planCardEurDisclaimer} · {option.planCardEstimate}
        </p>
      </div>

      <dl className="accommodation-option-details">
        <div>
          <dt>{option.cabinLabel}</dt>
          <dd>{cabinName}</dd>
        </div>
        {cabin?.capacity && (
          <div>
            <dt>{option.cabinCapacityLabel}</dt>
            <dd>{cabin.capacity} {option.peopleLabel}</dd>
          </div>
        )}
        {cabinArrangement && (
          <div>
            <dt>{option.cabinOccupancyLabel}</dt>
            <dd>{cabinArrangement}</dd>
          </div>
        )}
        {roomDescription && (
          <div>
            <dt>{option.roomLabel}</dt>
            <dd>{roomDescription}</dd>
          </div>
        )}
        {room?.capacity && (
          <div>
            <dt>{option.roomCapacityLabel}</dt>
            <dd>{room.capacity} {option.peopleLabel}</dd>
          </div>
        )}
        {roomArrangement && (
          <div>
            <dt>{option.roomOccupancyLabel}</dt>
            <dd>{roomArrangement}</dd>
          </div>
        )}
        {paymentLabel && (
          <div>
            <dt>{option.paymentLabel}</dt>
            <dd>{paymentLabel}</dd>
          </div>
        )}
        {cabin?.totalPrice2Nights && (
          <div>
            <dt>{option.cabinPriceLabel}</dt>
            <AccommodationPrice
              original={cabin.totalPrice2Nights}
              toPay={cabinPriceToPay}
              language={language}
              covered={cabinPriceToPay === 0}
              showSale={anyCabinCovered && cabinPriceToPay < cabin.totalPrice2Nights}
              coveredLabel={option.coveredPriceLabel}
            />
          </div>
        )}
        {activeCabinPerPerson > 0 && (
          <div>
            <dt>{option.personPriceLabel}</dt>
            <AccommodationPrice
              original={activeCabinPerPerson}
              toPay={paidByCouple ? 0 : activeCabinPerPerson}
              language={language}
              covered={paidByCouple}
              coveredLabel={option.coveredPriceLabel}
            />
          </div>
        )}
        {groupMembers.length > 0 && groupTotal > 0 && (
          <div>
            <dt>{option.groupPriceLabel}</dt>
            <AccommodationPrice
              original={groupTotal}
              toPay={priceToPay}
              language={language}
              covered={priceToPay === 0}
              showSale={anyCovered && priceToPay < groupTotal}
              coveredLabel={option.coveredPriceLabel}
            />
          </div>
        )}
        {showExtraCabinRow && extraCabin && (
          <div>
            <dt>{option.extraCabinLabel}</dt>
            <dd>
              {(() => {
                const xtraCabin = getCabin(extraCabin);
                const xtraName = xtraCabin?.name?.replace(/\s+/g, " ") || extraCabin;
                const xtraCapacity = xtraCabin?.capacity
                  ? ` - ${xtraCabin.capacity}p`
                  : "";
                const xtraRoomDesc =
                  extraRoom && getRoomDescription(getRoom(extraRoom), language)
                    ? ` · ${getRoomDescription(getRoom(extraRoom), language)}`
                    : "";
                return `${xtraName}${xtraCapacity}${xtraRoomDesc}`;
              })()}
            </dd>
          </div>
        )}
      </dl>
    </>
  );
}
