# Guest Flight Information / Airport Autocomplete — Full Spec (V1)

> This is the complete spec for the **Guest Flight Information** feature. It is
> referenced from `docs/HUMAN_WANTS.md` (backlog entry) so the backlog stays
> scannable while the full detail lives here.

Implement a **Guest Flight Information** feature for the wedding website.

The objective is **not** to build a flight-booking or flight-tracking system. We
simply need an elegant and easy way for guests to tell us how they are traveling
to **Guadalajara (GDL)** and when they will arrive.

---

## 1. Airport database

Use the free **OurAirports** dataset:

https://ourairports.com/data/

Do **not** introduce a paid airport API or an API requiring a key for V1.

Import/cache the useful airport information locally from the OurAirports CSV
dataset.

Keep at least:

* IATA code
* ICAO code if available
* Airport name
* Municipality / city
* Country
* Country code
* Latitude
* Longitude
* Airport type
* Scheduled-service indicator

For the guest-facing selector, prioritize airports that:

* Have an IATA code.
* Have scheduled passenger service.
* Are relevant commercial airports.

The application should not normally suggest tiny private airstrips, heliports,
etc.

---

## 2. Reusable airport autocomplete

Create a reusable `AirportAutocomplete` component.

A guest must be able to search using:

* City: `Paris`
* IATA code: `CDG`
* Airport name: `Charles de Gaulle`
* Partial strings: `charles`, `guadal`, etc.

Search should be:

* Case-insensitive.
* Accent/diacritic-insensitive where practical.
* Fast and responsive.
* Keyboard accessible.
* Mobile friendly.

Display results in a human-readable format such as:

`Paris — Charles de Gaulle Airport (CDG) · France`

or equivalent according to the existing website design system.

Rank exact IATA matches first.

For example, entering `CDG` should immediately prioritize Charles de Gaulle.

City/name matches should follow.

Do not store only the displayed text. Store the airport's structured
identifiers/data, especially the IATA code.

---

## 3. Flight journey

The destination of the overall journey is:

**Guadalajara International Airport (GDL)**

Allow the guest to describe:

* Direct flight
* 1 connection
* 2 connections
* Up to 3 connections

The UI should remain simple.

Start with:

**Departure airport**

Then provide an intuitive mechanism such as:

`+ Add connection`

Each added connection creates another airport selector.

Maximum: **3 connections**.

Example:

`LYS → CDG → MEX → GDL`

Do not make the guest choose GDL manually as the final destination. It should
already be defined by the application.

Connections should be removable/reorderable if appropriate.

---

## 4. Flight numbers

Allow an **optional flight number for each leg**.

Examples:

* `AF 7365`
* `AF 178`
* `AM 224`

Do not require flight validation in V1.

Do not reject the form because a flight number cannot be verified.

Normalize obvious formatting where useful, but preserve legitimate airline
flight-number formats.

---

## 5. Arrival in Guadalajara

This is the **most important information**.

Create a clearly identifiable final section:

**Arrival in Guadalajara 🇲🇽**

Collect:

* Arrival date
* Expected arrival time
* Final flight number — optional but encouraged

Destination:

`Guadalajara International Airport (GDL)`

The **arrival date and expected arrival time should be required** when the guest
indicates they are arriving by plane.

Make this section especially easy to use on mobile.

---

## 6. Progressive disclosure

Do not overwhelm guests with a large flight form immediately.

The experience should progressively reveal fields.

For example:

`How are you coming to Guadalajara?`

If the guest selects **Plane**, reveal the flight information interface.

Then:

`Where are you flying from?`

After selecting the origin:

`+ Add connection`

And finally:

`Arrival in Guadalajara`

Keep the number of visible fields as small as possible.

---

## 7. Suggested data model

Adapt this to the project's existing architecture rather than introducing an
unnecessary parallel model.

Conceptually:

