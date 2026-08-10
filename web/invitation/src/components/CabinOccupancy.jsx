import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRoomDescription } from "../rooms.js";

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
}

/**
 * Reusable "see full cabin occupancy" trigger + modal. Used by both the
 * Hébergement section (primary cabin) and the "Et après ?" section (extra
 * cabin / extra room). The trigger is rendered at the top of the block.
 *
 * Props:
 *   - cabinName: display name of the cabin
 *   - rooms: array of { room, occupants } where occupants is an array of
 *     { id, name, photo }
 *   - assignedRoomId: the active member's room id (to highlight it)
 *   - activeMemberId: the active member's guest id (to show "You")
 *   - option: the accommodation.guestOption translation object
 *   - language: active language
 */
export function CabinOccupancy({
  cabinName,
  rooms,
  assignedRoomId,
  activeMemberId,
  option,
  language,
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Always start the modal scrolled to the top of its content (the start of
    // the room list), never the bottom. Only the modal panel scrolls — the
    // page behind stays put.
    panelRef.current?.scrollTo({ top: 0, left: 0 });
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);


  if (!rooms || rooms.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className="accommodation-occupancy-trigger"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {option.wholeCabinTitle}
      </button>

      {createPortal(
        <div
          className={`accommodation-occupancy-shell${open ? " is-open" : ""}`}
          role={open ? "dialog" : undefined}
          aria-modal={open ? "true" : undefined}
          aria-labelledby={open ? "accommodation-occupancy-title" : undefined}
          onMouseDown={(event) => {
            if (open && event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="accommodation-occupancy-panel" ref={panelRef}>
            <button
              ref={closeRef}

              className="accommodation-occupancy-close"
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <p className="eyebrow accommodation-occupancy-eyebrow">
              {option.wholeCabinTitle}
            </p>
            <h3 id="accommodation-occupancy-title">{cabinName}</h3>
            <p className="accommodation-occupancy-body">{option.wholeCabinBody}</p>
            <div className="accommodation-room-list">
              {rooms.map(({ room, occupants }) => (
                <article
                  className={room.id === assignedRoomId ? "is-current" : undefined}
                  key={room.id}
                >
                  <header>
                    <strong>{getRoomDescription(room, language)}</strong>
                    <span>
                      {room.capacity} {option.peopleLabel} ·{" "}
                      {option.occupancy?.[room.isShared ? "compartida" : "privada"]}
                    </span>
                  </header>
                  <div className="accommodation-room-occupants">
                    {occupants.length > 0 ? occupants.map((occupant) => (
                      <div className="accommodation-room-person" key={occupant.id}>
                        <span className="accommodation-room-avatar" aria-hidden="true">
                          {occupant.photo
                            ? <img src={occupant.photo} alt="" loading="lazy" />
                            : getInitials(occupant.name)}
                        </span>
                        <span className="accommodation-room-person-text">
                          <span className="accommodation-room-person-name">
                            {occupant.name}
                            {occupant.id === activeMemberId && <small>{option.youLabel}</small>}
                          </span>
                          {occupant.covered && (
                            <em className="accommodation-room-covered">
                              {option.payment?.covered}
                            </em>
                          )}
                        </span>
                      </div>
                    )) : (
                      <span className="accommodation-room-empty">{option.emptyRoom}</span>
                    )}
                  </div>

                </article>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
