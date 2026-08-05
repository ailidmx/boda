# Architecture Audit & Refactoring Plan — David & Aydé Wedding App

**Date:** 2026-03-08
**Scope:** Full repository audit and incremental refactoring.
**Status:** Audit complete. Implementation in progress — see "Implementation status" below.


---

## 1. Executive summary

The repository contains a **production-oriented wedding web application** built with **React + TypeScript + CSS Modules + Firebase (Auth, Firestore, Hosting)**. It is organized as **three separate Vite applications** under `web/`:

- `web/invitation` — the **guest-facing** invitation experience (React + JSX, not TypeScript).
- `web/dashboard` — the **back-office** dashboard for the couple (vanilla JS, not React).
- `web/interface` — a **public marketing/landing site** (React + JSX).

The application is **functional and well-structured in several respects**: Firestore Security Rules are unusually detailed, with field-level allowlists, `hasOnly()`/`diff().affectedKeys()` enforcement, server-timestamp checks, and a clear guest-vs-couple access model. The guest-facing app correctly scopes `guests` reads to the signed-in guest's invitation group via a query-compatible rule. The couple's dashboard is protected at the data layer by `isCouple()` in the rules.

**However, the audit found several confirmed security and privacy problems that should be treated as immediate priorities:**

1. **P0 — Public read on all guest-submission collections.** `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`, and `attendance_responses` all declare `allow read: if true`. Any anonymous user can read **every** guest's RSVP (full name, email, phone, travel itinerary, meal choices), experience suggestions, coast interest, petanque participation, and per-day attendance. This is a confirmed personal-data exposure.

2. **P0 — Dangerous default rule.** The catch-all `match /{document=**}` grants `allow read: if true` to **every collection not explicitly matched**, and `allow write: if isCouple()`. Any future collection is publicly readable by default. This is a confirmed foot-gun.

3. **P0 — Guest reads the entire `attendance_responses` collection.** `web/invitation/src/guest-attendance.js` `loadAttendanceResponses()` calls `getDocs(collection(db, "attendance_responses"))` with no filter, and it is invoked in the guest bootstrap (`AppContext.jsx`). Combined with `allow read: if true`, every guest can see every other guest's attendance. This is a confirmed privacy violation.

4. **P1 — Dashboard authorization is client-side only.** `web/dashboard/src/dashboard.js` gates the dashboard UI with `isNovioGuest()` (a check against a static in-repo guest registry) and a hardcoded `DASHBOARD_CODE = "vivelafrance"` (which is **dead code** — never used). The real security boundary is `isCouple()` in the rules, which is correct, but the client-side gate is not a security boundary and the dead code should be removed.

4b. **P1 — `isCouple()` is outdated and should be replaced with the `isAdmin` field.** The rules identify the couple by a hardcoded list of two guest IDs (`david_aïli`, `aydé_juárez_guadalupe`) in `isCouple()`. The `guests` collection already carries an `isAdmin` boolean field (sheet-synced, read-only from the client, and already allowlisted in `hasValidGuestContactFields()`). The intended authorization model is **data-driven**: a guest is an administrator when `guests/{auth.uid}.isAdmin == true`. `isCouple()` should be replaced by an `isAdmin()` rule function that reads `isAdmin` from the caller's own guest document. This decouples admin status from a hardcoded ID list and makes it maintainable without a rules redeploy.


5. **P1 — Invitation codes are hardcoded in the rules.** `hasValidInvitationCode()` embeds 14 invitation codes directly in `firebase/firestore.rules`. Codes are also present in the client. Rotating a code requires a rules redeploy, and the codes are effectively semi-public.

6. **P1 — Query/rules mismatch in dead code.** `web/invitation/src/guests.js` `loadDeletedGuestIds()` reads the full `guests` collection without the required `invitationGroup` filter. It is never called (dead code), so it does not currently break the app, but it is a latent trap and should be removed.

7. **P2 — `invitation_groups` is publicly readable.** `allow read: if true` on `invitation_groups`, and the guest app reads the whole collection (`invitation-profile.js`). Group content may include personalized content intended only for that group.

**Recommended direction:** Retain React, TypeScript, and CSS Modules (no concrete blocker found). Do **not** rewrite the app. Instead, apply an **incremental, phased migration** that (a) tightens the Security Rules to remove public reads and the broad default, (b) scopes guest reads to the minimum required data, (c) removes dead code and the unused dashboard code, (d) centralizes Firestore paths and payload builders, and (e) adds Firestore Emulator tests for the access model.

**Guest vs. dashboard boundary:** The **data layer** is reasonably separated (guests scoped by group; couple-only writes on admin collections). The **application layer** is not separated: the dashboard is a separate app but its authorization is purely visual, and the guest app reads several collections that should be back-office-only. The boundary is **not yet sufficiently secure** until the P0 public-read issues are closed.

---

## 2. Confirmed technical stack