```ts
type Airport = {
  iata: string;
  icao?: string;
  name: string;
  city?: string;
  country: string;
  countryCode: string;
  latitude?: number;
  longitude?: number;
};

type FlightLeg = {
  from: Airport;
  to: Airport;
  flightNumber?: string;
};

type GuestFlightInfo = {
  origin: Airport;
  connections: Airport[];
  destination: Airport; // GDL

  legs?: FlightLeg[];

  arrivalDate: string;
  arrivalTime: string;
  finalFlightNumber?: string;
};
```

Avoid unnecessary duplication if the existing project already has guest/travel
models.

---

## 8. UX example

A completed journey could visually appear as:

`Lyon LYS → Paris CDG → Mexico City MEX → Guadalajara GDL`

with optional flight information underneath.

For a simpler journey:

`Madrid MAD → Guadalajara GDL`

Guests should be able to complete the form even if they **do not know their
flight numbers**.

The primary information we need is:

**Who is arriving, from where, through which airports if known, and when they
reach Guadalajara.**

---

## 9. No flight API for V1

Do **not** integrate Aviationstack, FlightAware, Amadeus, or another live-flight
provider at this stage.

Design the implementation so flight verification could be added later without
rewriting the guest travel model.

Future enhancement:

`Flight number → lookup → suggest airports/times → guest confirms`

But this is explicitly **out of scope for V1**.

---

## 10. OurAirports data handling

Implement the OurAirports integration cleanly.

Prefer a build/import script that:

1. Downloads or consumes the OurAirports airport CSV.
2. Filters irrelevant records.
3. Normalizes the useful fields.
4. Produces a lightweight airport dataset optimized for autocomplete.
5. Makes updating the airport database straightforward later.

Do not ship unnecessary CSV columns/data to every browser if a smaller generated
JSON/index is sufficient.

Document how to refresh the airport database.

---

## 11. Accessibility

The autocomplete must behave as a proper accessible combobox.

Support:

* Keyboard navigation.
* Arrow Up / Arrow Down.
* Enter to select.
* Escape to close.
* Appropriate focus management.
* Proper labels.
* Appropriate ARIA combobox/listbox semantics.
* `aria-expanded`.
* `aria-controls`.
* `aria-activedescendant` where appropriate.

Do not sacrifice accessibility for custom visual styling.

---

## 12. Validation

Prevent obvious invalid routes such as:

`CDG → CDG`

or repeated consecutive airports.

Maximum connections: **3**.

Flight numbers remain optional.

Arrival date/time in Guadalajara are required for plane travelers.

Display validation errors inline and in the language/style already used by the
website.

---

## 13. Existing project conventions

Before implementing:

1. Inspect the existing repository.
2. Identify the framework, component architecture, design system, form handling,
   validation approach, database/backend and existing guest model.
3. Reuse existing components and conventions wherever possible.
4. Do not install a large dependency for something that can reasonably be
   implemented with the existing stack.
5. Keep the feature modular and reusable.
6. Follow the project's existing localization/i18n architecture.
7. Do not redesign unrelated parts of the website.

---

## 14. Deliverables

Implement the complete V1 feature, including:

* OurAirports import/update mechanism.
* Optimized local airport dataset.
* Reusable airport autocomplete.
* Origin selection.
* 0–3 connections.
* Fixed GDL destination.
* Optional flight numbers.
* Guadalajara arrival date/time.
* Validation.
* Mobile-responsive UI.
* Accessibility.
* Persistence using the project's existing guest data architecture.
* Documentation explaining how to refresh the airport dataset.

After implementation, test at least these searches/routes:

* `CDG`
* `Paris`
* `Charles`
* `LYS`
* `MEX`
* `GDL`
* `Lyon → GDL`
* `LYS → CDG → MEX → GDL`
* A route with three connections
* Adding/removing connections
* Keyboard-only airport selection
* Mobile layout
* Submission without flight numbers

Keep the implementation **simple, polished, free, and maintainable**. The goal
is excellent guest UX and useful arrival information, not aviation-industry-level
flight management.
