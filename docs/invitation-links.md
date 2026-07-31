# Invitation Links / Enlaces de invitación

## ES

Cada invitado recibe un enlace personalizado que contiene su código de invitación codificado en Base64URL. El código se pasa como parámetro de consulta en la URL.

### Formato de URL

```
https://boda-david-y-ayde.web.app/?invitationCode={base64url}
```

### Códigos de perfil

Estos códigos describen el tipo de alojamiento asignado a cada grupo de invitados. Se asignan por fila en `lista_invitados.csv` (223 filas).

| Código | Descripción |
|---|---|
| `hortencia_privada_pagada` | Cabaña Hortencia, privada, ya pagada |
| `cabaña_33_privada_porpagar` | Cabaña 33, privada, pendiente de pago |
| `azalea_compartida_porpagar` | Cabaña Azalea, compartida, pendiente de pago |
| `sin_cabaña` | Sin alojamiento en cabaña |
| `cabaña_5_privada_porpagar` | Cabaña 5, privada, pendiente de pago |
| `cabaña_34_privada_pagada` | Cabaña 34, privada, ya pagada |
| `cabaña_4_compartida_pagada` | Cabaña 4, compartida, ya pagada |
| `lavanda_compartida_porpagar` | Cabaña Lavanda, compartida, pendiente de pago |
| `casona_compartida_pagada` | Casona, compartida, ya pagada |
| `margarita_compartida_porpagar` | Cabaña Margarita, compartida, pendiente de pago |
| `cabaña_6_privada_porpagar` | Cabaña 6, privada, pendiente de pago |
| `dalia_compartida_porpagar` | Cabaña Dalia, compartida, pendiente de pago |
| `cabaña_31_privada_porpagar` | Cabaña 31, privada, pendiente de pago |
| `cabaña_32_privada_porpagar` | Cabaña 32, privada, pendiente de pago |

### Códigos por invitado (guest IDs)

Además de los códigos de perfil, cada invitado tiene un ID único (su nombre normalizado, ej. `sebastien`, `maria`, `david`) que también puede usarse como código de invitación. Estos IDs se definen en `guests.js`.

### Asignación de códigos por fila en lista_invitados.csv

