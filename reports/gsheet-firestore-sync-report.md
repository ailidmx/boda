# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-10T00:16:38.250Z
- Mode: dry-run
- CI mode: yes
- Fail on drift: yes
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 219
- Guests total (Firestore): 259
- Auth users mapped to guest by UID: 219
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 219
- Sheet guests not requiring auth: 40
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
- Stale candidates: 0
- Auth metadata rows: 259
- Writes: 0

## Drift Status

No drift detected for valid rows.

