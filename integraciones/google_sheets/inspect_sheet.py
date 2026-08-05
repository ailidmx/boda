"""Inspect the current Google Sheet: list worksheets and dump headers + sample rows."""
import os
import sys
from pathlib import Path

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = Path(__file__).resolve().parent / ".env"


def get_client():
    load_dotenv(ENV_PATH)
    sheets_id = os.getenv("GOOGLE_SHEETS_ID", "").strip()
    service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "").strip()
    cred_path = (BASE_DIR / service_account_file).resolve()
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds = Credentials.from_service_account_file(str(cred_path), scopes=scopes)
    gc = gspread.authorize(creds)
    return gc.open_by_key(sheets_id)


def main():
    sh = get_client()
    print("=== WORKSHEETS ===")
    for ws in sh.worksheets():
        print(f"  - {ws.title!r} (rows={ws.row_count}, cols={ws.col_count})")

    target = sys.argv[1:] if len(sys.argv) > 1 else None
    for ws in sh.worksheets():
        if target and ws.title not in target:
            continue
        print(f"\n=== SHEET: {ws.title} ===")
        values = ws.get_all_values()
        if not values:
            print("  (empty)")
            continue
        headers = values[0]
        print(f"  HEADERS ({len(headers)}):")
        for i, h in enumerate(headers, start=1):
            print(f"    [{i}] {h!r}")
        # print first 3 data rows
        print("  SAMPLE ROWS:")
        for row in values[1:4]:
            print(f"    {row}")


if __name__ == "__main__":
    main()
