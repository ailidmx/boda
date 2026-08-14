# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-14T03:41:08.835Z
- Mode: execute
- CI mode: no
- Fail on drift: no
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 211
- Guests total (Firestore): 262
- Auth users mapped to guest by UID: 211
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 211
- Sheet guests not requiring auth: 51
- Auth records present where firebase.auth is false: 0
- Guests requiring auth but missing it: 0
- Sheet guests requiring auth but missing it (selected scope): 0
- Auth email update candidates (sheet -> auth): 4
- Auth email updates blocked (invalid email): 0
- Auth email updates blocked (email in use): 0
- Auth create candidates (email present): 0
- Auth create blocked (missing sheet email): 0
- Auth create blocked (invalid email): 0
- Auth create blocked (email in use): 0
- Mapping coverage: 100%

### Auth Email Update Candidates

| UID | Invitation Group | Sheet Email | Auth Email | Disabled |
|---|---|---|---|---|
| paablo | Pablo y Brianda | pablo.galaup@gmail.com | paablo@boda-david-y-ayde.web.app | false |
| brianda | Pablo y Brianda | jannyn.vs@hotmail.com | brianda@boda-david-y-ayde.web.app | false |
| max |  | leblond.maxime6@gmail.com | max@boda-david-y-ayde.web.app | false |
| jean-daniel |  | leroy.jd.bci@gmail.com | jean-daniel@boda-david-y-ayde.web.app | false |

## Auth Sync Actions

- Planned auth deletes (missing sheet row or firebase.auth=false): 0
- Planned email updates: 4
- Planned auth creates: 0
- Planned blocked creates (missing email): 0
- Planned blocked email updates (invalid): 0
- Planned blocked email updates (in use): 0
- Planned blocked auth creates (invalid email): 0
- Planned blocked auth creates (email in use): 0
- Applied auth deletes: 0
- Applied email updates: 4
- Applied auth creates: 0
- Auth action failures: 0

## Summary

- Invalid rows skipped (missing UID): 0
- Added candidates: 0
- Changed candidates: 35
- Unchanged: 227
- Stale candidates: 0
- Auth metadata rows: 262
- Writes: 35

## Field Mismatches

### david_aïli

- idCheckUser: sheet=false firestore=true

### aydé_juárez_guadalupe

- idCheckUser: sheet=false firestore=true

### mika_rako

- hosting.cabin: sheet=VILLA MARGARITA firestore=VILLA DON RAFA
- hosting.room: sheet=VILLA MARGARITA-1 firestore=VILLA DON RAFA-1

### corine_rako

- hosting.cabin: sheet=VILLA MARGARITA firestore=VILLA DON RAFA
- hosting.room: sheet=VILLA MARGARITA-1 firestore=VILLA DON RAFA-1

### livier_rako

- hosting.cabin: sheet=VILLA MARGARITA firestore=VILLA DON RAFA
- hosting.room: sheet=VILLA MARGARITA-1 firestore=VILLA DON RAFA-2

### cathy_rako

- hosting.cabin: sheet=VILLA MARGARITA firestore=VILLA DON RAFA
- hosting.room: sheet=VILLA MARGARITA-1 firestore=VILLA DON RAFA-2

### morgane

- hosting.cabin: sheet=VILLA MARGARITA firestore=VILLA DON RAFA
- hosting.room: sheet=VILLA MARGARITA-3 firestore=VILLA DON RAFA-2

### pareja_de_morgane_rako

- hosting.cabin: sheet=VILLA MARGARITA firestore=VILLA DON RAFA
- hosting.room: sheet=VILLA MARGARITA-3 firestore=VILLA DON RAFA-2

### paablo

- identity.lastName: sheet=Galaup firestore=Galaud

### brianda

- identity.middleName: sheet=Jannyn firestore=
- identity.lastName: sheet=Valenzuela firestore=
- identity.maternalLastName: sheet=Suárez firestore=

### max

- invitationGroup: sheet= firestore=Max y JD

### jean-daniel

- identity.phone: sheet=524421683004 firestore=
- invitationGroup: sheet= firestore=Max y JD

### thierry_aïli

- idCheckUser: sheet=false firestore=true

### diego_aïli_vázquez

- idCheckUser: sheet=false firestore=true

### oscar

- idCheckUser: sheet=false firestore=true

### erik

- hosting.room: sheet=CASONA-5 firestore=CASONA-4

### olaf

- hosting.room: sheet=CASONA-6 firestore=CASONA-5

### adriana

- hosting.cabin: sheet=VILLA DON RAFA firestore=VILLA MARGARITA
- hosting.room: sheet=VILLA DON RAFA-1 firestore=VILLA MARGARITA-1

### fernanda

- hosting.cabin: sheet=VILLA DON RAFA firestore=VILLA MARGARITA
- hosting.room: sheet=VILLA DON RAFA-1 firestore=VILLA MARGARITA-1

### adriana_agris

- hosting.cabin: sheet=VILLA DON RAFA firestore=VILLA MARGARITA
- hosting.room: sheet=VILLA DON RAFA-1 firestore=VILLA MARGARITA-1

### susana.diaz

- hosting.cabin: sheet=VILLA DON RAFA firestore=VILLA MARGARITA
- hosting.room: sheet=VILLA DON RAFA-2 firestore=VILLA MARGARITA-1

### gabriela

- hosting.cabin: sheet=VILLA DON RAFA firestore=VILLA MARGARITA
- hosting.room: sheet=VILLA DON RAFA-2 firestore=VILLA MARGARITA-3

### tania

- hosting.cabin: sheet=VILLA DON RAFA firestore=
- hosting.room: sheet=VILLA DON RAFA-2 firestore=