```
1: hortencia_privada_pagada
2: hortencia_privada_pagada
3: cabaña_33_privada_porpagar
4: cabaña_33_privada_porpagar
5: cabaña_33_privada_porpagar
6: cabaña_33_privada_porpagar
7: azalea_compartida_porpagar
8: azalea_compartida_porpagar
9: azalea_compartida_porpagar
10: azalea_compartida_porpagar
11: sin_cabaña
12: azalea_compartida_porpagar
13: azalea_compartida_porpagar
14: sin_cabaña
15: sin_cabaña
16: cabaña_5_privada_porpagar
17: cabaña_5_privada_porpagar
18: cabaña_5_privada_porpagar
19: cabaña_5_privada_porpagar
20: cabaña_5_privada_porpagar
21: cabaña_5_privada_porpagar
22: sin_cabaña
23: sin_cabaña
24: sin_cabaña
25: sin_cabaña
26: azalea_compartida_porpagar
27: azalea_compartida_porpagar
28: sin_cabaña
29: sin_cabaña
30: sin_cabaña
31: sin_cabaña
32: sin_cabaña
33: sin_cabaña
34: sin_cabaña
35: azalea_compartida_porpagar
36: sin_cabaña
37: sin_cabaña
38: sin_cabaña
39: sin_cabaña
40: sin_cabaña
41: sin_cabaña
42: sin_cabaña
43: sin_cabaña
44: azalea_compartida_porpagar
45: azalea_compartida_porpagar
46: azalea_compartida_porpagar
47: azalea_compartida_porpagar
48: azalea_compartida_porpagar
49: sin_cabaña
50: sin_cabaña
51: sin_cabaña
52: sin_cabaña
53: sin_cabaña
54: cabaña_34_privada_pagada
55: cabaña_34_privada_pagada
56: cabaña_4_compartida_pagada
57: cabaña_4_compartida_pagada
58: cabaña_4_compartida_pagada
59: cabaña_4_compartida_pagada
60: cabaña_4_compartida_pagada
61: cabaña_4_compartida_pagada
62: cabaña_4_compartida_pagada
63: cabaña_4_compartida_pagada
64: lavanda_compartida_porpagar
65: lavanda_compartida_porpagar
66: sin_cabaña
67: casona_compartida_pagada
68: casona_compartida_pagada
69: casona_compartida_pagada
70: casona_compartida_pagada
71: casona_compartida_pagada
72: casona_compartida_pagada
73: casona_compartida_pagada
74: casona_compartida_pagada
75: casona_compartida_pagada
76: casona_compartida_pagada
77: casona_compartida_pagada
78: casona_compartida_pagada
79: casona_compartida_pagada
80: casona_compartida_pagada
81: casona_compartida_pagada
82: casona_compartida_pagada
83: casona_compartida_pagada
84: casona_compartida_pagada
85: margarita_compartida_porpagar
86: margarita_compartida_porpagar
87: margarita_compartida_porpagar
88: margarita_compartida_porpagar
89: margarita_compartida_porpagar
90: sin_cabaña
91: sin_cabaña
92: sin_cabaña
93: sin_cabaña
94: margarita_compartida_porpagar
95: sin_cabaña
96: sin_cabaña
97: sin_cabaña
98: sin_cabaña
99: sin_cabaña
100: sin_cabaña
101: sin_cabaña
102: sin_cabaña
103: sin_cabaña
104: sin_cabaña
105: sin_cabaña
106: sin_cabaña
107: sin_cabaña
108: sin_cabaña
109: sin_cabaña
110: sin_cabaña
111: cabaña_6_privada_porpagar
112: cabaña_6_privada_porpagar
113: cabaña_6_privada_porpagar
114: cabaña_6_privada_porpagar
115: cabaña_6_privada_porpagar
116: dalia_compartida_porpagar
117: dalia_compartida_porpagar
118: dalia_compartida_porpagar
119: sin_cabaña
120: sin_cabaña
121: dalia_compartida_porpagar
122: dalia_compartida_porpagar
123: sin_cabaña
124: sin_cabaña
125: sin_cabaña
126: sin_cabaña
127: sin_cabaña
128: sin_cabaña
129: sin_cabaña
130: dalia_compartida_porpagar
131: dalia_compartida_porpagar
132: dalia_compartida_porpagar
133: dalia_compartida_porpagar
134: dalia_compartida_porpagar
135: sin_cabaña
136: sin_cabaña
137: sin_cabaña
138: sin_cabaña
139: sin_cabaña
140: sin_cabaña
141: cabaña_31_privada_porpagar
142: cabaña_31_privada_porpagar
143: sin_cabaña
144: sin_cabaña
145: sin_cabaña
146: sin_cabaña
147: sin_cabaña
148: sin_cabaña
149: lavanda_compartida_porpagar
150: margarita_compartida_porpagar
151: margarita_compartida_porpagar
152: lavanda_compartida_porpagar
153: margarita_compartida_porpagar
154: margarita_compartida_porpagar
155: margarita_compartida_porpagar
156: margarita_compartida_porpagar
157: margarita_compartida_porpagar
158: margarita_compartida_porpagar
159: sin_cabaña
160: cabaña_32_privada_porpagar
161: cabaña_32_privada_porpagar
162: sin_cabaña
163: sin_cabaña
164: margarita_compartida_porpagar
165: margarita_compartida_porpagar
166: sin_cabaña
167: sin_cabaña
168: sin_cabaña
169: sin_cabaña
170: sin_cabaña
171: sin_cabaña
172: sin_cabaña
173: sin_cabaña
174: sin_cabaña
175: sin_cabaña
176: sin_cabaña
177: sin_cabaña
178: sin_cabaña
179: sin_cabaña
180: sin_cabaña
181: sin_cabaña
182: sin_cabaña
183: sin_cabaña
184: sin_cabaña
185: sin_cabaña
186: sin_cabaña
187: sin_cabaña
188: sin_cabaña
189: sin_cabaña
190: sin_cabaña
191: sin_cabaña
192: sin_cabaña
193: sin_cabaña
194: sin_cabaña
195: sin_cabaña
196: sin_cabaña
197: sin_cabaña
198: sin_cabaña
199: sin_cabaña
200: sin_cabaña
201: sin_cabaña
202: sin_cabaña
203: sin_cabaña
204: sin_cabaña
205: sin_cabaña
206: sin_cabaña
207: sin_cabaña
208: sin_cabaña
209: sin_cabaña
210: sin_cabaña
211: sin_cabaña
212: sin_cabaña
213: sin_cabaña
214: sin_cabaña
215: sin_cabaña
216: sin_cabaña
217: sin_cabaña
218: sin_cabaña
219: sin_cabaña
220: sin_cabaña
221: sin_cabaña
222: sin_cabaña
223: sin_cabaña
```

### Generación de enlaces

Para generar los enlaces de invitación, ejecuta:

```bash
node web/invitation/scripts/generate-invitation-links.mjs
```

Esto generará un archivo CSV con todos los enlaces.

### Códigos de novios (backoffice)

Los novios tienen códigos cortos para acceso rápido:

| Código | Base64URL | Quién |
|--------|-----------|-------|
| `david_ali` | `ZGF2aWRfYWxp` | David |
| `ayd_jurez` | `YXlkX2p1cmV6` | Aydé |

