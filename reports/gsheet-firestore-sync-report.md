# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-05T23:29:26.594Z
- Mode: dry-run
- CI mode: yes
- Fail on drift: yes
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 223
- Guests total (Firestore): 259
- Auth users mapped to guest by UID: 223
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 223
- Sheet guests not requiring auth: 36
- Auth records present where firebase.auth is false: 0
- Guests requiring auth but missing it: 0
- Sheet guests requiring auth but missing it (selected scope): 0
- Auth email update candidates (sheet -> auth): 0
- Auth email updates blocked (invalid email): 1
- Auth email updates blocked (email in use): 0
- Auth create candidates (email present): 0
- Auth create blocked (missing sheet email): 0
- Auth create blocked (invalid email): 0
- Auth create blocked (email in use): 0
- Mapping coverage: 100%

### Auth Email Updates Blocked (Invalid Email)

| UID | Invitation Group | Sheet Email | Auth Email |
|---|---|---|---|
| cyrielle_rigollet | Famille Rigollet | t juletcy69@gmail.com | cyrielle_rigollet@boda-david-y-ayde.web.app |

## Auth Sync Actions

- Planned auth deletes (missing sheet row or firebase.auth=false): 0
- Planned email updates: 0
- Planned auth creates: 0
- Planned blocked creates (missing email): 0
- Planned blocked email updates (invalid): 1
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
- Changed candidates: 2
- Unchanged: 257
- Stale candidates: 0
- Auth metadata rows: 259
- Writes: 0

## Field Mismatches

### pierre_wanecque

- identity.middleName: sheet=Thomas Nicolas firestore=
- identity.maternalLastName: sheet=D'Ascencao firestore=

### marido_de_guillemette_renard

- identity.phone: sheet=33633011221 firestore=33629248588

## Field-By-Field Record Audit

| ID | Status | Compared Fields | Differences |
|---|---|---:|---:|
| pierre_wanecque | changed | 37 | 2 |
| marido_de_guillemette_renard | changed | 37 | 1 |