### aili

- identity.firstName: sheet=Imelda firestore=Aili
- identity.middleName: sheet=Aili firestore=
- identity.lastName: sheet=Torres firestore=
- identity.maternalLastName: sheet=Gastelum firestore=

### juan

- identity.middleName: sheet=Carlos firestore=
- identity.lastName: sheet=Rodríguez firestore=
- identity.maternalLastName: sheet=Hernández firestore=

### natalia

- hosting.cabin: sheet=VILLA DON RAFA firestore=VILLA MARGARITA
- hosting.room: sheet=VILLA DON RAFA-2 firestore=VILLA MARGARITA-3

### renata

- identity.lastName: sheet=Cappi firestore=Capítulo
- identity.maternalLastName: sheet=Reynoso firestore=

### victor

- identity.middleName: sheet=Martín firestore=
- identity.maternalLastName: sheet=Regalado firestore=

### esposa_de_victor_segoviano

- identity.firstName: sheet=Rosalía firestore=Esposa
- identity.middleName: sheet=Del Carmen firestore=De
- identity.lastName: sheet=Ortega firestore=Victor
- identity.maternalLastName: sheet=González firestore=Segoviano

### lolo_38t

- hosting.room: sheet=VILLA MARGARITA-2 firestore=VILLA MARGARITA-3

### isa_38t

- hosting.room: sheet=VILLA MARGARITA-2 firestore=VILLA MARGARITA-3

### marion_38t

- hosting.room: sheet=VILLA MARGARITA-2 firestore=VILLA MARGARITA-3

### dimitar

- hosting.room: sheet=VILLA MARGARITA-2 firestore=VILLA MARGARITA-3

### acompagnante_de_dimitar

- hosting.room: sheet=VILLA MARGARITA-2 firestore=VILLA MARGARITA-3

### jose.valdes

- identity.cloudinaryId: sheet=CPR52_-_José_Alberto_Ricardo_Valdés_Villarreal_Miranda_pelu52 firestore=

## Cabin & Extra Cabin Assignments

| Guest | Cabaña | Cuarto | Xtra Cabaña | Xtra Cuarto |
|---|---|---|---|---|
| mika_rako | VILLA MARGARITA | VILLA MARGARITA-1 |  |  |
| corine_rako | VILLA MARGARITA | VILLA MARGARITA-1 |  |  |
| livier_rako | VILLA MARGARITA | VILLA MARGARITA-1 |  |  |
| cathy_rako | VILLA MARGARITA | VILLA MARGARITA-1 |  |  |
| morgane | VILLA MARGARITA | VILLA MARGARITA-3 |  |  |
| pareja_de_morgane_rako | VILLA MARGARITA | VILLA MARGARITA-3 |  |  |
| erik |  | CASONA-5 |  |  |
| olaf |  | CASONA-6 |  |  |
| adriana | VILLA DON RAFA | VILLA DON RAFA-1 |  |  |
| fernanda | VILLA DON RAFA | VILLA DON RAFA-1 |  |  |
| adriana_agris | VILLA DON RAFA | VILLA DON RAFA-1 |  |  |
| susana.diaz | VILLA DON RAFA | VILLA DON RAFA-2 |  |  |
| gabriela | VILLA DON RAFA | VILLA DON RAFA-2 |  |  |
| tania | VILLA DON RAFA | VILLA DON RAFA-2 |  |  |
| natalia | VILLA DON RAFA | VILLA DON RAFA-2 |  |  |
| lolo_38t |  | VILLA MARGARITA-2 |  |  |
| isa_38t |  | VILLA MARGARITA-2 |  |  |
| marion_38t |  | VILLA MARGARITA-2 |  |  |
| dimitar |  | VILLA MARGARITA-2 |  |  |
| acompagnante_de_dimitar |  | VILLA MARGARITA-2 |  |  |

## Field-By-Field Record Audit

| ID | Status | Compared Fields | Differences |
|---|---|---:|---:|
| david_aïli | changed | 37 | 1 |
| aydé_juárez_guadalupe | changed | 37 | 1 |
| mika_rako | changed | 37 | 2 |
| corine_rako | changed | 37 | 2 |
| livier_rako | changed | 37 | 2 |
| cathy_rako | changed | 37 | 2 |
| morgane | changed | 37 | 2 |
| pareja_de_morgane_rako | changed | 37 | 2 |
| paablo | changed | 37 | 1 |
| brianda | changed | 37 | 3 |
| max | changed | 37 | 1 |
| jean-daniel | changed | 37 | 2 |
| thierry_aïli | changed | 37 | 1 |
| diego_aïli_vázquez | changed | 37 | 1 |
| oscar | changed | 37 | 1 |
| erik | changed | 37 | 1 |
| olaf | changed | 37 | 1 |
| adriana | changed | 37 | 2 |
| fernanda | changed | 37 | 2 |
| adriana_agris | changed | 37 | 2 |
| susana.diaz | changed | 37 | 2 |
| gabriela | changed | 37 | 2 |
| tania | changed | 37 | 2 |
| aili | changed | 37 | 4 |
| juan | changed | 37 | 3 |
| natalia | changed | 37 | 2 |
| renata | changed | 37 | 2 |
| victor | changed | 37 | 2 |
| esposa_de_victor_segoviano | changed | 37 | 4 |
| lolo_38t | changed | 37 | 1 |
| isa_38t | changed | 37 | 1 |
| marion_38t | changed | 37 | 1 |
| dimitar | changed | 37 | 1 |
| acompagnante_de_dimitar | changed | 37 | 1 |
| jose.valdes | changed | 37 | 1 |

