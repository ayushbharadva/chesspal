"""Import a bounded beginner subset from the CC0 Lichess database.

Install zstandard, then run this script. The stream closes once enough candidates
are collected; the full database is never saved to the repository.
"""

import csv
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

import zstandard

TARGETS = {"mateIn1": 45, "hangingPiece": 35, "fork": 20}
selected = {theme: [] for theme in TARGETS}
request = Request(
    "https://database.lichess.org/lichess_db_puzzle.csv.zst",
    headers={"User-Agent": "RookieReps-content/1.0"},
)
with urlopen(request, timeout=60) as response:
    with zstandard.ZstdDecompressor().stream_reader(response) as decompressed:
        rows = csv.DictReader(io.TextIOWrapper(decompressed, encoding="utf-8"))
        scanned = 0
        for row in rows:
            scanned += 1
            themes = row["Themes"].split()
            moves = row["Moves"].split()
            if not (250 <= int(row["Rating"]) <= 800):
                continue
            if int(row["Popularity"]) < 80 or int(row["NbPlays"]) < 100:
                continue
            if len(moves) not in (2, 4):
                continue
            for theme, target in TARGETS.items():
                if theme != "mateIn1" and "mate" in themes:
                    continue
                if theme in themes and len(selected[theme]) < target:
                    row["PrimaryMotif"] = theme
                    selected[theme].append(row)
                    break
            if all(len(selected[theme]) >= target for theme, target in TARGETS.items()):
                break
            if scanned >= 1_000_000:
                break

output = Path(__file__).resolve().parents[2] / "content" / "puzzle-candidates.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps([row for group in selected.values() for row in group], indent=2) + "\n", encoding="utf-8")
print(f"Scanned {scanned} rows; imported {sum(len(group) for group in selected.values())} candidates")
print({theme: len(group) for theme, group in selected.items()})