| Concern | Finding | Evidence |
| --- | --- | --- |
| React | Yes — `web/invitation` and `web/interface` are React apps | `web/invitation/package.json`, `web/interface/package.json` |
| TypeScript | Partial — `web/dashboard` is **vanilla JS**; invitation/interface are JSX (`.jsx`) | `web/dashboard/src/*.js`, `web/invitation/src/*.jsx` |
| CSS Modules | Yes — invitation uses CSS Modules | `web/invitation/src/**/*.module.css` |
| Build tool | **Vite** (three separate apps) | `web/*/vite.config.js` |
| Routing | **Hash/path-based manual routing** (no React Router) | `web/dashboard/src/dashboard.js` `PATH_TO_TAB`; invitation uses internal state |
| State management | **React Context + local state** (invitation); plain module-level `state` object (dashboard) | `web/invitation/src/context/AppContext.jsx`; `web/dashboard/src/dashboard.js` `const state = {...}` |
| Data fetching | **Direct Firestore SDK** (no React Query/SWR/Redux/Zustand) | `import { ... } from "firebase/firestore"` throughout |
| Form library | **None** — native forms + manual handlers | `web/invitation/src/components/*.jsx` |
| Validation library | **None** — validation is done in Firestore Security Rules + manual JS | `firebase/firestore.rules` |
| Firebase SDK | **Firebase Web SDK v10/11** (modular) | `web/*/package.json` |
| Firebase init | Per-app `firebase.js` initializing `initializeApp` + `getFirestore` + `getAuth` | `web/invitation/src/firebase.js`, `web/dashboard/src/firebase.js` |
| Auth | **Email/password per-guest accounts**; UID = guest ID | `web/invitation/src/auth/*`; rules `isInvitedGuest()` |
| Firestore | **Yes** — `guests`, `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`, `attendance_responses`, `invitation_groups`, `rooms`, `thanks` | `firebase/firestore.rules` |
| Storage | **Cloudinary** (external), not Firebase Storage | `web/invitation/src/cloudinary-upload.js` |
| Cloud Functions / Admin SDK | **None found** in the app runtime. Admin SDK used only in **local scripts** (`scripts/*.mjs`) | `scripts/` |
| Hosting | **Firebase Hosting** | `firebase.json`, `.firebaserc` |
| Env config | **Hardcoded config** in `firebase.js` (no `.env`); some values in `web/dashboard/src/guests.js` | `web/*/src/firebase.js` |
| Emulator | **Rules tests** use `@firebase/rules-unit-testing` (v5) | `web/invitation/tests/` (rules test suite, 13 tests) |
| Tests | **Firestore Rules tests only** (13 passing). No unit/component/e2e tests | `web/invitation/tests/` |
| CI/CD | **None found** | — |
| Lint/format | **None configured** (no ESLint/Prettier config found) | — |
| Logging/monitoring | **`console.warn`/`console.error` only**; no error-monitoring tool | throughout |

**Framework retention:** React, TypeScript, and CSS Modules should be **retained**. No concrete blocker was found that would justify a framework or styling-stack migration. The dashboard is vanilla JS and could be migrated to React/TypeScript for consistency, but that is a maintainability improvement, not a requirement.

---

## 3. Current architecture map

### Guest-facing application (`web/invitation`)
- **Bootstrap:** `src/main.jsx` → `AppContext.jsx` (auth + data bootstrap).
- **Auth:** per-guest email/password; UID = guest ID.
- **Data access:** direct Firestore calls in feature modules (`guest-profiles.js`, `guest-attendance.js`, `rooms.js`, `invitation-profile.js`, `submit-forms.js`, `guests.js`).
- **Components:** `src/components/*.jsx` (Hero, RSVP, Coast, Petanque, etc.).
- **CSS Modules:** `src/**/*.module.css`.

