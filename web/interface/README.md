# Interface Web Core

## ES
Esta interfaz usa una stack web real:
- React + Vite
- React Router (HashRouter)
- i18next + react-i18next con traducciones estrictas FR/ES/EN

Dos superficies funcionales:
- Planning privado
- Sitio de invitados

## FR
Cette interface repose sur une vraie stack web :
- React + Vite
- React Router (HashRouter)
- i18next + react-i18next avec traductions strictes FR/ES/EN

Deux surfaces:
- Planning privé
- Site invités

## Estructura tecnica
- `src/App.jsx`: rutas y pantallas
- `src/i18n.js`: config de internacionalizacion
- `src/locales/{fr,es,en}/common.json`: diccionarios oficiales
- `src/styles.css`: design system visual
- `src/eventData.js`: datos operativos del evento

## Uso local

```bash
cd /Users/aydejuarez/boda/web/interface
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Abrir:
- `http://localhost:4173/`

## Build produccion

```bash
npm run build
npm run preview
```
