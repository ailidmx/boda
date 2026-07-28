#!/usr/bin/env python3
"""Generate the private travel timeline data module from travel CSV files."""

from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TRAVEL_DIR = ROOT / "viajes"
OUTPUT = ROOT / "web" / "private_planning" / "travel-timeline" / "data.js"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    groups = read_csv(TRAVEL_DIR / "grupos_viaje.csv")
    members = read_csv(TRAVEL_DIR / "grupo_miembros.csv")

    members_by_group: dict[str, list[dict[str, str]]] = {}
    for member in members:
        members_by_group.setdefault(member["group_id"], []).append(member)

    for group in groups:
        group["total_personas"] = int(group["total_personas"])
        group["members"] = members_by_group.get(group["group_id"], [])

    payload = {
        "generatedFrom": [
            "viajes/grupos_viaje.csv",
            "viajes/grupo_miembros.csv",
        ],
        "weddingDate": "2027-02-20",
        "weddingWeekendStart": "2027-02-19",
        "weddingWeekendEnd": "2027-02-21",
        "groups": groups,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "export const TRAVEL_TIMELINE_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT.relative_to(ROOT)} with {len(groups)} groups.")


if __name__ == "__main__":
    main()