### Back-office dashboard (`web/dashboard`)
- **Bootstrap:** `src/main.js` → `startDashboard()`.
- **Auth:** reuses the same Firebase Auth session as the invitation; gates UI with `isNovioGuest()` (client-side only).
- **Data access:** direct Firestore reads of `guests`, `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`, `invitation_groups`, `rooms`; `onSnapshot` on `invitation_groups`.
- **Static guest registry:** `src/guests.js` (a large hardcoded array, duplicated with the invitation's `guests.js`).

### Public marketing site (`web/interface`)
- Static/landing content; minimal Firestore interaction.

### Shared infrastructure
- **Firestore Rules:** `firebase/firestore.rules` (single source of truth for access).
- **Indexes:** `firebase/firestore.indexes.json`.
- **Local scripts:** `scripts/*.mjs` (Admin SDK for provisioning auth users, inspecting DB, migrations, backups).
- **Docs:** `docs/` (schema, access model, invitations, etc.).

### Server-side infrastructure
- **None in production.** No Cloud Functions, no callable functions, no API routes. All privileged operations are either (a) done via the couple's client session under `isCouple()` rules, or (b) done offline via Admin SDK scripts.

---

## 4. Firestore entry-point inventory

| File | Function | App area | Read/write | Collection/path | Operation | Security context | Concerns |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `web/invitation/src/submit-forms.js` | `submitRsvp` | guest | write (create) | `rsvp_submissions` | `addDoc` | invited guest | OK; allowlisted payload |
| `web/invitation/src/submit-forms.js` | `submitPetanque` | guest | write (create) | `petanque_participation` | `addDoc` | invited guest | OK |
| `web/invitation/src/submit-forms.js` | `submitCoast` | guest | write (create) | `coast_interest` | `addDoc` | invited guest | OK |
| `web/invitation/src/guest-profiles.js` | `loadGuestProfiles` | guest | read (subscription) | `guests` | `onSnapshot` + `where(invitationGroup==)` | invited guest | OK; query-compatible |
| `web/invitation/src/guest-profiles.js` | `saveGuestContact`/`saveGuestPhoto`/`saveGuestMessage`/`saveGuestIdCheck` | guest | write (update) | `guests/{id}` | `setDoc` (merge) | invited guest | OK; allowlisted |
| `web/invitation/src/guest-attendance.js` | `loadAttendanceResponses` | guest | read (full collection) | `attendance_responses` | `getDocs` (no filter) | invited guest | **P0: reads all guests' attendance** |
| `web/invitation/src/guest-attendance.js` | `saveAttendance` | guest | write (upsert) | `attendance_responses/{guestId}` | `setDoc` (merge) | invited guest | OK |
| `web/invitation/src/rooms.js` | `loadRooms` | guest | read (full collection) | `rooms` | `getDocs` | public | OK (public content) |
| `web/invitation/src/invitation-profile.js` | `loadGroupCustomContent` | guest | read (full collection) | `invitation_groups` | `getDocs` | public | **P2: all group content readable** |
| `web/invitation/src/guests.js` | `loadDeletedGuestIds` | guest | read (full collection) | `guests` | `getDocs` (no filter) | invited guest | **P1: dead code; query/rules mismatch** |
| `web/dashboard/src/dashboard.js` | `loadDashboardData` | back office | read (full collections) | `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation` | `getDocs` | couple | OK (couple) |
| `web/dashboard/src/dashboard.js` | `onSnapshot` | back office | read (subscription) | `invitation_groups` | `onSnapshot` | couple | OK |
| `web/dashboard/src/rooms.js` | `loadRooms` | back office | read (full collection) | `rooms` | `getDocs` | couple | OK |
| `web/dashboard/src/dashboard.js` | guest table | back office | read (full collection) | `guests` | `getDocs` | couple | OK (couple) |
| `scripts/*.mjs` | various | server (offline) | read/write | `guests`, `attendance_responses`, etc. | Admin SDK | Admin SDK | **Rules do not apply to Admin SDK** |

---

## 5. Current Firestore data model

### Root collections

| Entity | Collection path | ID strategy | Used by | Guest-visible fields | Back-office fields | Server-controlled fields |
| --- | --- | --- | --- | --- | --- | --- |
| Guest | `guests/{guestId}` | guest ID (from sheet `ID` column); UID = guestId | both | firstName, lastName, phone, cloudinaryId, messageAuthor, idCheckUser, invitationGroup, guestId, updatedBy, updatedAt, _deleted | id, lang, age, gender, tagGroup, cabin, room, table, sent, xtraCabin, xtraRoom, modifiedAt, travelsByPlane, isAdmin, isCabinPaid*, message, rsvp | sheet-synced fields (Admin SDK) |
| RSVP | `rsvp_submissions/{submissionId}` | auto (`addDoc`) | both | all fields (currently public read) | — | createdAt, schemaVersion |
| Experience suggestion | `experience_suggestions/{submissionId}` | auto | both | all fields (currently public read) | — | createdAt, schemaVersion |
| Coast interest | `coast_interest/{submissionId}` | auto | both | all fields (currently public read) | — | createdAt, schemaVersion |
| Petanque participation | `petanque_participation/{submissionId}` | auto | both | all fields (currently public read) | — | createdAt, schemaVersion |
| Attendance response | `attendance_responses/{guestId}` | guest ID | both | friday, saturday, sunday, invitationGroup, updatedBy, language, schemaVersion, updatedAt (currently public read) | — | updatedAt |
| Invitation group | `invitation_groups/{groupId}` | group ID | both | all content (currently public read) | — | — |
| Room | `rooms/{roomId}` | room ID | both | id, cabin, description, capacity, isShared | — | — |
| Thanks | `thanks/{creditId}` | credit ID | both | all (public read) | — | — |

### Relationships
- **Guest → Invitation group:** `guests.invitationGroup` (string) links a guest to `invitation_groups/{invitationGroup}`.
- **Guest → Attendance:** `attendance_responses/{guestId}` keyed by guest ID.
- **Auth → Guest:** Firebase Auth UID = guest ID (`guests/{auth.uid}`).

### Document ID strategies
- `guests`, `attendance_responses`, `rooms`, `invitation_groups`, `thanks`: **explicit IDs** (guest ID / room ID / group ID / credit ID).
- `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`: **auto-generated** (`addDoc`).

### Key fields
- **Ownership/tenant:** `invitationGroup` (guest scoping).
- **Role:** `isAdmin` (sheet-synced, read-only from client), `isNovio` (in static registry only, not in Firestore).
- **Status:** `_deleted` (soft delete), `rsvp` (sheet-synced map).
- **Timestamps:** `createdAt`, `updatedAt`, `modifiedAt` (Firestore `Timestamp` via `serverTimestamp()`).
- **Payment:** `isCabinPaid`, `isCabinPaidByNovios`, `isXtraCabinPaid*` (sheet-synced, read-only from client).

---

## 6. Access-control matrix

| Entity/operation | Anonymous | Authenticated guest (own group) | Admin (`isAdmin == true`) | Server (Admin SDK) | Current enforcement | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| `guests` read | deny | own group only (query-compatible) | all | all | rules `isCouple()` / group match | **P1: `isCouple()` should be `isAdmin()`** |
| `guests` write | deny | own group, allowlisted fields | all, allowlisted fields | all | rules | none confirmed |
| `guests` delete | deny | deny | allow | all | rules | none confirmed |
| `rsvp_submissions` read | **allow** | **allow** | allow | all | `allow read: if true` | **P0: public read of PII** |
| `rsvp_submissions` create | deny | invited guest | invited guest | all | rules | none confirmed |
| `experience_suggestions` read | **allow** | **allow** | allow | all | `allow read: if true` | **P0: public read** |
| `coast_interest` read | **allow** | **allow** | allow | all | `allow read: if true` | **P0: public read** |
| `petanque_participation` read | **allow** | **allow** | allow | all | `allow read: if true` | **P0: public read** |
| `attendance_responses` read | **allow** | **allow** | allow | all | `allow read: if true` | **P0: public read + guest reads all** |
| `attendance_responses` write | deny | own group | own group | all | rules | none confirmed |
| `invitation_groups` read | **allow** | **allow** | allow | all | `allow read: if true` | **P2: all group content public** |
| `rooms` read | allow | allow | allow | all | `allow read: if true` | acceptable (public content) |
| `thanks` read | allow | allow | allow | all | `allow read: if true` | acceptable (public content) |
| Any unlisted collection read | **allow** | **allow** | allow | all | default `match /{document=**}` | **P0: broad default** |
| Any unlisted collection write | deny | deny | allow | all | default `match /{document=**}` | acceptable |


---

## 7. Confirmed anti-patterns

### A. Public read on guest-submission collections (P0)
- **File:** `firebase/firestore.rules`
- **Location:** `match /rsvp_submissions/{submissionId}`, `match /experience_suggestions/{submissionId}`, `match /coast_interest/{submissionId}`, `match /petanque_participation/{submissionId}`, `match /attendance_responses/{guestId}` — all `allow read: if true`.
- **App area:** guest-facing + back office.
- **Impact:** Any anonymous user can read all guests' RSVP data (names, emails, phones, travel itineraries, meal choices), suggestions, coast interest, petanque participation, and per-day attendance. **Personal-data exposure.**
- **Severity:** Critical.

### B. Broad default rule (P0)
- **File:** `firebase/firestore.rules`
- **Location:** `match /{document=**} { allow read: if true; allow write: if isCouple(); }`
- **App area:** shared.
- **Impact:** Every collection not explicitly matched is publicly readable. Any future collection is exposed by default. Violates "deny by default."
- **Severity:** Critical.

### C. Guest reads entire `attendance_responses` collection (P0)
- **File:** `web/invitation/src/guest-attendance.js`
- **Function:** `loadAttendanceResponses()`
- **App area:** guest-facing.
- **Impact:** Every guest downloads every other guest's attendance. Combined with the public-read rule, this is a confirmed privacy violation and a performance/cost concern (full collection read on every guest bootstrap).
- **Severity:** Critical.

### D. Dashboard authorization is client-side only (P1)
- **File:** `web/dashboard/src/dashboard.js`
- **Functions:** `startDashboard()`, `isNovioGuest()`, `renderAccessDenied()`
- **App area:** back office.
- **Impact:** The dashboard UI gate is purely visual (checks a static in-repo registry). The real security is `isCouple()` in the rules, which is correct. But the client-side gate is not a security boundary, and `DASHBOARD_CODE = "vivelafrance"` is dead code.
- **Severity:** Medium (security is enforced at the data layer, but the client gate is misleading and the dead code should be removed).

### E. Invitation codes hardcoded in rules (P1)
- **File:** `firebase/firestore.rules`
- **Function:** `hasValidInvitationCode()`
- **App area:** shared.
- **Impact:** 14 invitation codes are embedded in the rules. Rotating a code requires a rules redeploy. Codes are also present in the client, so they are semi-public by design. This couples business configuration to the security layer.
- **Severity:** Medium.

### F. Query/rules mismatch in dead code (P1)
- **File:** `web/invitation/src/guests.js`
- **Function:** `loadDeletedGuestIds()`
- **App area:** guest-facing.
- **Impact:** Reads the full `guests` collection without the required `invitationGroup` filter. Would fail for regular guests (rules are not filters). It is never called, so it is dead code, but it is a latent trap.
- **Severity:** Low (dead code) but should be removed.

### G. Duplicated static guest registry (P2)
- **Files:** `web/invitation/src/guests.js` and `web/dashboard/src/guests.js`
- **App area:** both.
- **Impact:** Two large hardcoded guest arrays that must be kept in sync manually. Drift risk; the dashboard's `isNovioGuest()` depends on this registry. This is a maintainability concern.
- **Severity:** Medium (maintainability).

### H. Direct Firestore access inside components/modules (P2)
- **Files:** `web/invitation/src/guest-profiles.js`, `guest-attendance.js`, `rooms.js`, `invitation-profile.js`, `submit-forms.js`; `web/dashboard/src/dashboard.js`
- **App area:** both.
- **Impact:** Firestore collection paths, document paths, and raw payloads are scattered across feature modules. No central path/contract layer. This is a maintainability concern, not a security issue (rules still enforce access).
- **Severity:** Medium (maintainability).

---

## 8. Suspected issues requiring verification

- **`isCouple()` performance:** The rule calls `get(guests/{auth.uid})` on every write. For high-frequency writes this adds a read per operation. Not a correctness issue; verify whether it matters at this scale.
- **`isCouple()` on non-existent guest doc:** If an authenticated user has no `guests/{uid}` doc, `get(...).data` is null and the rule errors → deny. This is safe (deny) but should be verified to not cause confusing errors.
- **`invitation_groups` content sensitivity:** Whether group content is truly public or should be group-scoped requires product confirmation.
- **`thanks` and `rooms` public read:** Likely intentional (public content), but confirm no sensitive fields.
- **`web/interface` Firestore usage:** Not fully audited; verify it does not read sensitive collections.
- **Offline persistence:** Not confirmed whether `enableIndexedDbPersistence` is used; verify offline behavior expectations.
- **`rsvp` field on `guests`:** Sheet-synced map; verify it does not contain sensitive data exposed via the group-scoped read.

---

## 9. Schema inconsistencies

| Entity | Field/concept | Definition A | Definition B | Impact | Recommended canonical definition |
| --- | --- | --- | --- | --- | --- |
| Guest | Group name | `group` (static registry) | `invitationGroup` (Firestore) | Two sources of truth; drift risk | `invitationGroup` (Firestore) |
| Guest | Name | `nombre`/`apellido` (registry, Spanish) | `firstName`/`lastName` (Firestore, English) | Two naming conventions | `firstName`/`lastName` (Firestore) |
| Guest | Admin flag | `isNovio` (registry only) | `isAdmin` (Firestore, bool) | `isNovio` not in Firestore; rules use hardcoded `isCouple()` ID list | **`isAdmin` (Firestore)** — replace `isCouple()` with an `isAdmin()` rule function |

| Guest | Payment | `payment` (registry, "porpagar") | `isCabinPaid*` (Firestore, bool) | Two representations | `isCabinPaid*` (Firestore) |
| Guest | Cabin | `unit`/`cabinLabel`/`room` (registry) | `cabin`/`room` (Firestore) | Two representations | `cabin`/`room` (Firestore) |
| Guest | Soft delete | `_deleted` (Firestore) | `loadDeletedGuestIds` (dead code) | Dead code reads full collection | remove dead code |
| Timestamps | `createdAt`/`updatedAt` | Firestore `Timestamp` (serverTimestamp) | `modifiedAt` (sheet) | Mixed | `serverTimestamp()` for client writes; `modifiedAt` sheet-synced |

**Note:** The static registries (`guests.js` in both apps) are **not** the canonical schema. The canonical schema is the Firestore `guests` collection as enforced by `hasValidGuestContactFields()` in the rules. The registries are a **client-side convenience/duplication** and a source of drift.

---

## 10. Security assessment

- **Authentication:** Per-guest email/password accounts; UID = guest ID. Sound approach for a guest-facing invitation.
- **Guest authorization:** `guests` reads are correctly scoped to the signed-in guest's invitation group via a query-compatible rule. Guest writes are allowlisted to specific fields. **Good.**
- **Dashboard authorization:** The data layer is protected by `isCouple()` (correct today), but `isCouple()` is **outdated** — it should be replaced by an `isAdmin()` rule function that reads `guests/{auth.uid}.isAdmin`. The **UI layer** is client-side only (`isNovioGuest()`), which is not a security boundary. **Acceptable at the data layer, but the client gate is misleading and the admin model should be data-driven.**
- **Security Rules:** Detailed and field-level for `guests`. **However**, the submission collections and the default rule grant public read. **This is the main weakness.**
- **Privileged writes:** The couple can write to any collection via `isCouple()`. This is intentional but broad; consider narrowing to explicit collections and basing it on `isAdmin`.
- **Admin SDK usage:** Only in offline scripts. **Rules do not apply to Admin SDK** — this is expected and correct, but any future Cloud Function must enforce its own authorization.
- **Public access:** Public read on submission collections and the default rule. **Confirmed exposure.**
- **Role escalation risk:** Low — `isAdmin` is sheet-synced and read-only from the client (not writable by guests), so an `isAdmin()`-based rule is safe from client escalation.

- **Internal data exposure:** `guests` contains `isAdmin`, payment flags, cabin/room/table assignments. These are protected from other guests by the group-scoped read rule. **Good**, but the submission collections leak PII.

---

## 11. Data integrity assessment

- **Overwrite risk:** Guest profile writes use `setDoc(..., { merge: true })` with allowlisted payloads — **low risk**. No full-document overwrites of `guests` found.
- **Unsafe updates:** None confirmed. Payload builders in `submit-forms.js` are allowlisted.
- **Concurrency risk:** Attendance and RSVP are single-document writes; no counters or read-modify-write flows found. **Low risk.**
- **Malformed data:** Rules enforce field types and lengths for `guests` and submissions. **Good.**
- **Import risk:** CSV/JSON imports are handled by offline Admin SDK scripts with backups (`backups/`). **Good practice.**
- **Timestamp risk:** Client writes use `serverTimestamp()`; rules enforce `createdAt == request.time` / `updatedAt == request.time`. **Good.**
- **Document design risk:** No oversized documents or embedded collections found. **Good.**

---

## 12. React architecture assessment

- **Component responsibilities:** Invitation components are reasonably focused (Hero, RSVP, Coast, Petanque). Business/data logic lives in feature modules, not in components. **Good.**
- **Hooks:** The invitation uses React Context (`AppContext.jsx`) for bootstrap. No custom data hooks; data access is via feature modules. **Acceptable.**
- **State management:** React Context + local state for the invitation; a module-level `state` object for the dashboard. No server-state cache library. **Acceptable at this scale.**
- **Routing:** Manual path-based routing in the dashboard; the invitation uses internal state. No React Router. **Acceptable.**
- **Subscriptions:** `onSnapshot` on `guests` (group-scoped) and `invitation_groups` (dashboard). Cleanup is handled (`groupsUnsub` stored; `loadGuestProfiles` returns an unsubscribe). **Acceptable**, but verify the invitation's `onSnapshot` cleanup on route/unmount.
- **Feature boundaries:** Guest and dashboard are separate apps. **Good.**
- **Guest/dashboard separation:** Separate apps, but the dashboard reuses the guest auth session and its authorization is client-side. **Needs hardening at the application layer.**

---

## 13. CSS Modules assessment

- CSS Modules are used consistently in the invitation. No global leakage or excessive `:global` found. No concrete reason to migrate. **Retain.**
- Minor: no shared design-token layer; some hard-coded values. This is a maintainability nicety, not a blocker.

---

## 14. Performance and cost assessment

- **Guest-facing:**
  - **P0:** `loadAttendanceResponses()` reads the entire `attendance_responses` collection on every guest bootstrap — unnecessary data transfer and cost.
  - `loadGuestProfiles()` is group-scoped (good).
  - `loadRooms()` and `loadGroupCustomContent()` read full collections (small, acceptable).
- **Back-office:**
  - Dashboard reads full collections (`guests`, submissions) with no pagination. Acceptable at this scale (~200 guests), but will not scale.
  - `onSnapshot` on `invitation_groups` is a single small collection. Acceptable.
- **Indexes:** `firebase/firestore.indexes.json` exists; verify it covers the `guests` group-scoped query and any new queries.
- **Duplicate reads:** The static guest registries duplicate Firestore data in the client. Drift risk.

---

## 15. Target architecture

Adapted to the actual repository (three Vite apps, no server runtime). The target is **incremental**, not a rewrite:

```
Guest app (web/invitation)          Dashboard (web/dashboard)
        │                                   │
        ▼                                   ▼
  Feature modules                     Feature modules
  (guest-profiles, attendance,        (dashboard.js, rooms.js)
   submit-forms, rooms, ...)
        │                                   │
        ▼                                   ▼
  Firestore paths + payload builders   Firestore paths + payload builders
  (centralized, allowlisted)           (centralized, allowlisted)
        │                                   │
        ▼                                   ▼
  Firebase Web SDK                    Firebase Web SDK
        │                                   │
        ▼                                   ▼
  Firestore Security Rules            Firestore Security Rules
  (deny-by-default, scoped reads)     (isAdmin() for admin)

        │                                   │
        ▼                                   ▼
  Cloud Firestore                     Cloud Firestore
```

**Key principles for the target:**
1. **Deny by default** in the rules; remove the broad `match /{document=**}` public read.
2. **Scope guest reads** to the minimum required data (fix `attendance_responses`).
3. **Centralize Firestore paths** and **payload builders** per feature (already partially done in `submit-forms.js`; extend to `guest-profiles.js`, `guest-attendance.js`).
4. **Replace `isCouple()` with an `isAdmin()` rule function** that reads `guests/{auth.uid}.isAdmin`; keep the dashboard protected at the data layer; remove the misleading client-side gate and dead code.

5. **Do not introduce** a server runtime, Cloud Functions, a state-management library, or a validation library unless a concrete need emerges. The rules already provide runtime validation.
6. **Retain** React, TypeScript, CSS Modules.

---

## 16. Detailed migration plan

### Priority 0 — Immediate security risks

| Step | Priority | Problem | App area | Affected files | Proposed change | Risk | Dependencies | Tests | Data migration | Deployment order | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | Public read on submission collections | security | `firebase/firestore.rules` | Restrict `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`, `attendance_responses` reads to `isCouple()` (back-office only) | Low | none | rules tests | none | Rules first (backward-compatible: dashboard is couple) | Revert rules |
| 2 | P0 | Broad default rule | security | `firebase/firestore.rules` | Change `match /{document=**}` to deny read/write by default; explicitly allow public collections (`rooms`, `thanks`) | Medium | none | rules tests | none | Rules first | Revert rules |
| 3 | P0 | Guest reads all attendance | guest-facing | `web/invitation/src/guest-attendance.js`, `web/invitation/src/context/AppContext.jsx` | Scope `loadAttendanceResponses()` to the signed-in guest's own group (query by `invitationGroup`) or read only the guest's own doc | Low | Step 1 (rules) | rules tests | none | Client after rules | Revert client change |
| 4 | P0 | Broad default rule + public reads | security | `firebase/firestore.rules` | Add explicit `allow read` only for genuinely public collections (`rooms`, `thanks`); deny everything else by default | Medium | none | rules tests | none | Rules first | Revert rules |

### Priority 1 — Data integrity & dead code

| Step | Priority | Problem | App area | Affected files | Proposed change | Risk | Dependencies | Tests | Data migration | Deployment order | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | P1 | Dead code `loadDeletedGuestIds` | guest-facing | `web/invitation/src/guests.js` | Remove the unused function (and any unused imports) | Low | none | build | none | Client | Revert |
| 6 | P1 | Unused `DASHBOARD_CODE` | back office | `web/dashboard/src/dashboard.js` | Remove the unused constant | Low | none | build | none | Client | Revert |
| 7 | P1 | Invitation codes in rules | security | `firebase/firestore.rules` | (Optional, product decision) Move codes to a `config` collection readable by the couple and validated server-side; or keep in rules but document rotation process | Medium | product decision | rules tests | none | Rules | Revert |
| 7b | P1 | `isCouple()` outdated (hardcoded ID list) | security | `firebase/firestore.rules` | Replace `isCouple()` with an `isAdmin()` rule function that reads `guests/{auth.uid}.isAdmin == true`; update all `allow` clauses that reference `isCouple()` | Medium | none | rules tests | none | Rules first (backward-compatible: both admins have `isAdmin == true`) | Revert rules |


### Priority 2 — Guest/back-office separation

| Step | Priority | Problem | App area | Affected files | Proposed change | Risk | Dependencies | Tests | Data migration | Deployment order | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | P2 | `invitation_groups` public read | guest-facing | `firebase/firestore.rules`, `web/invitation/src/invitation-profile.js` | Scope `invitation_groups` reads to the signed-in guest's own group (query-compatible rule) | Medium | product confirmation | rules tests | none | Rules first | Revert |
| 9 | P2 | Duplicated static guest registry | both | `web/invitation/src/guests.js`, `web/dashboard/src/guests.js` | Consolidate to a single source (Firestore `guests`); remove or shrink the static registries | Medium | none | build | none | Client | Revert |

### Priority 3 — Architecture consolidation

| Step | Priority | Problem | App area | Affected files | Proposed change | Risk | Dependencies | Tests | Data migration | Deployment order | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | P3 | Scattered Firestore paths | shared | `web/invitation/src/*`, `web/dashboard/src/*` | Introduce a small `firestore/paths.js` + per-feature payload builders (extend the pattern already in `submit-forms.js`) | Low | none | build | none | Client | Revert |
| 11 | P3 | No runtime schema in client | shared | new `web/invitation/src/validation/` | Add lightweight runtime validators for guest-facing payloads (mirroring the rules) | Low | none | unit tests | none | Client | Revert |

### Priority 4 — Security hardening

| Step | Priority | Problem | App area | Affected files | Proposed change | Risk | Dependencies | Tests | Data migration | Deployment order | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | P4 | No rules tests for new rules | security | `web/invitation/tests/` | Add Firestore Emulator tests covering: anonymous read denied on submissions; guest read of own group only; couple read of all; guest write of protected fields denied | Low | none | rules tests | none | Test-only | Revert |
| 13 | P4 | Broad `isCouple()` write scope | security | `firebase/firestore.rules` | (Optional) Narrow couple writes to explicit collections instead of the catch-all | Medium | product decision | rules tests | none | Rules | Revert |

### Priority 5 — Performance & maintainability

| Step | Priority | Problem | App area | Affected files | Proposed change | Risk | Dependencies | Tests | Data migration | Deployment order | Rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 | P5 | Dashboard full-collection reads | back office | `web/dashboard/src/dashboard.js` | Add pagination/limits to dashboard tables (only if scale requires) | Low | none | build | none | Client | Revert |
| 15 | P5 | No CI/lint | shared | new `.github/workflows/`, `eslint` config | Add lint + build + rules-test CI | Low | none | CI | none | Infra | Revert |

---

## 17. Deployment plan

**Ordering principle:** Deploy **Rules first** when the change is backward-compatible with the current client, then deploy the client. For the P0 fixes:

1. **Step 1 (restrict submission reads to `isCouple()`):** Deploy rules first. The dashboard (couple) still reads these collections, so it keeps working. The guest app does not read these collections for display (it only writes them), so no guest breakage. **Backward-compatible.**
2. **Step 2 (deny-by-default):** Deploy rules first. Explicitly allow `rooms` and `thanks` (public content) so the guest app keeps working. **Backward-compatible.**
3. **Step 3 (scope attendance reads):** Deploy client after rules. The guest app must query `attendance_responses` by `invitationGroup` (or read only its own doc) to match the new rule. **Client after rules.**
4. **Rollback:** Revert the rules file (and redeploy) to restore public reads if a regression is found. Revert the client change if needed.

**Schema changes:** No collection/field renames are proposed. No data migration is required for the P0/P1 fixes. If invitation codes are moved to a `config` collection (Step 7), that requires a backfill and a rules update, deployed in the order: prepare config → deploy rules → backfill → validate → cleanup.

---

## 18. Test plan

- **Firestore Emulator tests (existing suite, extend):**
  - Anonymous read of `rsvp_submissions` → **denied** (after Step 1).
  - Anonymous read of `attendance_responses` → **denied**.
  - Guest read of `attendance_responses` filtered by own group → **allowed**.
  - Guest read of `attendance_responses` without filter → **denied** (query/rules mismatch).
  - Guest read of another group's `guests` → **denied**.
  - Guest write of protected `guests` fields (`isAdmin`, `cabin`, `room`) → **denied**.
  - Couple read of all `guests` and all submissions → **allowed**.
  - Guest create of `rsvp_submissions` with valid payload → **allowed**.
  - Guest create with invalid invitation code → **denied**.
- **Unit tests (new):** payload builders in `submit-forms.js` and `guest-profiles.js`; runtime validators (if added).
- **Build tests:** `npm run build` for each app after each change.
- **Manual smoke:** guest RSVP flow, guest profile edit, dashboard load, dashboard export.

---

## 19. Open questions

1. Should `invitation_groups` content be public or group-scoped? (Product decision.)
2. Should `rooms` and `thanks` remain public? (Likely yes, but confirm no sensitive fields.)
3. Are invitation codes meant to be semi-public, or should they be rotated/validated server-side?
4. Is the dashboard intended to remain couple-only, or are additional admin roles planned?
5. Does `web/interface` read any Firestore collections? (Not fully audited.)
6. Is offline persistence (`enableIndexedDbPersistence`) intended/used?

---

## 20. Recommended first implementation batch

**Goal:** Close the P0 security/privacy issues with minimal risk, no rewrite, and full test coverage.

**Batch contents:**
1. **Rules change (Steps 1–2):** Restrict `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`, `attendance_responses` reads to `isCouple()`; change the default `match /{document=**}` to deny by default; explicitly allow `rooms` and `thanks` reads.
2. **Rules change (Step 7b):** Replace `isCouple()` with an `isAdmin()` rule function that reads `guests/{auth.uid}.isAdmin == true`; update all `allow` clauses that reference `isCouple()`. (Backward-compatible: both admins already have `isAdmin == true`.)
3. **Client change (Step 3):** Scope `loadAttendanceResponses()` to the signed-in guest's own group.
4. **Dead-code removal (Steps 5–6):** Remove `loadDeletedGuestIds()` and `DASHBOARD_CODE`.
5. **Tests (Step 12):** Extend the Firestore Emulator suite to cover the new rules (including admin-vs-non-admin access).


**Rollback plan:** Revert the rules file and redeploy; revert the client change. No data migration required.

**Why this batch:** It reduces immediate risk (public PII exposure), establishes the deny-by-default pattern, is independently testable, and does not touch the data model or introduce new layers.

---

## 21. Architecture score

| Dimension | Score /100 | Rationale |
| --- | --- | --- |
| **Overall** | **62** | Solid data-layer security for `guests`, but public reads on submissions and a broad default rule are critical gaps. |
| **Firestore data model** | **78** | Clean, well-scoped collections; explicit IDs; no oversized docs; good timestamp discipline. Minor duplication in static registries. |
| **Guest-facing security** | **55** | `guests` scoping is good, but guest reads all attendance and submission collections are publicly readable. |
| **Back-office security** | **70** | Data layer protected by `isCouple()` (should become `isAdmin()`); but UI gate is client-side only and dead code remains. |

| **Data integrity** | **85** | Allowlisted payloads, `serverTimestamp()`, field-level rules, backups. Strong. |
| **React architecture** | **72** | Reasonable component separation; direct Firestore in feature modules; no server-state cache (acceptable at scale). |
| **Maintainability** | **60** | Duplicated guest registries, scattered Firestore paths, no lint/CI, no unit tests. |
| **Testing** | **45** | Good rules-test suite (13 tests) but no unit/component/e2e coverage. |

---

---

## 22. Implementation status

The following steps from the migration plan have been **implemented**:

| Step | Status | Description |
| --- | --- | --- |
| 1 | ✅ Done | Restricted submission collection reads to `isCouple()` (now `isAdmin()`) |
| 2 | ✅ Done | Changed default `match /{document=**}` to deny by default; explicitly allow `rooms` and `thanks` |
| 3 | ✅ Done | Scoped `loadAttendanceResponses()` to the signed-in guest's own group |
| 4 | ✅ Done | Added explicit `allow read` for public collections only |
| 5 | ✅ Done | Removed dead code `loadDeletedGuestIds()` |
| 6 | ✅ Done | Removed unused `DASHBOARD_CODE` |
| 7b | ✅ Done | Replaced `isCouple()` with `isAdmin()` rule function reading `guests/{auth.uid}.isAdmin` |
| 10 | ✅ Done | Created `web/shared/firestore-paths.js` (centralized collection names) and `web/shared/payload-builders.js` (explicit payload builders) |
| 11 | ✅ Done | Created `web/shared/validation.js` with runtime validators; integrated into `guest-profiles.js`, `guest-attendance.js`, `submit-forms.js`; added unit tests (32 passing) |
| 12 | ✅ Done | Extended Firestore Emulator rules tests (13+ tests) |
| 13 | ✅ Done | Narrowed admin write scope in rules (`invitationGroup` + `_deleted` admin-only) |
| 14 | ✅ Done | Added pagination/limits to dashboard queries |
| 15 | ✅ Done | Added ESLint (flat config, zero errors/warnings) and CI workflow (lint + test + build) |

**Remaining steps (not yet implemented):**
- Step 7: Move invitation codes out of rules (product decision)
- Step 8: Scope `invitation_groups` reads to the signed-in guest's own group (product decision)
- Step 9: Consolidate duplicated static guest registries

**Verification:**
- ✅ Both apps build successfully (`npm run build:all`)
- ✅ ESLint passes with zero errors and zero warnings (`npm run lint`)
- ✅ All 39 unit tests pass (7 profile + 32 validation)
- ✅ Firestore rules tests pass with emulator
- ✅ CI workflow created at `.github/workflows/ci.yml`


