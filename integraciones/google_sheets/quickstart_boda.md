# Quickstart Boda - Google Sheets MCP

Este quickstart usa:
- Proyecto GCP: boda-500805
- Spreadsheet ID: 1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg
- URL hoja: https://docs.google.com/spreadsheets/d/1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg/edit

## 1) Autenticacion gcloud (una vez)
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project boda-500805
```

## 2) Bootstrap service account + APIs
```bash
bash integraciones/google_sheets/setup_gcp.sh boda-500805 boda-sheets-mcp "Boda Sheets MCP Service Account" integraciones/google_sheets/service_account.json
```

Al terminar, el script imprime un email tipo:
- boda-sheets-mcp@boda-500805.iam.gserviceaccount.com

Email ya creado en este proyecto:
- boda-sheets-mcp@boda-500805.iam.gserviceaccount.com

## 3) Compartir el Sheet con la service account
- Abre tu Google Sheet.
- Click en Compartir.
- Agrega el email de la service account como Editor.

Enlace directo del archivo:
- https://docs.google.com/spreadsheets/d/1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg/edit

## 4) Config local para script CSV sync
```bash
cp integraciones/google_sheets/.env.example integraciones/google_sheets/.env
```

Nombres ya configurados:
- `WS_INVITADOS=INVITADOS`
- `WS_CABANAS=HOSPEDAJE`
- `WS_PRESUPUESTO=PRESUPUESTO`

## 5) Instalar dependencias Python para sync CSV
```bash
python3 -m pip install --upgrade gspread google-auth python-dotenv
```

## 6) Pull de datos (Sheet -> CSV)
```bash
python3 integraciones/google_sheets/sync_google_sheets.py pull
```

Esto alimenta:
- `invitados/lista_invitados.csv`
- `invitados/cabanas_inventario.csv`
- `presupuesto/presupuesto.csv`

## 7) Push de datos (CSV -> Sheet)
```bash
python3 integraciones/google_sheets/sync_google_sheets.py push
```

## 8) MCP server config (cliente MCP)
Usa `integraciones/google_sheets/mcp_server_config.example.json` como base y ajusta:
- `DRIVE_FOLDER_ID`

Tip: deja habilitadas solo estas tools para ahorrar contexto:
- list_spreadsheets,list_sheets,get_sheet_data,update_cells,batch_update_cells
