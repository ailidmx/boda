#!/usr/bin/env python3
"""Compare current Firestore guests (from /tmp/current_guests.tsv) vs Google Sheet."""
import csv
import re
import unicodedata

def norm(s):
    s = (s or "").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()

# Load sheet
sheet_rows = []
with open("invitados/lista_invitados.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        sheet_rows.append(r)

sheet_by_name = {}
sheet_by_email = {}
for r in sheet_rows:
    full = norm(f"{r.get('Nombre','')} {r.get('Nombre 2','')} {r.get('Apellido','')} {r.get('Apellido 2','')}")
    email = (r.get("email") or "").strip().lower()
    if full:
        sheet_by_name[full] = r
    if email:
        sheet_by_email[email] = r

# Load Firestore dump
fs_guests = []
with open("/tmp/current_guests.tsv", encoding="utf-8") as f:
    lines = f.read().splitlines()
for line in lines[1:]:  # skip TOTAL header
    parts = line.split("\t")
    if len(parts) < 3:
        continue
    gid, first, last = parts[0], parts[1], parts[2]
    email = parts[4] if len(parts) > 4 else ""
    fs_guests.append({"id": gid, "first": first, "last": last, "email": email.strip().lower()})

matched_name = 0
matched_email = 0
unmatched = []
for g in fs_guests:
    full = norm(f"{g['first']} {g['last']}")
    if full in sheet_by_name:
        matched_name += 1
    elif g["email"] and g["email"] in sheet_by_email:
        matched_email += 1
    else:
        unmatched.append(f"{g['id']} ({g['first']} {g['last']})")

print(f"Firestore guests: {len(fs_guests)}")
print(f"Sheet rows: {len(sheet_rows)}")
print(f"Matched by name: {matched_name}")
print(f"Matched by email only: {matched_email}")
print(f"UNMATCHED in Firestore (not in sheet): {len(unmatched)}")
print("\n--- Unmatched Firestore guests ---")
for u in unmatched:
    print(f"  {u}")
