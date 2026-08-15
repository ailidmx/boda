import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { saveFlightInfo } from "../flight-info.js";
import { AirportAutocomplete } from "./AirportAutocomplete.jsx";

const MAX_CONNECTIONS = 3;

/**
 * Flight information form for the Travel section.
 *
 * Lets a guest record their flight details (origin, connections, destination,
 * arrival date/time, final flight number) so the couple can coordinate airport
 * pickups. Data is stored on the guest's own Firestore document under
 * `flightInfo` and can be edited and re-saved at any time.
 */
export function FlightInfo() {
  const { profile, t } = useApp();
  const guest = profile?.guest;
  const guestId = guest?.id;
  const existing = guest?.flightInfo || {};
  const existingDeparture = existing.departure || {};

  const [origin, setOrigin] = useState(existing.origin || null);
  const [destination, setDestination] = useState(existing.destination || null);
  const [connections, setConnections] = useState(
    Array.isArray(existing.connections) ? existing.connections : [],
  );
  const [arrivalDate, setArrivalDate] = useState(existing.arrivalDate || "");
  const [arrivalTime, setArrivalTime] = useState(existing.arrivalTime || "");
  const [finalFlightNumber, setFinalFlightNumber] = useState(
    existing.finalFlightNumber || "",
  );

  // Return-trip (departure) fields.
  const [depOrigin, setDepOrigin] = useState(existingDeparture.origin || null);
  const [depDestination, setDepDestination] = useState(
    existingDeparture.destination || null,
  );
  const [depConnections, setDepConnections] = useState(
    Array.isArray(existingDeparture.connections)
      ? existingDeparture.connections
      : [],
  );
  const [departureDate, setDepartureDate] = useState(
    existingDeparture.departureDate || "",
  );
  const [departureTime, setDepartureTime] = useState(
    existingDeparture.departureTime || "",
  );
  const [depFinalFlightNumber, setDepFinalFlightNumber] = useState(
    existingDeparture.finalFlightNumber || "",
  );

  const [status, setStatus] = useState("idle"); // idle | saving | saved | error

  const fi = t.travel.flightInfo;
  const dep = fi.departure;

  const hasData = useMemo(
    () =>
      Boolean(
        origin ||
          destination ||
          connections.length > 0 ||
          arrivalDate ||
          arrivalTime ||
          finalFlightNumber,
      ),
    [origin, destination, connections, arrivalDate, arrivalTime, finalFlightNumber],
  );

  const handleSave = async (e) => {
    e.preventDefault();
    if (!guestId) return;
    setStatus("saving");
    try {
      await saveFlightInfo({
        guestId,
        origin,
        destination,
        connections,
        arrivalDate,
        arrivalTime,
        finalFlightNumber,
        departure: {
          origin: depOrigin,
          destination: depDestination,
          connections: depConnections,
          departureDate,
          departureTime,
          finalFlightNumber: depFinalFlightNumber,
        },
      });
      setStatus("saved");
    } catch (err) {
      console.warn("[FlightInfo] save failed", err.message);
      setStatus("error");
    }
  };

  const updateConnection = (index, airport) => {
    setConnections((prev) => {
      const next = [...prev];
      next[index] = airport;
      return next;
    });
  };

  const removeConnection = (index) => {
    setConnections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDepConnection = (index, airport) => {
    setDepConnections((prev) => {
      const next = [...prev];
      next[index] = airport;
      return next;
    });
  };

  const removeDepConnection = (index) => {
    setDepConnections((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <section className="flight-info" id="flight-info">
      <div className="flight-info__inner">
        <p className="flight-info__eyebrow">{fi.eyebrow}</p>
        <h2 className="flight-info__title">{fi.title}</h2>
        <p className="flight-info__body">{fi.body}</p>

        <form className="flight-info__form" onSubmit={handleSave}>
          <div className="flight-info__grid">
            <AirportAutocomplete
              id="flight-origin"
              label={fi.originLabel}
              placeholder={fi.originPlaceholder}
              hint={fi.searchHint}
              value={origin}
              onSelect={setOrigin}
              noResultsText={fi.noResults}
            />

            <AirportAutocomplete
              id="flight-destination"
              label={fi.destinationLabel}
              placeholder={fi.destinationPlaceholder}
              hint={fi.searchHint}
              value={destination}
              onSelect={setDestination}
              noResultsText={fi.noResults}
            />
          </div>

          <div className="flight-info__connections">
            <p className="flight-info__connections-label">{fi.connectionsLabel}</p>
            <p className="flight-info__connections-hint">{fi.connectionsHint}</p>

            {connections.map((conn, index) => (
              <div className="flight-info__connection" key={index}>
                <AirportAutocomplete
                  id={`flight-connection-${index}`}
                  label={`${fi.connectionsLabel} ${index + 1}`}
                  placeholder={fi.originPlaceholder}
                  value={conn}
                  onSelect={(airport) => updateConnection(index, airport)}
                  noResultsText={fi.noResults}
                />
                <button
                  type="button"
                  className="flight-info__remove"
                  onClick={() => removeConnection(index)}
                >
                  {fi.removeConnection}
                </button>
              </div>
            ))}

            {connections.length < MAX_CONNECTIONS && (
              <button
                type="button"
                className="flight-info__add"
                onClick={() => setConnections((prev) => [...prev, null])}
              >
                + {fi.addConnection}
              </button>
            )}
          </div>

          <div className="flight-info__arrival">
            <label className="flight-info__field">
              <span className="flight-info__field-label">{fi.arrivalDateLabel}</span>
              <input
                type="date"
                className="flight-info__input"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
              />
            </label>

            <label className="flight-info__field">
              <span className="flight-info__field-label">{fi.arrivalTimeLabel}</span>
              <input
                type="time"
                className="flight-info__input"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </label>

            <label className="flight-info__field">
              <span className="flight-info__field-label">{fi.finalFlightLabel}</span>
              <input
                type="text"
                className="flight-info__input"
                value={finalFlightNumber}
                onChange={(e) => setFinalFlightNumber(e.target.value)}
                placeholder={fi.finalFlightPlaceholder}
                maxLength={20}
              />
            </label>
          </div>

          <div className="flight-info__departure">
            <p className="flight-info__departure-eyebrow">{dep.eyebrow}</p>
            <h3 className="flight-info__departure-title">{dep.title}</h3>
            <p className="flight-info__departure-body">{dep.body}</p>

            <div className="flight-info__grid">
              <AirportAutocomplete
                id="flight-dep-origin"
                label={dep.originLabel}
                placeholder={dep.originPlaceholder}
                hint={dep.searchHint}
                value={depOrigin}
                onSelect={setDepOrigin}
                noResultsText={dep.noResults}
              />

              <AirportAutocomplete
                id="flight-dep-destination"
                label={dep.destinationLabel}
                placeholder={dep.destinationPlaceholder}
                hint={dep.searchHint}
                value={depDestination}
                onSelect={setDepDestination}
                noResultsText={dep.noResults}
              />
            </div>

            <div className="flight-info__connections">
              <p className="flight-info__connections-label">{dep.connectionsLabel}</p>
              <p className="flight-info__connections-hint">{dep.connectionsHint}</p>

              {depConnections.map((conn, index) => (
                <div className="flight-info__connection" key={index}>
                  <AirportAutocomplete
                    id={`flight-dep-connection-${index}`}
                    label={`${dep.connectionsLabel} ${index + 1}`}
                    placeholder={dep.originPlaceholder}
                    value={conn}
                    onSelect={(airport) => updateDepConnection(index, airport)}
                    noResultsText={dep.noResults}
                  />
                  <button
                    type="button"
                    className="flight-info__remove"
                    onClick={() => removeDepConnection(index)}
                  >
                    {dep.removeConnection}
                  </button>
                </div>
              ))}

              {depConnections.length < MAX_CONNECTIONS && (
                <button
                  type="button"
                  className="flight-info__add"
                  onClick={() => setDepConnections((prev) => [...prev, null])}
                >
                  + {dep.addConnection}
                </button>
              )}
            </div>

            <div className="flight-info__arrival">
              <label className="flight-info__field">
                <span className="flight-info__field-label">{dep.departureDateLabel}</span>
                <input
                  type="date"
                  className="flight-info__input"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                />
              </label>

              <label className="flight-info__field">
                <span className="flight-info__field-label">{dep.departureTimeLabel}</span>
                <input
                  type="time"
                  className="flight-info__input"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </label>

              <label className="flight-info__field">
                <span className="flight-info__field-label">{dep.finalFlightLabel}</span>
                <input
                  type="text"
                  className="flight-info__input"
                  value={depFinalFlightNumber}
                  onChange={(e) => setDepFinalFlightNumber(e.target.value)}
                  placeholder={dep.finalFlightPlaceholder}
                  maxLength={20}
                />
              </label>
            </div>
          </div>

          <div className="flight-info__actions">
            <button
              type="submit"
              className="flight-info__save"
              disabled={status === "saving"}
            >
              {status === "saving" ? fi.saving : fi.save}
            </button>

            {status === "saved" && (
              <p className="flight-info__status is-saved">{fi.saved}</p>
            )}
            {status === "error" && (
              <p className="flight-info__status is-error">{fi.error}</p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
