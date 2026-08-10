import React, { useMemo, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useRsvp, RSVP_FLOWS } from "../context/RsvpContext.jsx";
import { submitPetanque, submitRsvp } from "../submit-forms.js";
import { RsvpQuestion } from "./RsvpQuestion.jsx";
import { RsvpRecap } from "./RsvpRecap.jsx";
import { getGroupMembers } from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";
import { resolveRsvpAnswer } from "../rsvp-responses.js";


function optionsMarkup(options) {
  return (options || []).map((option) => (
    <option value={option.value} key={option.value}>
      {option.label}
    </option>
  ));
}

export function RSVP() {
  const { t, profile, language, interfaceText } = useApp();
  const { answers, setAnswer, progress } = useRsvp();
  const rsvp = t.rsvp || {};
  const petanque = rsvp.petanque || {};
  const scale = rsvp.scale || {};
  const showTravelSection = profile?.guest?.comesFromFar === true;

  const formRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | working | success | error

  // The group's guests (the signed-in guest + the other members of their
  // invitation group). These are the people the scale questions apply to.
  const guests = useMemo(
    () => getGroupMembers(profile?.guest, getActiveGuests()),
    [profile?.guest],
  );

  const handleAnswerChange = (questionId, guestId, level) => {
    setAnswer(questionId, guestId, level);
  };

  // The final RSVP cannot be submitted until every mini-RSVP flow has been
  // walked through to its recap step ("resume"). Each flow reports its state
  // via the shared RsvpContext.
  const allResume = [RSVP_FLOWS.teAnimas, RSVP_FLOWS.petanque, RSVP_FLOWS.coast].every(
    (flow) => progress[flow] === "resume",
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === "working") return;
    if (!allResume) return;
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    const context = {
      email: profile?.email || "",
      language,
    };

    setStatus("working");
    try {
      // The RSVP form also collects the petanque section. Both submissions are
      // independent documents, so we submit them sequentially and only report
      // success if both succeed.
      await submitRsvp(formData, context);
      await submitPetanque(formData, context);
      setStatus("success");
      form.reset();
    } catch (error) {
      console.warn("[rsvp] submission failed", error.code || error.message);
      setStatus("error");
    }
  };

  const statusText =
    status === "working"
      ? interfaceText.submitWorking
      : status === "success"
        ? interfaceText.submitSuccess
        : status === "error"
          ? interfaceText.submitError
          : rsvp.previewNote;

  return (
    <section className="rsvp-section section story-bg reveal">
      <p className="eyebrow">{rsvp.eyebrow}</p>
      <h2>{rsvp.title}</h2>
      <p>{rsvp.body}</p>

        {/* Progress checklist: each mini-RSVP flow must be walked through to
            its recap step ("resume") before the final form can be submitted.
            The state is shared with the mini-flows via RsvpContext. */}
        <div className="rsvp-progress" aria-label={rsvp.progressLabel}>
          {[
            { flow: RSVP_FLOWS.teAnimas, label: rsvp.progressTeAnimas },
            { flow: RSVP_FLOWS.petanque, label: rsvp.progressPetanque },
            { flow: RSVP_FLOWS.coast, label: rsvp.progressCoast },
          ].map(({ flow, label }) => {
            const done = progress[flow] === "resume";
            return (
              <div
                key={flow}
                className={`rsvp-progress-item${done ? " is-done" : ""}`}
              >
                <span className="rsvp-progress-mark" aria-hidden="true">
                  {done ? "✓" : "•"}
                </span>
                <span className="rsvp-progress-label">{label}</span>
                <span className="rsvp-progress-state">
                  {done ? rsvp.progressResume : rsvp.progressPending}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scale-based questions: one row per guest, 0–5 likelihood selector */}
        {scale.questions && scale.questions.length > 0 && guests.length > 0 && (
          <fieldset className="rsvp-scale-fieldset">
            <legend>{rsvp.groups.attendance}</legend>
            <p className="fieldset-note">{scale.intro}</p>
            <div className="rsvp-scale-questions">
              {scale.questions.map((q) => (
                <RsvpQuestion
                  key={q.id}
                  questionId={q.id}
                  title={q.title}
                  subtitle={q.subtitle}
                  guests={guests}
                  answers={answers[q.id] || {}}
                  onChange={(guestId, level) =>
                    handleAnswerChange(q.id, guestId, level)
                  }
                />
              ))}
            </div>

            <RsvpRecap
              questions={scale.questions}
              guests={guests}
              answers={answers}
            />
          </fieldset>
        )}

        <form
          ref={formRef}
          className="rsvp-form"
          data-form-kind="rsvp"
          aria-describedby="rsvp-preview-note"
          onSubmit={handleSubmit}
        >
          <fieldset>
            <legend>{rsvp.groups.attendance}</legend>
            <div className="rsvp-form-grid">
              <div className="form-field">
                <label htmlFor="rsvp-full-name">{rsvp.fields.fullName}</label>
                <input
                  id="rsvp-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-whatsapp">{rsvp.fields.whatsapp}</label>
                <input
                  id="rsvp-whatsapp"
                  name="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-attendance">{rsvp.fields.attendance}</label>
                <select id="rsvp-attendance" name="attendance">
                  {optionsMarkup(rsvp.options.attendance)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-group-mode">{rsvp.fields.groupMode}</label>
                <select id="rsvp-group-mode" name="groupMode">
                  {optionsMarkup(rsvp.options.groupMode)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-group-name">{rsvp.fields.groupName}</label>
                <input id="rsvp-group-name" name="groupName" type="text" />
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-party-size">{rsvp.fields.partySize}</label>
                <input
                  id="rsvp-party-size"
                  name="partySize"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue="1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-adults">{rsvp.fields.adults}</label>
                <input
                  id="rsvp-adults"
                  name="adults"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue="1"
                />
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-children">{rsvp.fields.children}</label>
                <input
                  id="rsvp-children"
                  name="children"
                  type="number"
                  min="0"
                  max="12"
                  defaultValue="0"
                />
              </div>
              <div className="form-field">
                <label htmlFor="rsvp-guests">{rsvp.fields.guests}</label>
                <input id="rsvp-guests" name="guests" type="text" />
              </div>
              <div className="form-field form-field-wide">
                <label htmlFor="rsvp-accommodation">
                  {rsvp.fields.accommodation}
                </label>
                <select id="rsvp-accommodation" name="accommodation">
                  {optionsMarkup(rsvp.options.accommodation)}
                </select>
              </div>
              <div className="form-field" data-independent-stay hidden>
                <label htmlFor="rsvp-independent-arrival">
                  {rsvp.fields.independentArrival}
                </label>
                <select
                  id="rsvp-independent-arrival"
                  name="independentArrival"
                  disabled
                >
                  {optionsMarkup(rsvp.options.independentArrival)}
                </select>
              </div>
              <div className="form-field" data-independent-stay hidden>
                <label htmlFor="rsvp-sunday-morning">
                  {rsvp.fields.sundayMorning}
                </label>
                <select
                  id="rsvp-sunday-morning"
                  name="sundayMorning"
                  disabled
                >
                  {optionsMarkup(rsvp.options.sundayMorning)}
                </select>
              </div>
            </div>
          </fieldset>

          {showTravelSection && (
            <fieldset>
              <legend>{rsvp.groups.travel}</legend>
              <p className="fieldset-note">{rsvp.travelNote}</p>
              <div className="rsvp-form-grid">
                <div className="form-field form-field-wide">
                  <label htmlFor="travel-status">{rsvp.fields.travelStatus}</label>
                  <select id="travel-status" name="travelStatus">
                    {optionsMarkup(rsvp.options.travelStatus)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="arrival-from">{rsvp.fields.arrivalFrom}</label>
                  <input id="arrival-from" name="arrivalFrom" type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="arrival-to">{rsvp.fields.arrivalTo}</label>
                  <input
                    id="arrival-to"
                    name="arrivalTo"
                    type="text"
                    placeholder="GDL"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="arrival-date">{rsvp.fields.arrivalDate}</label>
                  <input id="arrival-date" name="arrivalDate" type="date" />
                </div>
                <div className="form-field">
                  <label htmlFor="arrival-time">{rsvp.fields.arrivalTime}</label>
                  <input id="arrival-time" name="arrivalTime" type="time" />
                </div>
                <div className="form-field">
                  <label htmlFor="arrival-airline">
                    {rsvp.fields.arrivalAirline}
                  </label>
                  <input id="arrival-airline" name="arrivalAirline" type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="arrival-flight">
                    {rsvp.fields.arrivalFlight}
                  </label>
                  <input id="arrival-flight" name="arrivalFlight" type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="departure-from">
                    {rsvp.fields.departureFrom}
                  </label>
                  <input
                    id="departure-from"
                    name="departureFrom"
                    type="text"
                    placeholder="GDL"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="departure-to">{rsvp.fields.departureTo}</label>
                  <input id="departure-to" name="departureTo" type="text" />
                </div>
                <div className="form-field">
                  <label htmlFor="departure-date">
                    {rsvp.fields.departureDate}
                  </label>
                  <input id="departure-date" name="departureDate" type="date" />
                </div>
                <div className="form-field">
                  <label htmlFor="departure-time">
                    {rsvp.fields.departureTime}
                  </label>
                  <input id="departure-time" name="departureTime" type="time" />
                </div>
                <div className="form-field">
                  <label htmlFor="departure-airline">
                    {rsvp.fields.departureAirline}
                  </label>
                  <input
                    id="departure-airline"
                    name="departureAirline"
                    type="text"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="departure-flight">
                    {rsvp.fields.departureFlight}
                  </label>
                  <input
                    id="departure-flight"
                    name="departureFlight"
                    type="text"
                  />
                </div>
                <div className="form-field form-field-wide">
                  <label htmlFor="travel-route">{rsvp.fields.route}</label>
                  <input
                    id="travel-route"
                    name="route"
                    type="text"
                    placeholder={rsvp.fields.routePlaceholder}
                  />
                </div>
              </div>
            </fieldset>
          )}

          <fieldset className="petanque-fieldset">
            <legend>{petanque.eyebrow}</legend>
            <div className="petanque-intro">
              <p>{petanque.intro}</p>
              <a
                className="text-link"
                href={petanque.organizerWhatsapp}
                target="_blank"
                rel="noreferrer"
              >
                {petanque.organizerLabel} ↗
              </a>
            </div>
            <div className="rsvp-form-grid">
              <div className="form-field">
                <label htmlFor="petanque-participation">
                  {petanque.fields.participation}
                </label>
                <select id="petanque-participation" name="petanqueParticipation">
                  {optionsMarkup(petanque.options.participation)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="petanque-party-size">
                  {petanque.fields.partySize}
                </label>
                <input
                  id="petanque-party-size"
                  name="petanquePartySize"
                  type="number"
                  min="0"
                  max="12"
                  defaultValue="0"
                />
              </div>
              <div className="form-field form-field-wide">
                <label htmlFor="petanque-names">{petanque.fields.names}</label>
                <input
                  id="petanque-names"
                  name="petanqueNames"
                  type="text"
                  placeholder={petanque.fields.namesPlaceholder}
                />
              </div>
              <div className="form-field">
                <label htmlFor="petanque-own-boules">
                  {petanque.fields.ownBoules}
                </label>
                <select id="petanque-own-boules" name="petanqueOwnBoules">
                  {optionsMarkup(petanque.options.ownBoules)}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>{rsvp.groups.notes}</legend>
            <div className="form-field">
              <label htmlFor="rsvp-notes">{rsvp.fields.notes}</label>
              <textarea id="rsvp-notes" name="notes" rows="4" />
            </div>
          </fieldset>

          <button
            className="button button-light"
            type="submit"
            disabled={!allResume || status === "working"}
          >
            {rsvp.button}
          </button>
          <small id="rsvp-preview-note" data-form-status>
            {statusText}
          </small>
        </form>

        {/* Desktop-only bottom nav: leads to the thanks section. */}
        <nav className="section-nav section-nav--light rsvp-section-nav" aria-label="Continue">
          <a className="section-nav-link" href="#thanks">
            <span>{t.nav.thanks}</span>
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
    </section>
  );
}
