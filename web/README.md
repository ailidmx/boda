# Arquitectura Web Boda

## ES
La carpeta web se divide en varias superficies:
- `invitation`: invitación pública one-page ES/FR/EN (React + Vite)
- `dashboard`: panel privado de los novios (CRUD + dashboard, Vite vanilla)
- `private_planning`: acceso restringido para planeación interna
- `public_site`: acceso público para invitados

### Dos builds separados (invitation + dashboard)
La invitación y el dashboard son **dos builds Vite independientes**:

- **Invitación** → `web/invitation/` (puerto dev `5173`)
- **Dashboard** → `web/dashboard/` (puerto dev `5174`)

En desarrollo, el servidor de la invitación (`5173`) hace proxy de `/dashboard/*`
hacia el servidor del dashboard (`5174`). Así ambos se sirven desde un solo
origen (`localhost:5173`).

En producción, ambos builds se combinan en `web/invitation/dist/`:
- la invitación en `/`
- el dashboard en `/dashboard/*` (vía rewrites en `firebase.json`)

### Comandos
```bash
# Build ambos (invitación + dashboard) en web/invitation/dist/
npm run build:all

# Dev: servidor de la invitación (con proxy /dashboard)
npm run dev:invitation

# Dev: servidor del dashboard (debe correr en paralelo)
npm run dev:dashboard
```

> ⚠️ En dev, corre los dos servidores en paralelo: `dev:dashboard` y
> `dev:invitation`. Luego abre `http://localhost:5173` (invitación) y
> `http://localhost:5173/dashboard` (panel).

### Políticas de estilo
- Invitación: `Cormorant Garamond` (display) + `Inter` (body), cargadas en
  `web/invitation/index.html`.
- Dashboard: `Inter` (body) + `Georgia` (display), cargadas en
  `web/dashboard/index.html`.

Idiomas activos para sitio público:
- ES
- FR
- EN

## FR
Le dossier web est divisé en plusieurs surfaces :
- `invitation` : invitation publique one-page ES/FR/EN (React + Vite)
- `dashboard` : panneau privé des mariés (CRUD + dashboard, Vite vanilla)
- `private_planning` : accès restreint pour la planification interne
- `public_site` : accès public pour les invités

### Deux builds séparés (invitation + dashboard)
L'invitation et le dashboard sont **deux builds Vite indépendants** :

- **Invitation** → `web/invitation/` (port dev `5173`)
- **Dashboard** → `web/dashboard/` (port dev `5174`)

En développement, le serveur de l'invitation (`5173`) fait proxy de `/dashboard/*`
vers le serveur du dashboard (`5174`). Les deux sont ainsi servis depuis une
seule origine (`localhost:5173`).

En production, les deux builds sont combinés dans `web/invitation/dist/` :
- l'invitation à `/`
- le dashboard sous `/dashboard/*` (via les rewrites dans `firebase.json`)

### Commandes
```bash
# Build des deux (invitation + dashboard) dans web/invitation/dist/
npm run build:all

# Dev : serveur de l'invitation (avec proxy /dashboard)
npm run dev:invitation

# Dev : serveur du dashboard (doit tourner en parallèle)
npm run dev:dashboard
```

> ⚠️ En dev, lance les deux serveurs en parallèle : `dev:dashboard` et
> `dev:invitation`. Puis ouvre `http://localhost:5173` (invitation) et
> `http://localhost:5173/dashboard` (panneau).

### Politiques de style
- Invitation : `Cormorant Garamond` (display) + `Inter` (body), chargées dans
  `web/invitation/index.html`.
- Dashboard : `Inter` (body) + `Georgia` (display), chargées dans
  `web/dashboard/index.html`.

Langues actives pour le site public :
- ES
- FR
- EN

## EN
The web folder is split into several surfaces:
- `invitation`: public one-page invitation in ES/FR/EN (React + Vite)
- `dashboard`: private couple's panel (CRUD + dashboard, vanilla Vite)
- `private_planning`: restricted access for internal planning
- `public_site`: public access for guests

### Two separate builds (invitation + dashboard)
The invitation and the dashboard are **two independent Vite builds**:

- **Invitation** → `web/invitation/` (dev port `5173`)
- **Dashboard** → `web/dashboard/` (dev port `5174`)

In development, the invitation server (`5173`) proxies `/dashboard/*` to the
dashboard server (`5174`). Both are served from a single origin
(`localhost:5173`).

In production, both builds are combined into `web/invitation/dist/`:
- the invitation at `/`
- the dashboard under `/dashboard/*` (via rewrites in `firebase.json`)

### Commands
```bash
# Build both (invitation + dashboard) into web/invitation/dist/
npm run build:all

# Dev: invitation server (with /dashboard proxy)
npm run dev:invitation

# Dev: dashboard server (must run in parallel)
npm run dev:dashboard
```

> ⚠️ In dev, run both servers in parallel: `dev:dashboard` and
> `dev:invitation`. Then open `http://localhost:5173` (invitation) and
> `http://localhost:5173/dashboard` (panel).

### Style policies
- Invitation: `Cormorant Garamond` (display) + `Inter` (body), loaded in
  `web/invitation/index.html`.
- Dashboard: `Inter` (body) + `Georgia` (display), loaded in
  `web/dashboard/index.html`.

Active languages for the public site:
- ES
- FR
- EN