El código de perfil `hortencia_privada_pagada` también funciona para ambos. Al decodificarse, estos códigos activan el acceso al panel de administración (dashboard) además de mostrar el perfil de invitación correspondiente.

### Decodificación

El código se decodifica de Base64URL a texto plano. El sistema acepta dos tipos de códigos:
1. **Códigos de perfil** (lista arriba) — describen el tipo de alojamiento
2. **IDs de invitado** (nombre normalizado, ej. `sebastien`) — identifican a un invitado específico y devuelven su perfil completo

## FR

Chaque invité reçoit un lien personnalisé contenant son code d'invitation encodé en Base64URL. Le code est passé comme paramètre de requête dans l'URL.

### Format d'URL

```
https://boda-david-y-ayde.web.app/?invitationCode={base64url}
```

### Codes de profil

| Code | Description |
|---|---|
| `hortencia_privada_pagada` | Cabane Hortencia, privée, déjà payée |
| `cabaña_33_privada_porpagar` | Cabane 33, privée, à payer |
| `azalea_compartida_porpagar` | Cabane Azalea, partagée, à payer |
| `sin_cabaña` | Pas d'hébergement en cabane |
| `cabaña_5_privada_porpagar` | Cabane 5, privée, à payer |
| `cabaña_34_privada_pagada` | Cabane 34, privée, déjà payée |
| `cabaña_4_compartida_pagada` | Cabane 4, partagée, déjà payée |
| `lavanda_compartida_porpagar` | Cabane Lavande, partagée, à payer |
| `casona_compartida_pagada` | Casona, partagée, déjà payée |
| `margarita_compartida_porpagar` | Cabane Marguerite, partagée, à payer |
| `cabaña_6_privada_porpagar` | Cabane 6, privée, à payer |
| `dalia_compartida_porpagar` | Cabane Dalia, partagée, à payer |
| `cabaña_31_privada_porpagar` | Cabane 31, privée, à payer |
| `cabaña_32_privada_porpagar` | Cabane 32, privée, à payer |

### Codes par invité (guest IDs)

En plus des codes de profil, chaque invité a un ID unique (son nom normalisé, ex. `sebastien`, `maria`, `david`) qui peut également être utilisé comme code d'invitation. Ces IDs sont définis dans `guests.js`.

## EN

Each guest receives a personalised link containing their invitation code encoded in Base64URL. The code is passed as a query parameter in the URL.

### URL Format

```
https://boda-david-y-ayde.web.app/?invitationCode={base64url}
```

### Profile Codes

| Code | Description |
|---|---|
| `hortencia_privada_pagada` | Hortencia cabin, private, already paid |
| `cabaña_33_privada_porpagar` | Cabin 33, private, pending payment |
| `azalea_compartida_porpagar` | Azalea cabin, shared, pending payment |
| `sin_cabaña` | No cabin accommodation |
| `cabaña_5_privada_porpagar` | Cabin 5, private, pending payment |
| `cabaña_34_privada_pagada` | Cabin 34, private, already paid |
| `cabaña_4_compartida_pagada` | Cabin 4, shared, already paid |
| `lavanda_compartida_porpagar` | Lavender cabin, shared, pending payment |
| `casona_compartida_pagada` | Casona, shared, already paid |
| `margarita_compartida_porpagar` | Margarita cabin, shared, pending payment |
| `cabaña_6_privada_porpagar` | Cabin 6, private, pending payment |
| `dalia_compartida_porpagar` | Dalia cabin, shared, pending payment |
| `cabaña_31_privada_porpagar` | Cabin 31, private, pending payment |
| `cabaña_32_privada_porpagar` | Cabin 32, private, pending payment |

### Per-guest codes (guest IDs)

In addition to profile codes, each guest has a unique ID (their normalised name, e.g. `sebastien`, `maria`, `david`) that can also be used as an invitation code. These IDs are defined in `guests.js`.

---

## Custom Content System / Sistema de contenido personalizado

### ES

El sistema permite mostrar contenido personalizado (saludos, mensajes, secciones extra, secciones ocultas) basado en el grupo del invitado o en el invitado individual.

#### Niveles de personalización

1. **Por grupo** (Firestore collection `invitation_groups`): El contenido se aplica a todos los invitados de un grupo.
2. **Por invitado** (Firestore document `guests/{guestId}`): El contenido se aplica solo a un invitado específico y **sobrescribe** el contenido del grupo.

#### Campos disponibles

| Campo | Tipo | Descripción |
|---|---|---|
| `customContent.greeting` | string (HTML) | Saludo personalizado que aparece arriba del perfil |
| `customContent.message` | string (HTML) | Mensaje que aparece dentro de la tarjeta de perfil |
| `customContent.section` | string (HTML) | Sección extra que se renderiza después de la tarjeta de perfil |
| `customContent.hideSections` | array[string] | IDs de secciones a ocultar (ej: `["schedule", "gift"]`) |

