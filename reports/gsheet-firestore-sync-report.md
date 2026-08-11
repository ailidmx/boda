# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-11T14:17:42.868Z
- Mode: execute
- CI mode: no
- Fail on drift: no
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 208
- Guests total (Firestore): 259
- Auth users mapped to guest by UID: 208
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 211
- Sheet guests not requiring auth: 51
- Auth records present where firebase.auth is false: 0
- Guests requiring auth but missing it: 0
- Sheet guests requiring auth but missing it (selected scope): 3
- Auth email update candidates (sheet -> auth): 1
- Auth email updates blocked (invalid email): 0
- Auth email updates blocked (email in use): 0
- Auth create candidates (email present): 3
- Auth create blocked (missing sheet email): 0
- Auth create blocked (invalid email): 0
- Auth create blocked (email in use): 0
- Mapping coverage: 100%

### Auth Email Update Candidates

| UID | Invitation Group | Sheet Email | Auth Email | Disabled |
|---|---|---|---|---|
| antoine |  | antoine@boda-david-y-ayde.web.app | antoine_faure@boda-david-y-ayde.web.app | false |

### Auth Create Candidates

| UID | Invitation Group | Sheet Email | Password In Sheet |
|---|---|---|---|
| maria.cristina |  | maria.cristina@boda-david-y-ayde.web.app | yes |
| lourdes |  | lourdes@boda-david-y-ayde.web.app | yes |
| claudia.torrez |  | claudia.torrez@boda-david-y-ayde.web.app | yes |

## Auth Sync Actions

- Planned auth deletes (missing sheet row or firebase.auth=false): 0
- Planned email updates: 1
- Planned auth creates: 3
- Planned blocked creates (missing email): 0
- Planned blocked email updates (invalid): 0
- Planned blocked email updates (in use): 0
- Planned blocked auth creates (invalid email): 0
- Planned blocked auth creates (email in use): 0
- Applied auth deletes: 0
- Applied email updates: 1
- Applied auth creates: 3
- Auth action failures: 0

## Summary

- Invalid rows skipped (missing UID): 0
- Added candidates: 3
- Changed candidates: 17
- Unchanged: 242
- Stale candidates: 0
- Auth metadata rows: 262
- Writes: 20

## Missing In Firestore

- maria.cristina
- lourdes
- claudia.torrez

## Field Mismatches

### aydé_juárez_guadalupe

- idCheckUser: sheet=false firestore=true

### manu

- identity.firstName: sheet=Manuel firestore=Manu
- identity.lastName: sheet=Hurtado firestore=
- identity.maternalLastName: sheet=Pedroza firestore=

### esposa_de_mauricio_vargas

- identity.firstName: sheet=Paola firestore=Esposa
- identity.middleName: sheet= firestore=De
- identity.lastName: sheet=Alcaraz firestore=Mauricio
- identity.maternalLastName: sheet=González firestore=Vargas

### jimena

- identity.firstName: sheet= firestore=Jimena

### rene.linares

- identity.firstName: sheet=René firestore=
- identity.lastName: sheet=Linares firestore=

### esposa_de_rené

- identity.firstName: sheet=Esposa firestore=
- identity.lastName: sheet=René firestore=

### spomenka.petrovic

- hosting.xtraCabin: sheet=CABAÑA 1 firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=CABAÑA 1-1 firestore=VILLA MARGARITA-3

### guilhem.laubie

- hosting.xtraCabin: sheet=CABAÑA 1 firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=CABAÑA 1-1 firestore=VILLA MARGARITA-3

### fred_38t

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-2 firestore=VILLA MARGARITA-1

### lolo_38t

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-2 firestore=VILLA MARGARITA-1

### isa_38t

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-2 firestore=VILLA MARGARITA-2

### bobo_28t

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-2 firestore=VILLA MARGARITA-1

### alexis

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-3 firestore=VILLA MARGARITA-2

### marion_38t

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-3 firestore=VILLA MARGARITA-2

### benoit_38t

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-3 firestore=VILLA MARGARITA-2

### dimitar

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-1 firestore=VILLA MARGARITA-3

### acompagnante_de_dimitar

- hosting.xtraCabin: sheet=VILLA AZALEA firestore=VILLA MARGARITA
- hosting.xtraRoom: sheet=VILLA AZALEA-1 firestore=VILLA MARGARITA-3

## Cabin & Extra Cabin Assignments

| Guest | Cabaña | Cuarto | Xtra Cabaña | Xtra Cuarto |
|---|---|---|---|---|
| spomenka.petrovic |  |  | CABAÑA 1 | CABAÑA 1-1 |
| guilhem.laubie |  |  | CABAÑA 1 | CABAÑA 1-1 |
| fred_38t |  |  | VILLA AZALEA | VILLA AZALEA-2 |
| lolo_38t |  |  | VILLA AZALEA | VILLA AZALEA-2 |
| isa_38t |  |  | VILLA AZALEA | VILLA AZALEA-2 |
| bobo_28t |  |  | VILLA AZALEA | VILLA AZALEA-2 |
| alexis |  |  | VILLA AZALEA | VILLA AZALEA-3 |
| marion_38t |  |  | VILLA AZALEA | VILLA AZALEA-3 |
| benoit_38t |  |  | VILLA AZALEA | VILLA AZALEA-3 |
| dimitar |  |  | VILLA AZALEA | VILLA AZALEA-1 |
| acompagnante_de_dimitar |  |  | VILLA AZALEA | VILLA AZALEA-1 |

## Field-By-Field Record Audit

| ID | Status | Compared Fields | Differences |
|---|---|---:|---:|
| aydé_juárez_guadalupe | changed | 37 | 1 |
| manu | changed | 37 | 3 |
| esposa_de_mauricio_vargas | changed | 37 | 4 |
| jimena | changed | 37 | 1 |
| rene.linares | changed | 37 | 2 |
| esposa_de_rené | changed | 37 | 2 |
| spomenka.petrovic | changed | 37 | 2 |
| guilhem.laubie | changed | 37 | 2 |
| fred_38t | changed | 37 | 2 |
| lolo_38t | changed | 37 | 2 |
| isa_38t | changed | 37 | 2 |
| bobo_28t | changed | 37 | 2 |
| alexis | changed | 37 | 2 |
| marion_38t | changed | 37 | 2 |
| benoit_38t | changed | 37 | 2 |
| dimitar | changed | 37 | 2 |
| acompagnante_de_dimitar | changed | 37 | 2 |
| maria.cristina | candidate-add | 37 | 37 |
| lourdes | candidate-add | 37 | 37 |
| claudia.torrez | candidate-add | 37 | 37 |

