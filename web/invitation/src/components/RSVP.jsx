import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { RsvpQuestion, BOOLEAN_YES } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { getGroupMembers, resolveLiveGuest, resolveGuestName } from "../guest-profiles.js";

import { getActiveGuests } from "../guests.js";
import { getCabin } from "../cabins.js";
import { getRoom } from "../rooms.js";
import { computeInitialStepIndex, savePaymentConfirmed } from "../rsvp-responses.js";


import {
  PaymentSummary,
  computeStayAmounts,
  formatPrice,
} from "./PaymentSummary.jsx";
import {
  buildStayCartItems,
  trackCartItem,
  trackFunnelStep,
  trackPurchase,
} from "../analytics.js";
import { Button } from "./ui/Button.jsx";
import { Avatar } from "../features/identity/Avatar.jsx";



export function RSVP() {
  const { t, profile, language, interfaceText } = useApp();
  const { answers, setAnswer, progress, editedFlows, saveFlow } = useRsvp();

  const rsvp = t.rsvp || {};
  const scale = rsvp.scale || {};
  const petanque = rsvp.petanque || {};
  const petanqueTribute = t.petanqueTribute || {};
  const petanqueMini = petanqueTribute.rsvpMini || {};
  const coast = t.coast || {};
  const coastRsvpMini = coast.rsvpMini || {};

  // The group's guests (the signed-in guest + the other members of their
  // invitation group). These are the people the scale questions apply to.
  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  // ── Petanque questions (boolean variant) ────────────────────────────────
  // Mirrors the mini-RSVP in the Petanque section: participation + own boules.
  const petanqueQuestions = useMemo(() => {
    const qs = [];
    if (petanque.fields?.participation) {
      qs.push({
        id: "petanqueParticipation",
        title: petanque.fields.participation,
        subtitle: petanque.intro,
        variant: "boolean",
      });
    }
    if (petanque.fields?.ownBoules) {
      qs.push({
        id: "petanqueOwnBoules",
        title: petanque.fields.ownBoules,
        subtitle: petanqueMini.fields?.ownBoulesHint,
        variant: "boolean",
      });
    }
    return qs;
  }, [petanque, petanqueMini]);

  // Only guests who said "yes" to the tournament should see the boules
  // question (same rule as the Petanque mini-RSVP).
  const boulesGuests = useMemo(
    () =>
      guests.filter(
        (guest) => answers.petanqueParticipation?.[guest.id] === BOOLEAN_YES,
      ),
    [guests, answers.petanqueParticipation],
  );
  const visiblePetanqueQuestions = useMemo(
    () =>
      boulesGuests.length === 0
        ? petanqueQuestions.filter((q) => q.id !== "petanqueOwnBoules")
        : petanqueQuestions,
    [petanqueQuestions, boulesGuests.length],
  );

  // ── Extra-stay questions (scale variant) ────────────────────────────────
  // Mirrors the mini-RSVP in the Coast section: rocaAzul + playa.
  const extraStayQuestions = useMemo(
    () =>
      (coastRsvpMini.questions || []).map((q) => ({
        id: q.id,
        title: q.title,
        subtitle: q.subtitle,
        variant: "scale",
      })),
    [coastRsvpMini],
  );

  // ── Current step per fieldset ───────────────────────────────────────────
  // Each fieldset shows ONLY its current step by default: the first question
  // that is not fully answered by every group member, or the recap when all
  // questions are answered. `computeInitialStepIndex` returns the index of the
  // first unanswered question, or `questions.length` when everything is done.
  const scaleQuestions = scale.questions || [];
  const scaleStep = computeInitialStepIndex(scaleQuestions, guests, answers);
  const petanqueStep = computeInitialStepIndex(
    visiblePetanqueQuestions,
    guests,
    answers,
    { petanqueOwnBoules: boulesGuests },
  );

  const extraStayStep = computeInitialStepIndex(
    extraStayQuestions,
    guests,
    answers,
  );

  // ── Save status for the final submit ────────────────────────────────────

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | working | saved | error

  const handleAnswerChange = (questionId, guestId, level, flow) => {
    setAnswer(questionId, guestId, level, flow);
    // If participation is no longer "yes", clear the boules answer for that
    // guest so it doesn't linger as a stale "yes"/"no".
    if (questionId === "petanqueParticipation" && level !== BOOLEAN_YES) {
      setAnswer("petanqueOwnBoules", guestId, 0, flow);
    }
  };


  // Persist every flow's answers (attendance scale, petanque, extra stay) for
  // every guest in the group, then surface a success/error message.
  const handleSubmit = async () => {
    if (saveStatus === "working") return;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return;
    setSaveStatus("working");
    try {
      const flows = [
        { flow: RSVP_FLOWS.teAnimas, questions: scale.questions || [] },
        { flow: RSVP_FLOWS.petanque, questions: visiblePetanqueQuestions },
        { flow: RSVP_FLOWS.coast, questions: extraStayQuestions },
      ];
      for (const { flow, questions } of flows) {
        if (questions.length === 0) continue;
        await saveFlow({ flow, questions, guests, editorGuestId });
      }
      setSaveStatus("saved");
      // The guest confirmed their answers — log the "sale done" funnel event
      // with the total they commit to paying (sum of the cart items).
      const total = cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
      trackPurchase({ value: total, items: cartItems, step: "confirm" });
    } catch (error) {
      console.warn("[rsvp] final save failed", error.code || error.message);
      setSaveStatus("error");
    }
  };

  // ── Payment confirmation ───────────────────────────────────────────────
  // The final "Envoyer ma réponse" button no longer re-sends the RSVP answers
  // (those are already persisted per flow). Instead it lets the guest confirm
  // that they have paid their accommodation contribution. The confirmation is
  // written to the `guests` document of the signed-in guest AND of every other
  // member of their invitation group (top-level boolean `paymentConfirmed`).
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle | working | saved | error
  const paymentConfirmed = Boolean(
    resolveLiveGuest(profile?.guest)?.paymentConfirmed,
  );

  const handlePaymentConfirm = async () => {
    if (paymentStatus === "working" || paymentConfirmed) return;
    const editorGuestId = profile?.guest?.id;
    if (!editorGuestId) return;
    setPaymentStatus("working");
    try {
      await savePaymentConfirmed(profile?.guest, editorGuestId);
      setPaymentStatus("saved");
    } catch (error) {
      console.warn("[rsvp] payment confirmation failed", error.code || error.message);
      setPaymentStatus("error");
    }
  };


  // ── Payment summary resolvers ──────────────────────────────────────────

  // These mirror the resolvers used by StayPlanCard so the read-only "À payer"
  // block shows exactly the same amounts as the Hébergement section.
  const payment = rsvp.payment || {};
  const guestOption = t.accommodation?.guestOption || {};
  const coveredLabel = guestOption.payment?.covered || "";

  // Primary stay (Fri→Sun): cabin + room + covered flag.
  const getAssignedCabinId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    const mHosting = source?.hosting || {};
    const mAssignedCabin =
      mHosting.cabin ||
      source?.cabin ||
      source?.cabinLabel ||
      source?.unit ||
      source?.room;
    const mAssignedRoom = mHosting.room || source?.room;
    const mRoom = mAssignedRoom ? getRoom(mAssignedRoom) : null;
    return mRoom?.cabin || mAssignedCabin;
  };
  const getAssignedRoomId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    const mHosting = source?.hosting || {};
    return mHosting.room || source?.room;
  };
  const resolveMemberCovered = (member) => {
    const source = resolveLiveGuest(member);
    return source?.hosting?.isCabinPaidByNovios ?? source?.isCabinPaidByNovios;
  };

  // Extra stay (Sun→Tue): extra cabin + room + covered flag.
  const getXtraCabinId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    const mHosting = source?.hosting || {};
    const mXtraCabin = mHosting.xtraCabin || source?.xtraCabin;
    const mXtraRoom = mHosting.xtraRoom || source?.xtraRoom;
    const mRoom = mXtraRoom ? getRoom(mXtraRoom) : null;
    return mRoom?.cabin || mXtraCabin;
  };
  const getXtraRoomId = (candidate) => {
    const source = resolveLiveGuest(candidate);
    const mHosting = source?.hosting || {};
    return mHosting.xtraRoom || source?.xtraRoom;
  };
  const resolveXtraCovered = (member) => {
    const source = resolveLiveGuest(member);
    return (
      source?.hosting?.isXtraCabinPaidByNovios ??
      source?.isXtraCabinPaidByNovios
    );
  };

  // ── Funnel analytics ───────────────────────────────────────────────────
  // The "À payer" block is the guest's cart: the primary cabin stay and, when
  // present, the extra cabin stay. We log a `view_cart` funnel step plus an
  // `add_to_cart` event per priced item the first time the block renders, and
  // a `purchase` event when the guest confirms (final submit succeeds).
  const cartItems = useMemo(() => {
    if (!payment.title) return [];
    const primary = computeStayAmounts({
      activeMember: profile?.guest,
      groupMembers: guests,
      getAssignedCabinId,
      resolveMemberCovered,
    });
    const extra = getXtraCabinId(profile?.guest)
      ? computeStayAmounts({
          activeMember: profile?.guest,
          groupMembers: guests,
          getAssignedCabinId: getXtraCabinId,
          resolveMemberCovered: resolveXtraCovered,
        })
      : null;

    return buildStayCartItems({ primary, extra });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.title, profile?.guest, guests]);

  // ── Payment totals ─────────────────────────────────────────────────────
  // The amounts the signed-in guest and their group must pay across the
  // primary stay and (when present) the extra stay. When there is nothing to
  // pay (e.g. the guest declined every stay), we hide the whole
  // "Participation aux frais" block and its payment-confirmation button.
  const paymentTotals = useMemo(() => {
    const primary = computeStayAmounts({
      activeMember: profile?.guest,
      groupMembers: guests,
      getAssignedCabinId,
      resolveMemberCovered,
    });
    const extra = getXtraCabinId(profile?.guest)
      ? computeStayAmounts({
          activeMember: profile?.guest,
          groupMembers: guests,
          getAssignedCabinId: getXtraCabinId,
          resolveMemberCovered: resolveXtraCovered,
        })
      : null;

    return {
      perPersonTotal:
        (primary?.perPersonToPay || 0) + (extra?.perPersonToPay || 0),
      perPersonOriginal:
        (primary?.activeCabinPerPerson || 0) +
        (extra?.activeCabinPerPerson || 0),
      groupTotal: (primary?.groupToPay || 0) + (extra?.groupToPay || 0),
      groupOriginal: (primary?.groupTotal || 0) + (extra?.groupTotal || 0),
      perPersonSale:
        (primary?.perPersonSale || false) || (extra?.perPersonSale || false),
      groupSale:
        (primary?.groupSale || false) || (extra?.groupSale || false),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.title, profile?.guest, guests]);

  // Whether the guest/group actually owes anything. When false, the whole
  // "Participation aux frais" block (summary + bank details + confirm button)
  // is hidden.
  const hasAmountToPay =
    paymentTotals.perPersonTotal > 0 || paymentTotals.groupTotal > 0;

  // Log the cart once per distinct set of items (avoid re-firing on re-render).
  const loggedCartRef = useRef(null);
  useEffect(() => {
    if (cartItems.length === 0) return;
    const key = cartItems.map((i) => i.item_id).join("|");
    if (loggedCartRef.current === key) return;
    loggedCartRef.current = key;
    trackFunnelStep("view_cart", { items: cartItems });
    cartItems.forEach((item) => trackCartItem(item));
  }, [cartItems]);

  return (
    <section className="rsvp-section section story-bg reveal">
      <p className="eyebrow">{rsvp.eyebrow}</p>
      <h2>{rsvp.title}</h2>
      <p>{rsvp.body}</p>

        {/* Progress checklist: each mini-RSVP flow is "done" once every group
            member has answered all its questions (i.e. the flow's current step
            has reached the recap). The state is shared with the mini-flows via
            RsvpContext, so a flow also counts as done once it has been walked
            through to its recap step or saved. */}
        <div className="rsvp-progress" aria-label={rsvp.progressLabel}>
          {[
            {
              flow: RSVP_FLOWS.teAnimas,
              label: rsvp.progressTeAnimas,
              done: scaleStep >= scaleQuestions.length,
            },
            {
              flow: RSVP_FLOWS.petanque,
              label: rsvp.progressPetanque,
              done: petanqueStep >= visiblePetanqueQuestions.length,
            },
            {
              flow: RSVP_FLOWS.coast,
              label: rsvp.progressCoast,
              done: extraStayStep >= extraStayQuestions.length,
            },
          ].map(({ flow, label, done }) => {
            // A flow counts as done when all its questions are answered AND
            // the user has not actively edited it since (editedFlows), OR when
            // the user has walked it through to the recap / saved it (resume).
            // This way, editing an answer flips the flow back to "En attente"
            // until the guest re-confirms, while a completed-but-reloaded flow
            // still shows "Terminé".
            const isDone =
              (done && !editedFlows[flow]) || progress[flow] === "resume";
            return (

              <div
                key={flow}
                className={`rsvp-progress-item${isDone ? " is-done" : ""}`}
              >
                <span className="rsvp-progress-mark" aria-hidden="true">
                  {isDone ? "✓" : "•"}
                </span>
                <span className="rsvp-progress-label">{label}</span>
                <span className="rsvp-progress-state">
                  {isDone ? rsvp.progressResume : rsvp.progressPending}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scale-based questions: one row per guest, 0–5 likelihood selector.
            Shows ONLY the current step by default: the first question that is
            not fully answered by every group member, or the recap when all
            questions are answered. */}
        {scaleQuestions.length > 0 && guests.length > 0 && (
          <fieldset className="rsvp-scale-fieldset">
            <legend>{rsvp.groups.attendance}</legend>
            <p className="fieldset-note">{scale.intro}</p>
            {scaleStep < scaleQuestions.length ? (
              <div className="rsvp-scale-questions">
                {(() => {
                  const q = scaleQuestions[scaleStep];
                  return (
                    <RsvpQuestion
                      key={q.id}
                      questionId={q.id}
                      title={q.title}
                      subtitle={q.subtitle}
                      guests={guests}
                      answers={answers[q.id] || {}}
                      onChange={(guestId, level) =>
                        handleAnswerChange(q.id, guestId, level, RSVP_FLOWS.teAnimas)
                      }
                    />

                  );
                })()}
              </div>
            ) : (
              <RsvpRecap
                questions={scaleQuestions}
                guests={guests}
                answers={answers}
              />
            )}
          </fieldset>
        )}


        {/* Pétanque questions: one row per guest, Yes/No toggle for the
            Friday tournament (participation + own boules). Mirrors the
            mini-RSVP in the Pétanque section. Shows ONLY the current step by
            default: the first question not fully answered by every group
            member, or the recap when all questions are answered. */}
        {visiblePetanqueQuestions.length > 0 && guests.length > 0 && (
          <fieldset className="rsvp-scale-fieldset">
            <legend>{rsvp.progressPetanque}</legend>
            <p className="fieldset-note">{petanque.intro}</p>
            {petanqueStep < visiblePetanqueQuestions.length ? (
              <div className="rsvp-scale-questions">
                {(() => {
                  const q = visiblePetanqueQuestions[petanqueStep];
                  return (
                    <RsvpQuestion
                      key={q.id}
                      questionId={q.id}
                      title={q.title}
                      subtitle={q.subtitle}
                      variant="boolean"
                      guests={q.id === "petanqueOwnBoules" ? boulesGuests : guests}
                      answers={answers[q.id] || {}}
                      onChange={(guestId, level) =>
                        handleAnswerChange(q.id, guestId, level, RSVP_FLOWS.petanque)
                      }
                    />

                  );
                })()}
              </div>
            ) : (
              <RsvpRecap
                questions={visiblePetanqueQuestions}
                guests={guests}
                answers={answers}
              />
            )}
          </fieldset>
        )}


        {/* Extra-stay questions: one row per guest, 0–5 likelihood selector
            for the "Et après ?" plans (stay at Roca Azul + beach). Mirrors the
            mini-RSVP in the Coast section. Shows ONLY the current step by
            default: the first question not fully answered by every group
            member, or the recap when all questions are answered. */}
        {extraStayQuestions.length > 0 && guests.length > 0 && (
          <fieldset className="rsvp-scale-fieldset">
            <legend>{rsvp.progressCoast}</legend>
            <p className="fieldset-note">{coastRsvpMini.intro}</p>
            {extraStayStep < extraStayQuestions.length ? (
              <div className="rsvp-scale-questions">
                {(() => {
                  const q = extraStayQuestions[extraStayStep];
                  return (
                    <RsvpQuestion
                      key={q.id}
                      questionId={q.id}
                      title={q.title}
                      subtitle={q.subtitle}
                      guests={guests}
                      answers={answers[q.id] || {}}
                      onChange={(guestId, level) =>
                        handleAnswerChange(q.id, guestId, level, RSVP_FLOWS.coast)
                      }
                    />

                  );
                })()}
              </div>
            ) : (
              <RsvpRecap
                questions={extraStayQuestions}
                guests={guests}
                answers={answers}
              />
            )}
          </fieldset>
        )}


        {/* Read-only "À payer" summary: shows the per-person and per-group
            amounts for the primary cabin and, when present, the extra cabin.
            Amounts follow the same pricing rules as the Hébergement section.
            Hidden entirely when there is nothing to pay (e.g. the guest
            declined every stay). */}
        {payment.title && hasAmountToPay && (
          <section className="rsvp-payment" aria-label={payment.title}>
            <h3>{payment.title}</h3>
            <p>{payment.intro}</p>

            <PaymentSummary
              activeMember={profile?.guest}
              groupMembers={guests}
              getAssignedCabinId={getAssignedCabinId}
              getAssignedRoomId={getAssignedRoomId}
              resolveMemberCovered={resolveMemberCovered}
              language={language}
              payment={payment}
              coveredLabel={coveredLabel}
            />

            {getXtraCabinId(profile?.guest) && (
              <PaymentSummary
                activeMember={profile?.guest}
                groupMembers={guests}
                getAssignedCabinId={getXtraCabinId}
                getAssignedRoomId={getXtraRoomId}
                resolveMemberCovered={resolveXtraCovered}
                language={language}
                payment={{ ...payment, cabinTitle: payment.extraCabinTitle }}
                coveredLabel={coveredLabel}
              />
            )}

            {/* Total: sums the primary stay and the extra stay (when present). */}
            {(() => {
              const {
                perPersonTotal,
                perPersonOriginal,
                groupTotal,
                groupOriginal,
                perPersonSale,
                groupSale,
              } = paymentTotals;

              // The per-person label carries a `{name}` placeholder that we
              // fill with the signed-in guest's first name, and we show their
              // avatar next to it (same treatment as PaymentSummary).
              const { firstName: activeFirstName } = resolveGuestName(
                profile?.guest,
              );
              const perPersonLabel = (payment.perPerson || "").replace(
                "{name}",
                activeFirstName || "",
              );

              return (
                <div className="rsvp-payment-block rsvp-payment-total">
                  <h4 className="rsvp-payment-block-title">{payment.total}</h4>
                  <dl className="rsvp-payment-rows">
                    <div className="rsvp-payment-row">
                      <dt>
                        <span className="rsvp-payment-label-avatar">
                          <Avatar guest={profile?.guest} size={28} />
                        </span>
                        {perPersonLabel}
                      </dt>


                      <dd
                        className={`rsvp-payment-value${perPersonSale ? " is-sale" : ""}`}
                      >
                        <span className="rsvp-payment-line">
                          {perPersonSale && (
                            <span className="rsvp-payment-original">
                              {formatPrice(perPersonOriginal, language)} MXN
                            </span>
                          )}
                          <strong>{formatPrice(perPersonTotal, language)} MXN</strong>
                        </span>
                        <span className="rsvp-payment-line">
                          {perPersonSale && (
                            <span className="rsvp-payment-original">
                              ≈ {formatPrice(perPersonOriginal / 20, language)} €
                            </span>
                          )}
                          <small>≈ {formatPrice(perPersonTotal / 20, language)} €</small>
                        </span>
                      </dd>
                    </div>
                    {/* The per-group row only makes sense when the group has
                        more than one person; with a single guest it would just
                        duplicate the per-person amount. */}
                    {guests.length > 1 && (
                      <div className="rsvp-payment-row">
                        <dt>
                          <span className="rsvp-payment-label-text">
                            {payment.perGroup}
                          </span>
                          <span className="rsvp-payment-label-avatar rsvp-payment-label-avatar--stack">
                            {guests.map((member) => (
                              <Avatar key={member.id} guest={member} size={28} />
                            ))}
                          </span>
                        </dt>
                        <dd
                          className={`rsvp-payment-value${groupSale ? " is-sale" : ""}`}
                        >
                          <span className="rsvp-payment-line">
                            {groupSale && (
                              <span className="rsvp-payment-original">
                                {formatPrice(groupOriginal, language)} MXN
                              </span>
                            )}
                            <strong>{formatPrice(groupTotal, language)} MXN</strong>
                          </span>
                          <span className="rsvp-payment-line">
                            {groupSale && (
                              <span className="rsvp-payment-original">
                                ≈ {formatPrice(groupOriginal / 20, language)} €
                              </span>
                            )}
                            <small>≈ {formatPrice(groupTotal / 20, language)} €</small>
                          </span>
                        </dd>
                      </div>
                    )}

                  </dl>
                </div>
              );
            })()}

            {payment.asterisk && (
              <p className="rsvp-payment-asterisk">{payment.asterisk}</p>
            )}

            {/* Payment confirmation: asks the guest to settle their
                accommodation contribution before the wedding weekend and to
                confirm once done. */}
            {payment.confirmNote && (
              <p className="rsvp-payment-confirm-note">{payment.confirmNote}</p>
            )}

            {/* Bank account details for the accommodation contribution,
                mirroring the CADEAUX section. Expanded by default. */}
            {payment.accounts && (
              <div className="rsvp-payment-accounts">
                {Object.entries(payment.accounts).map(([currency, account]) => (
                  <details
                    className="rsvp-payment-account"
                    open
                    key={currency}
                  >
                    <summary>{account.title}</summary>
                    <dl>
                      {account.details.map((detail, index) => (
                        <dd key={index}>{detail}</dd>
                      ))}
                    </dl>
                    {account.note && <small>{account.note}</small>}
                  </details>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Payment confirmation: the final button no longer re-sends the RSVP
            answers (those are already persisted per flow). Instead it lets the
            guest confirm that they have paid their accommodation contribution.
            The confirmation is written to the `guests` document of the
            signed-in guest AND of every other member of their invitation
            group. Hidden entirely when there is nothing to pay. */}
        {hasAmountToPay && (
          <div className="rsvp-submit">
            {paymentConfirmed ? (
              <p className="rsvp-confirmation rsvp-confirmation--paid" role="status">
                <span aria-hidden="true">✓</span>
                {payment.confirmedNote || interfaceText.submitSuccess}
              </p>
            ) : (
              <Button
                variant="gold"
                onClick={handlePaymentConfirm}
                disabled={paymentStatus === "working"}
              >
                {payment.confirmButton || rsvp.button || scale.saveButton}
              </Button>
            )}

            {paymentStatus === "error" && (
              <p className="rsvp-confirmation rsvp-confirmation--error" role="alert">
                {interfaceText.submitError}
              </p>
            )}
            {paymentStatus === "working" && (
              <small data-form-status>{interfaceText.submitWorking}</small>
            )}
          </div>
        )}


        {/* Desktop-only bottom nav: leads to the INVITES section. */}
        <nav className="section-nav section-nav--light rsvp-section-nav" aria-label="Continue">
          <a className="section-nav-link" href="#gift">
            <span>{t.nav.gift}</span>

            <span aria-hidden="true">↓</span>
          </a>
        </nav>

    </section>
  );
}
