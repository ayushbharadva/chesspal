"""Import a bounded subset of short puzzles from the CC0 Lichess database.

Install zstandard, then run this script. Rows are streamed and filtered on the fly;
the full database is never saved. The stream closes once every theme and level quota
is filled and the source rows of all bundled puzzles have been found.
"""

import csv
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

import zstandard

ROOT = Path(__file__).resolve().parents[2]
# Most specific first: a back-rank mate in one is trained as a back-rank mate.
THEMES = [
    "backRankMate",
    "mateIn2",
    "mateIn1",
    "discoveredAttack",
    "skewer",
    "pin",
    "fork",
    "hangingPiece",
]
MATE_THEMES = {"backRankMate", "mateIn2", "mateIn1"}
# ChessPal levels: Beginner, Easy, Medium, Hard and Expert puzzle ratings.
LEVELS = {1: (400, 699), 2: (700, 999), 3: (1000, 1299), 4: (1300, 1599), 5: (1600, 1899)}
# Puzzles per theme and level, counting the ones already bundled.
QUOTA = 80

bundled = json.loads((ROOT / "content" / "puzzles.json").read_text())
existing_ids = {puzzle["id"] for puzzle in bundled}
existing_rows = {}
selected = {(theme, level): [] for theme in THEMES for level in LEVELS}
wanted = {bucket: QUOTA for bucket in selected}
for puzzle in bundled:
    bucket = (puzzle["theme"], puzzle["level"])
    wanted[bucket] = max(0, wanted[bucket] - 1)


def level_for(rating):
    for level, (low, high) in LEVELS.items():
        if low <= rating <= high:
            return level
    return None


def primary_theme(themes):
    for theme in THEMES:
        if theme not in themes:
            continue
        if theme not in MATE_THEMES and "mate" in themes:
            continue
        return theme
    return None


def done():
    return len(existing_rows) == len(existing_ids) and all(
        len(rows) >= wanted[bucket] for bucket, rows in selected.items()
    )


request = Request(
    "https://database.lichess.org/lichess_db_puzzle.csv.zst",
    headers={"User-Agent": "ChessPal-content/1.0"},
)
scanned = 0
with urlopen(request, timeout=60) as response:
    with zstandard.ZstdDecompressor().stream_reader(response) as decompressed:
        rows = csv.DictReader(io.TextIOWrapper(decompressed, encoding="utf-8"))
        for row in rows:
            scanned += 1
            if scanned % 500_000 == 0:
                print(f"Scanned {scanned} rows")
            if row["PuzzleId"] in existing_ids:
                existing_rows[row["PuzzleId"]] = row
            elif int(row["Popularity"]) >= 80 and int(row["NbPlays"]) >= 100:
                level = level_for(int(row["Rating"]))
                themes = row["Themes"].split()
                theme = primary_theme(themes) if level else None
                if theme and len(row["Moves"].split()) in (2, 4):
                    bucket = selected[(theme, level)]
                    if len(bucket) < wanted[(theme, level)]:
                        row["PrimaryTheme"] = theme
                        bucket.append(row)
            if done():
                break

missing = sorted(existing_ids - existing_rows.keys())
for row in existing_rows.values():
    row["PrimaryTheme"] = primary_theme(row["Themes"].split()) or "hangingPiece"
    row["Existing"] = True
candidates = list(existing_rows.values()) + [row for rows in selected.values() for row in rows]
output = ROOT / "content" / "puzzle-candidates.json"
output.write_text(json.dumps(candidates, indent=2) + "\n", encoding="utf-8")
print(f"Scanned {scanned} rows; wrote {len(candidates)} candidates")
print({f"{theme}/{level}": len(rows) for (theme, level), rows in selected.items()})
if missing:
    print(f"Source rows not found for {len(missing)} bundled puzzles: {', '.join(missing)}")
