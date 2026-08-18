# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-15T19:24:51.137Z
- Mode: execute
- CI mode: no
- Fail on drift: no
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 212
- Guests total (Firestore): 263
- Auth users mapped to guest by UID: 212
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 212
- Sheet guests not requiring auth: 51
- Auth records present where firebase.auth is false: 0
- Guests requiring auth but missing it: 0
- Sheet guests requiring auth but missing it (selected scope): 0
- Auth email update candidates (sheet -> auth): 0
- Auth email updates blocked (invalid email): 0
- Auth email updates blocked (email in use): 0
- Auth create candidates (email present): 0
- Auth create blocked (missing sheet email): 0
- Auth create blocked (invalid email): 0
- Auth create blocked (email in use): 0
- Mapping coverage: 100%

## Auth Sync Actions

- Planned auth deletes (missing sheet row or firebase.auth=false): 0
- Planned email updates: 0
- Planned auth creates: 0
- Planned blocked creates (missing email): 0
- Planned blocked email updates (invalid): 0
- Planned blocked email updates (in use): 0
- Planned blocked auth creates (invalid email): 0
- Planned blocked auth creates (email in use): 0
- Applied auth deletes: 0
- Applied email updates: 0
- Applied auth creates: 0
- Auth action failures: 0

## Summary

- Invalid rows skipped (missing UID): 0
- Added candidates: 0
- Changed candidates: 5
- Unchanged: 258
- Stale candidates: 0
- Auth metadata rows: 263
- Writes: 5

## Field Mismatches

### sebastian_cecillon_arevalo

- message: sheet=Cada quien recorre su propio camino, pero hay pasos que están hechos para compartirse. firestore=

### cathy_rako

- identity.lastName: sheet=Le Gales firestore=Rakotonoera
- identity.phone: sheet=523222731351 firestore=
- identity.cloudinaryId: sheet=BOS09_-_Le_gales_qv1u47 firestore=

### isa_38t

- identity.cloudinaryId: sheet=zaza_v6no9u firestore=

### marion_38t

- hosting.cabin: sheet=CABAÑA 2 firestore=VILLA MARGARITA
- hosting.room: sheet=CABAÑA 2-1 firestore=VILLA MARGARITA-2

### william

- hosting.cabin: sheet=CABAÑA 2 firestore=VILLA MARGARITA
- hosting.room: sheet=CABAÑA 2-1 firestore=VILLA MARGARITA-2

## Cabin & Extra Cabin Assignments

| Guest | Cabaña | Cuarto | Xtra Cabaña | Xtra Cuarto |
|---|---|---|---|---|
| marion_38t | CABAÑA 2 | CABAÑA 2-1 |  |  |
| william | CABAÑA 2 | CABAÑA 2-1 |  |  |

## Field-By-Field Record Audit

| ID | Status | Compared Fields | Differences |
|---|---|---:|---:|
| sebastian_cecillon_arevalo | changed | 37 | 1 |
| cathy_rako | changed | 37 | 3 |
| isa_38t | changed | 37 | 1 |
| marion_38t | changed | 37 | 2 |
| william | changed | 37 | 2 |

