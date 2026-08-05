# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-05T00:04:38.662Z
- Mode: execute
- CI mode: yes
- Fail on drift: yes
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 223
- Guests total (Firestore): 269
- Auth users mapped to guest by UID: 223
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 223
- Sheet guests not requiring auth: 36
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
- Changed candidates: 0
- Unchanged: 259
- Stale candidates: 10
- Auth metadata rows: 259
- Writes: 10

## Stale In Firestore

- gael
- hijo_de_fanny
- jesus_de_guadalupe
- leonard_de_carne
- luca
- mama_tina_guadalupe
- papa_kao_guadalupe
- pareja_de_fred_bonpard
- sofía_de_guadalupe
- valentina_de_juárez

## Field-By-Field Record Audit

| ID | Status | Compared Fields | Differences |
|---|---|---:|---:|
| gael | candidate-delete | 37 | 37 |
| hijo_de_fanny | candidate-delete | 37 | 37 |
| jesus_de_guadalupe | candidate-delete | 37 | 37 |
| leonard_de_carne | candidate-delete | 37 | 37 |
| luca | candidate-delete | 37 | 37 |
| mama_tina_guadalupe | candidate-delete | 37 | 37 |
| papa_kao_guadalupe | candidate-delete | 37 | 37 |
| pareja_de_fred_bonpard | candidate-delete | 37 | 37 |
| sofía_de_guadalupe | candidate-delete | 37 | 37 |
| valentina_de_juárez | candidate-delete | 37 | 37 |

