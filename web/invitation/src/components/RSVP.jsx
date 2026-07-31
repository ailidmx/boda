import React from "react";
import { useApp } from "../context/AppContext.jsx";

function optionsMarkup(options) {
  return (options || []).map((option) => (
    <option value={option.value} key={option.value}>
      {option.label}
    </option>
  ));
}

export function RSVP() {
  const { t, profile } = useApp();
  const rsvp = t.rsvp || {};
  const petanque = rsvp.petanque || {};
  const showTravelSection = profile?.guest?.comesFromFar === true;

  return (
    <section className="rsvp-section section">
      <div className="rsvp-frame reveal">
        <p className="eyebrow">{rsvp.eyebrow}</p>
        <h2>{rsvp.title}</h2>
        <p>{rsvp.body}</p>
        <form
          className="rsvp-form"
          data-form-kind="rsvp"
          aria-describedby="rsvp-preview-note"
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

          <button className="button button-light" type="submit">
            {rsvp.button}
          </button>
          <small id="rsvp-preview-note" data-form-status>
            {rsvp.previewNote}
          </small>
        </form>
      </div>
    </section>
  );
}
