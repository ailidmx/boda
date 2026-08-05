# Task: Google Sheets → Firestore Safe Sync Tooling

## Goal
Replace the destructive `migrate-guests.mjs` with safe, incremental sync tooling that:
- Uses a single source of truth for field mapping (`sheet-mapping.cjs`)
- Supports dry-run mode with diff reporting
- Uses `setDoc(..., { merge: true })` — never full overwrites
- Preserves Firestore-only fields (message, messageAuthor, cloudinaryId, RSVP responses, _source, _migratedAt)
- Never deletes documents unless `--delete-stale` is explicitly passed
- Validates CSV headers before syncing
- Provides post-sync verification (read-only)

## Checklist
- [x] Analyze current Google Sheets → Firestore data flow (sync_google_sheets.py, migrate-guests.mjs, generate-guests.mjs)
- [x] Identify confirmed problems with current sync (destructive, hardcoded mapping, no validation, no dry-run)
- [x] Present plan for new Google Sheets → Firestore sync item
- [x] Create `scripts/sheet-mapping.cjs` (single source of truth for field mapping)
- [x] Implement `scripts/sync-sheet-to-firestore.mjs` (dry-run, diff, merge, validation)
- [x] Implement `scripts/verify-sheet-sync.mjs` (post-sync verification, read-only)
- [x] Fix ESM/CJS issue (renamed sheet-mapping.js → sheet-mapping.cjs)
- [x] Run dry-run against production — showed 35 `modifiedAt` changes
- [x] Execute first real sync — applied 35 `modifiedAt` updates to guests
- [x] Run verify-sheet-sync — all 4 collections fully in sync (0 mismatches)
- [x] Mark old `migrate-guests.mjs` as DEPRECATED
- [x] Update `integraciones/google_sheets/README.md` with new workflow

## Execution log
- Created `scripts/sheet-mapping.cjs` — single source of truth for CSV → Firestore field mapping
- Created `scripts/sync-sheet-to-firestore.mjs` — safe sync with dry-run, diff, merge, validation
- Created `scripts/verify-sheet-sync.mjs` — read-only post-sync verification
- Fixed ESM/CJS issue: renamed `sheet-mapping.js` → `sheet-mapping.cjs` (root package.json has `"type": "module"`)
- Ran dry-run against production: 220 guests, 13 cabins, 32 rooms, 24 tables — 35 `modifiedAt` changes detected
- Executed sync: 35 guest documents updated with `modifiedAt` values from sheet
- Verified: all 4 collections fully in sync (0 mismatches, 0 missing, 0 stale)
- Marked `web/invitation/scripts/migrate-guests.mjs` as DEPRECATED
- Updated `integraciones/google_sheets/README.md` with the new pull → sync → verify workflow

## Usage
```bash
# 1. Pull CSVs from Google Sheets
python integraciones/google_sheets/sync_google_sheets.py pull

# 2. Dry-run sync (no writes)
~/.nvm/versions/node/v20.20.2/bin/node scripts/sync-sheet-to-firestore.mjs

# 3. Execute sync
~/.nvm/versions/node/v20.20.2/bin/node scripts/sync-sheet-to-firestore.mjs --execute

# 4. Verify (read-only)
~/.nvm/versions/node/v20.20.2/bin/node scripts/verify-sheet-sync.mjs
```