#### Gestión desde el Dashboard

El panel "Grupos" (🏷️) permite:
- **Crear** un nuevo grupo (se crea un documento en `invitation_groups`)
- **Editar** inline los campos de contenido personalizado (se guardan automáticamente al cambiar de campo)
- **Eliminar** un grupo (no afecta a los invitados asignados a ese grupo)

Los cambios se reflejan en tiempo real gracias al listener `onSnapshot`.

#### Flujo de resolución

1. Se carga `loadGroupCustomContent()` al inicio junto con `loadGuestOverrides()`
2. Cuando se renderiza la invitación, `getCustomContent(profile)` busca:
   - Contenido del grupo del invitado (`profile.guest.group`)
   - Contenido del invitado individual (`profile.guest.customContent`)
3. Se hace merge: el contenido del invitado **sobrescribe** el del grupo
4. Si no hay contenido en ningún nivel, se devuelve `null`

#### Secciones que se pueden ocultar

Las secciones se identifican por su ID de ancla HTML. Ejemplos:
- `schedule` — Horario del fin de semana
- `gift` — Información de regalos
- `photos` — Álbumes de fotos
- `attire` — Código de vestimenta
- `travel` — Información de viaje
- `accommodation` — Alojamiento
- `venue` — El venue
- `facilities` — Instalaciones
- `food` — Comida
- `music` — Música
- `weather` — Clima
- `story` — Nuestra historia
- `after` — Escapada a la costa

### FR

Le système permet d'afficher du contenu personnalisé (salutations, messages, sections supplémentaires, sections masquées) en fonction du groupe de l'invité ou de l'invité individuel.

#### Niveaux de personnalisation

1. **Par groupe** (collection Firestore `invitation_groups`) : Le contenu s'applique à tous les invités d'un groupe.
2. **Par invité** (document Firestore `guests/{guestId}`) : Le contenu s'applique uniquement à un invité spécifique et **remplace** le contenu du groupe.

#### Gestion depuis le Dashboard

Le panneau "Grupos" (🏷️) permet de :
- **Créer** un nouveau groupe
- **Modifier** en ligne les champs de contenu personnalisé
- **Supprimer** un groupe

### EN

The system allows displaying custom content (greetings, messages, extra sections, hidden sections) based on the guest's group or the individual guest.

#### Personalisation levels

1. **By group** (Firestore collection `invitation_groups`): Content applies to all guests in a group.
2. **By guest** (Firestore document `guests/{guestId}`): Content applies only to a specific guest and **overrides** the group content.

#### Management from the Dashboard

The "Grupos" panel (🏷️) allows:
- **Creating** a new group
- **Inline editing** of custom content fields (auto-saves on blur)

---

## Workflow / Flujo de trabajo

### Branches

| Branch | Purpose |
|--------|---------|
| `feature/*` | Development branch — work happens here |
| `develop` | Staging/QA — deploy to `boda-david-y-ayde.web.app` |
| `main` / `master` | Production — deploy to `boda-500805.web.app` |

### Hosting targets

| Target | Site | Branch deployed |
|--------|------|----------------|
| `invitation-primary` | `boda-500805.web.app` (prod) | `main` / `master` |
| `invitation-named` | `boda-david-y-ayde.web.app` (staging) | `develop` |

### Full workflow

```bash
# 1. Work on your feature branch
git checkout feature/animated-names

# 2. Test locally
cd web/invitation
npm run dev

# 3. Commit changes
git add .
git commit -m "feat: invitation codes with custom content"

# 4. Push feature branch
git push origin feature/animated-names

# 5. Create PR → develop (GitHub)
#    - Open PR from feature/animated-names → develop
#    - After merge, deploy to staging:

# 6. Deploy to staging (develop → boda-david-y-ayde.web.app)
git checkout develop
git pull origin develop
cd web/invitation && npm run build
cd ../..
firebase deploy --only hosting:invitation-named

# 7. Test on staging: https://boda-david-y-ayde.web.app

# 8. Create PR → main/master (GitHub)
#    - Open PR from develop → main (or master)
#    - After merge, deploy to production:

# 9. Deploy to production (main/master → boda-500805.web.app)
git checkout main
git pull origin main
cd web/invitation && npm run build
cd ../..
firebase deploy --only hosting:invitation-primary
```

### Quick reference

```bash
# Local dev
cd web/invitation && npm run dev

# Build
cd web/invitation && npm run build

# Deploy staging (develop)
firebase deploy --only hosting:invitation-named

# Deploy production (main/master)
firebase deploy --only hosting:invitation-primary

# Seed invitation groups to Firestore
node web/invitation/scripts/seed-invitation-groups.mjs

# Generate invitation links CSV
node web/invitation/scripts/generate-invitation-links.mjs
```
