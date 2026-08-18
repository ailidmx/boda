import argparse
import csv
import os
from pathlib import Path

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = Path(__file__).resolve().parent / ".env"

SHEET_TO_CSV = {
    "WS_CABANAS": BASE_DIR / "invitados" / "cabanas_inventario.csv",
    "WS_PRESUPUESTO": BASE_DIR / "presupuesto" / "presupuesto.csv",
    "WS_ASIGNACION": BASE_DIR / "invitados" / "asignacion_cabanas.csv",
    "WS_MESAS": BASE_DIR / "invitados" / "mesas.csv",
}


def get_client():
    load_dotenv(ENV_PATH)
    sheets_id = os.getenv("GOOGLE_SHEETS_ID", "").strip()
    service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "").strip()

    if not sheets_id:
        raise ValueError("Falta GOOGLE_SHEETS_ID en .env")
    if not service_account_file:
        raise ValueError("Falta GOOGLE_SERVICE_ACCOUNT_FILE en .env")

    cred_path = (BASE_DIR / service_account_file).resolve()
    if not cred_path.exists():
        raise FileNotFoundError(f"No existe el archivo de credenciales: {cred_path}")

    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds = Credentials.from_service_account_file(str(cred_path), scopes=scopes)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(sheets_id)
    return sh


def write_csv(csv_path: Path, rows: list[dict]):
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        csv_path.write_text("", encoding="utf-8")
        return

    fieldnames = list(rows[0].keys())
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def read_csv(csv_path: Path) -> list[dict]:
    if not csv_path.exists():
        return []
    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def _sanitize_headers(raw_headers: list[str]) -> list[str]:
    seen = {}
    headers = []
    for idx, h in enumerate(raw_headers, start=1):
        base = (h or "").strip() or f"col_{idx}"
        count = seen.get(base, 0) + 1
        seen[base] = count
        headers.append(base if count == 1 else f"{base}_{count}")
    return headers


def worksheet_to_rows(ws) -> list[dict]:
    try:
        return ws.get_all_records(default_blank="")
    except Exception:
        values = ws.get_all_values()
        if not values:
            return []
        headers = _sanitize_headers(values[0])
        rows = []
        for row in values[1:]:
            padded = row + [""] * (len(headers) - len(row))
            rows.append({headers[i]: padded[i] for i in range(len(headers))})
        return rows


def pull():
    sh = get_client()
    for ws_env, csv_file in SHEET_TO_CSV.items():
        ws_name = os.getenv(ws_env, "").strip()
        if not ws_name:
            print(f"[skip] {ws_env} no esta definido")
            continue

        ws = sh.worksheet(ws_name)
        rows = worksheet_to_rows(ws)
        write_csv(csv_file, rows)
        print(f"[ok] {ws_name} -> {csv_file.relative_to(BASE_DIR)} ({len(rows)} filas)")


def push():
    sh = get_client()
    for ws_env, csv_file in SHEET_TO_CSV.items():
        ws_name = os.getenv(ws_env, "").strip()
        if not ws_name:
            print(f"[skip] {ws_env} no esta definido")
            continue

        ws = sh.worksheet(ws_name)
        rows = read_csv(csv_file)

        if not rows:
            print(f"[skip] {csv_file.relative_to(BASE_DIR)} esta vacio o no existe")
            continue

        header = list(rows[0].keys())
        matrix = [header] + [[r.get(col, "") for col in header] for r in rows]
        ws.clear()
        ws.update(matrix, "A1")
        print(f"[ok] {csv_file.relative_to(BASE_DIR)} -> {ws_name} ({len(rows)} filas)")


def main():
    parser = argparse.ArgumentParser(description="Sync Google Sheets with local CSV files")
    parser.add_argument("mode", choices=["pull", "push"], help="Direction of sync")
    args = parser.parse_args()

    if args.mode == "pull":
        pull()
    else:
        push()


if __name__ == "__main__":
    main()
