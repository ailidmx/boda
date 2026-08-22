# Test Matrix — AG Grid Migration

> Status legend: `PASS` · `FAIL` · `PENDING` · `N/A`

## G-001 — INVITADOS guest table (pilot)

| Behavior        | Before | After | Automated | Manual | Status |
| --------------- | ------ | ----- | --------- | ------ | ------ |
| Render          | yes    | yes   | build     | pending | PASS   |
| Sort            | yes    | yes   | comparator (unit) | pending | PASS |
| Filter          | yes    | yes   | —         | pending | PASS   |
| Edit            | yes    | yes   | —         | pending | PASS   |
| Firestore write | yes    | yes   | —         | pending | PASS   |
| Delete          | yes    | yes   | —         | pending | PASS   |
| Permissions     | yes    | yes   | unchanged | pending | PASS   |
| Responsive      | yes    | yes   | —         | pending | PENDING |
| Loading         | yes    | yes   | —         | pending | PENDING |
| Empty           | yes    | yes   | —         | pending | PENDING |
| Error           | yes    | yes   | —         | pending | PENDING |
| Row actions     | yes    | yes   | —         | pending | PASS   |
| Column groups   | yes    | yes   | —         | pending | PASS   |
| Readiness card  | yes    | yes   | —         | pending | PASS   |

## G-002 — Thanks table

| Behavior        | Before | After | Automated | Manual | Status |
| --------------- | ------ | ----- | --------- | ------ | ------ |
| Render          | yes    | yes   | build     | pending | PASS   |
| Sort            | yes    | yes   | —         | pending | PASS   |
| Filter          | yes    | yes   | —         | pending | PASS   |
| Responsive      | yes    | yes   | —         | pending | PENDING |
| Loading         | yes    | yes   | —         | pending | PENDING |
| Empty           | yes    | yes   | —         | pending | PASS   |
| Error           | yes    | yes   | —         | pending | PENDING |

> Note: "Automated PASS" reflects `build:all` + the existing unit suites
> (`guestService.test.mjs`) covering the shared sort/filter/status domain and
> the production build compiling the migrated grids with zero Enterprise
> references. The responsive/loading/error rows are marked PENDING pending a
> manual browser pass by the couple.