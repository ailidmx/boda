# Technical Debt Register

> Classifies real debt OUTSIDE the immediate remediation to prevent scope creep.
> Buckets: `NOW` (blocking/immediate) · `NEXT` (next cycle) · `LATER` · `IGNORE`.

| ID | Debt | Where | Bucket | Notes |
|----|------|-------|:------:|-------|
| T-001 | Firestore rules permissive; `validation.js` advisory only | `firebase/firestore.rules` + `web/shared/validation.js` | NOW | Reconcile docs (D-100). Hardening (restore field validation) is NEXT. |
| T-002 | `dashboard.js` god-bootstrap | `web/dashboard/src/dashboard.js` | NOW | Pilot: `bootstrap.js` + `store.js` + read repos |
| T-003 | `cabinsPanel.js` god-panel | `web/dashboard/src/cabinsPanel.js` | NOW | Pilot: `cabinService` + lightbox extraction |
| T-004 | Read/subscribe asymmetry (repos write-only) | `repositories/*` vs `dashboard.js`/`tables.js` | NOW | Fold `subscribe*` into repos |
| T-005 | `AppContext.jsx` mixed context | `web/invitation/src/context/AppContext.jsx` | NEXT | Split auth/content/guests |
| T-006 | Invitation Firestore no repo boundary | ~9 invitation modules + 2 hooks | NEXT | Standardize per-feature repos as features are touched |
| T-007 | `features/` only ~15% realized (invitation) | `web/invitation/src/components/` flat | LATER | Gradual vertical-slice migration |
| T-008 | `cabinsPanel` lightbox duplicates `LightboxCarousel` | `cabinsPanel.js#openCabinLightbox` | LATER | consolidate if a shared non-React module becomes worth it |
| T-009 | Guest normalization duplicated | dashboard `normalizeGuest` vs invitation `normalizeGuestRecord` | LATER | DEFER (D-102) |
| T-010 | No prettier / formatting tool | repo | LATER | Low value; deploy/lint already gates |
| T-011 | No E2E / component-test harness | repo | LATER | ADR-0019 deferred; revisit after pilot |
| T-012 | Dead collection refs (`invitation_groups`, `attendance_responses`, `rsvp_submissions`, `experience_suggestions`, `coast_interest`, `petanque_participation`) | AGENTS.md + `firestore.rules` legacy `match` blocks | NEXT | Remove doc refs; keep rules benign or remove legacy match blocks |
| T-013 | Dashboard `state` object has no explicit store module | `dashboard.js` | NOW | Folded into T-002 |
| T-014 | Unverified `onSnapshot` cleanup on sign-out/access-denied | `dashboard.js`/`tables.js` | NEXT | Audit listener unsubs during pilot |
| T-015 | Rules tests may be vacuous vs current permissive model | `web/invitation/tests/firestore.rules.test.mjs` | NOW | Re-point to actual simple model (D-100) |
| T-016 | `web/shared/guests.js` possibly stale (unimported) | `web/shared/` | NEXT | Confirm dead → REMOVE or mark |

**Deferred hardening (not in modernization scope, flagged):**
- Restoring field-validating Firestore rules (D-100 Option 1) — a security-model
  change, needs the couple's explicit sign-off and a migration of any existing
  non-conforming docs.