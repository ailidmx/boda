# Integracion Google Sheets

Esta integracion permite usar Google Sheets como fuente de verdad y sincronizar datos al repo para planeacion.

## Objetivo / Objectif
- ES: Traer invitados, hospedaje y presupuesto desde Google Sheets a CSV locales.
- FR: Importer les invites, l'hebergement et le budget depuis Google Sheets vers des CSV locaux.

- ES: Opcionalmente subir asignaciones generadas en el repo de vuelta a Google Sheets.
- FR: Optionnellement, renvoyer vers Google Sheets les affectations generees dans le repo.

## Archivos
- sync_google_sheets.py: script de sincronizacion (pull/push CSVs).
- .env.example: variables requeridas.
- scripts/sheet-mapping.cjs: mapeo de columnas CSV → Firestore (fuente unica).
- scripts/sync-sheet-to-firestore.mjs: sync seguro CSV → Firestore (dry-run + diff).
- scripts/verify-sheet-sync.mjs: verificacion post-sync (read-only).

## Requisitos
- Python 3.10+
- Paquetes: gspread, google-auth, python-dotenv
- Service account de Google con acceso de editor a la hoja

## Configuracion
1. Crear un service account en Google Cloud.
2. Descargar JSON de credenciales.
3. Compartir el Google Sheet con el email del service account.
4. Copiar .env.example a .env y completar valores.
5. Ejecutar comandos de pull/push.

## Comandos
Pull (hoja -> CSV local):
python integraciones/google_sheets/sync_google_sheets.py pull

Push (CSV local -> hoja):
python integraciones/google_sheets/sync_google_sheets.py push

## Pestanas esperadas / Onglets attendus
- INVITADOS
- HOSPEDAJE
- PRESUPUESTO
- asignacion_cabanas (opcional)
- mesas (opcional)

## CSV locales usados / CSV locaux utilises
- invitados/lista_invitados.csv
- invitados/cabanas_inventario.csv
- presupuesto/presupuesto.csv
- invitados/asignacion_cabanas.csv
- invitados/mesas.csv

## Flujo completo: Google Sheets → Firestore

1. **Pull** (hoja → CSV local):
   ```bash
   python integraciones/google_sheets/sync_google_sheets.py pull
   ```

2. **Dry-run sync** (CSV → Firestore, sin escribir):
   ```bash
   ~/.nvm/versions/node/v20.20.2/bin/node scripts/sync-sheet-to-firestore.mjs
   ```

3. **Ejecutar sync** (aplicar cambios):
   ```bash
   ~/.nvm/versions/node/v20.20.2/bin/node scripts/sync-sheet-to-firestore.mjs --execute
   ```

4. **Verificar** (read-only, compara CSV vs Firestore):
   ```bash
   ~/.nvm/versions/node/v20.20.2/bin/node scripts/verify-sheet-sync.mjs
   ```

### Notas
- El sync usa `setDoc(..., { merge: true })` — nunca sobreescribe documentos completos.
- Los campos `firestoreOnly` (message, messageAuthor, cloudinaryId, RSVP responses, _source, _migratedAt) se preservan.
- El sync NUNCA borra documentos a menos que se pase `--delete-stale` explicitamente.
- Usar Node 20 (evita el problema ESM de jwks-rsa/jose en Node 22).
- `sheet-mapping.cjs` es la fuente unica de verdad para el mapeo de columnas.
