# Integracion Google Sheets

Esta integracion permite usar Google Sheets como fuente de verdad y sincronizar datos al repo para planeacion.

## Objetivo / Objectif
- ES: Traer invitados, hospedaje y presupuesto desde Google Sheets a CSV locales.
- FR: Importer les invites, l'hebergement et le budget depuis Google Sheets vers des CSV locaux.

- ES: Opcionalmente subir asignaciones generadas en el repo de vuelta a Google Sheets.
- FR: Optionnellement, renvoyer vers Google Sheets les affectations generees dans le repo.

## Archivos
- sync_google_sheets.py: script de sincronizacion.
- .env.example: variables requeridas.

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
