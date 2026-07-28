# Integracion Google Sheets

## Estado actual
No hay un MCP de Google Sheets preconectado en esta sesion, pero ya tenemos opcion lista para habilitarlo con `xing5/mcp-google-sheets`.

`uvx` ya esta disponible en esta Mac en `/opt/homebrew/bin/uvx`.

Validacion tecnica ya realizada:
- APIs habilitadas en `boda-500805`.
- Service account creada: `boda-sheets-mcp@boda-500805.iam.gserviceaccount.com`.
- Error actual al leer Sheet: `403 The caller does not have permission`.
- Accion pendiente: compartir el Google Sheet con la service account como `Editor`.

Ya se dejo una integracion base en `integraciones/google_sheets/` para sincronizacion por API.

## Opcion MCP (recomendada)
Usar `mcp-google-sheets` como servidor MCP para leer y escribir en Google Sheets desde el cliente MCP.

### Ventajas
- Interaccion directa con hojas sin export manual.
- Herramientas de lectura/escritura listas (`get_sheet_data`, `update_cells`, etc).
- Posibilidad de filtrar herramientas para reducir consumo de contexto.

### Configuracion sugerida (macOS)
1. Crear Service Account en Google Cloud.
2. Activar APIs: Google Sheets API y Google Drive API.
3. Compartir la carpeta/hoja con el `client_email` del Service Account.
4. Colocar el JSON de credenciales en ruta segura local.
5. Configurar el cliente MCP con el ejemplo en `integraciones/google_sheets/mcp_server_config.example.json`.

### Variables clave del servidor MCP
- `SERVICE_ACCOUNT_PATH`: ruta al JSON del service account.
- `DRIVE_FOLDER_ID`: folder de Google Drive donde viven las hojas.
- `ENABLED_TOOLS`: lista de tools habilitadas (para ahorrar contexto).

### Set minimo de tools para este proyecto boda
- `list_spreadsheets`
- `list_sheets`
- `get_sheet_data`
- `update_cells`
- `batch_update_cells`

## Forma rapida de trabajo (recomendada)
1. Mantener la hoja principal en Google Sheets.
2. Exportar pestañas clave a CSV.
3. Reemplazar estos archivos en el repo:
   - invitados/lista_invitados.csv
   - invitados/cabanas_inventario.csv
4. Revisar y optimizar asignacion en invitados/asignacion_cabanas.md y invitados/mesas_plan.md.

## Forma automatizada (opcional)
Si comparten credenciales tecnicas (service account / API), se puede crear un script de sincronizacion bidireccional para:
- Leer lista de invitados
- Leer inventario de cabanas
- Escribir propuesta de asignacion de cabanas
- Escribir propuesta de mesas

### Implementacion ya creada
- Script: `integraciones/google_sheets/sync_google_sheets.py`
- Variables: `integraciones/google_sheets/.env.example`
- Contrato de columnas: `integraciones/google_sheets/columnas_requeridas.md`
- Config de servidor MCP ejemplo: `integraciones/google_sheets/mcp_server_config.example.json`
- Quickstart operativo para este proyecto: `integraciones/google_sheets/quickstart_boda.md`
- Bootstrap GCP/API/service-account: `integraciones/google_sheets/setup_gcp.sh`

## Nota de control
La fuente de verdad puede seguir en Google Sheets; este repo actua como capa de planeacion y versionado.
