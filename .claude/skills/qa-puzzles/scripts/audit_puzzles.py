#!/usr/bin/env python3
"""Read-only audit of a tripod-games checkout.

Errors can break a puzzle for players. Warnings need human judgment.
Structural checks cover all puzzles. Editorial checks cover --from onward.
Exit codes: 0 = no errors, 1 = errors found, 2 = could not run.
"""
import argparse
import datetime as dt
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from zoneinfo import ZoneInfo

WORD_KEYS = ("wordOne", "wordTwo", "wordThree")


def parse_key(key):
    if not isinstance(key, str) or not re.fullmatch(r"\d{6}", key):
        return None
    try:
        return dt.datetime.strptime(key, "%m%d%y").date()
    except ValueError:
        return None


def key_for(date):
    return date.strftime("%m%d%y")


def expected_path(date):
    return f"{date:%Y}/{date:%m}/{key_for(date)}.json"


def normalize_category(value):
    return re.sub(r"\s+", " ", str(value).strip().lower())


def load_dictionary(repo, size):
    path = repo / ".claude/skills/new-games/data" / f"words{size}.txt"
    if not path.exists():
        return None
    return {line.strip().lower() for line in path.read_text().splitlines() if line.strip()}


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, message):
        self.errors.append({"where": where, "message": message})

    def warning(self, where, message):
        self.warnings.append({"where": where, "message": message})


def check_puzzle(key, data, report):
    if not isinstance(data, dict):
        report.error(key, "puzzle is not a JSON object")
        return None
    category = data.get("category")
    if not isinstance(category, str) or not category.strip():
        report.error(key, "category is missing or empty")

    size = data.get("size", 5)
    if size not in (4, 5) or isinstance(size, bool):
        report.error(key, f"size must be 4 or 5, found {size!r}")
        return None

    words = []
    for word_key in WORD_KEYS:
        word = data.get(word_key)
        if not isinstance(word, str) or not word:
            report.error(key, f"{word_key} is missing or not a string")
            return None
        if not re.fullmatch(r"[A-Za-z]+", word):
            report.error(key, f"{word_key} {word!r} must contain only letters")
        if len(word) != size:
            report.error(key, f"{word_key} {word!r} has {len(word)} letters, expected {size}")
        if word != word.lower():
            report.warning(key, f"{word_key} {word!r} should be lowercase")
        words.append(word.lower())

    one, two, three = words
    if one[-1] != two[0]:
        report.error(key, f"apex mismatch: {one} ends {one[-1]}, {two} starts {two[0]}")
    if one[0] != three[0]:
        report.error(key, f"bottom-left mismatch: {one} starts {one[0]}, {three} starts {three[0]}")
    if two[-1] != three[-1]:
        report.error(key, f"bottom-right mismatch: {two} ends {two[-1]}, {three} ends {three[-1]}")
    if len(set(words)) != 3:
        report.warning(key, "the puzzle uses the same word more than once")
    return {"date": parse_key(key), "category": category or "", "size": size, "words": words}


def editorial_checks(puzzles, start, min_word_gap, dictionaries, report):
    ordered = sorted(puzzles, key=lambda item: item["date"])
    categories = defaultdict(list)
    words = defaultdict(list)
    solutions = {}

    for puzzle in ordered:
        key = key_for(puzzle["date"])
        category = normalize_category(puzzle["category"])
        solution = tuple(puzzle["words"])
        is_sunday = puzzle["date"].weekday() == 6
        no_category = category == "no category sunday"

        if puzzle["date"] >= start:
            if no_category and not is_sunday:
                report.warning(key, "'No Category Sunday' is not on a Sunday")
            if category in categories and not no_category:
                previous = key_for(categories[category][-1])
                report.warning(key, f"category {puzzle['category']!r} was used on {previous}")
            if solution in solutions:
                report.warning(key, f"same solution as {solutions[solution]}")
            for word in puzzle["words"]:
                if words[word]:
                    gap = (puzzle["date"] - words[word][-1]).days
                    if gap < min_word_gap:
                        report.warning(key, f"word {word!r} was used {gap} days earlier")
                dictionary = dictionaries.get(puzzle["size"])
                if dictionary is not None and word not in dictionary:
                    report.warning(key, f"word {word!r} is not in the dictionary (fine if it is a proper noun)")

        categories[category].append(puzzle["date"])
        solutions.setdefault(solution, key)
        for word in set(puzzle["words"]):
            words[word].append(puzzle["date"])


def audit(repo, today, start, min_runway, min_word_gap):
    report = Report()
    try:
        index = json.loads((repo / "index.json").read_text())
    except (OSError, ValueError) as exc:
        report.error("index.json", f"cannot read valid JSON: {exc}")
        index = []
    if not isinstance(index, list):
        report.error("index.json", "must be a JSON array")
        index = []

    valid_index = []
    seen = set()
    for entry in index:
        date = parse_key(entry)
        if date is None:
            report.error("index.json", f"invalid date entry {entry!r}")
        elif entry in seen:
            report.error("index.json", f"duplicate date {entry}")
        else:
            seen.add(entry)
            valid_index.append(entry)
    dates = [parse_key(entry) for entry in valid_index]
    if dates != sorted(dates):
        report.warning("index.json", "dates are not in chronological order")

    files = {}
    for path in repo.glob("20[0-9][0-9]/[0-9][0-9]/*.json"):
        relative = path.relative_to(repo).as_posix()
        date = parse_key(path.stem)
        if date is None:
            report.error(relative, "file name is not a valid MMDDYY date")
        elif relative != expected_path(date):
            report.error(relative, f"wrong folder, expected {expected_path(date)}")
        elif path.stem in files:
            report.error(relative, "duplicate puzzle date")
        else:
            files[path.stem] = path

    for key in sorted(seen - set(files), key=parse_key):
        report.error(key, "listed in index.json but the puzzle file is missing")
    for key in sorted(set(files) - seen, key=parse_key):
        report.error(key, "puzzle file exists but is not listed in index.json")

    puzzles = []
    for key in sorted(files, key=parse_key):
        try:
            data = json.loads(files[key].read_text())
        except (OSError, ValueError) as exc:
            report.error(key, f"invalid JSON: {exc}")
            continue
        puzzle = check_puzzle(key, data, report)
        if puzzle:
            puzzles.append(puzzle)

    available = seen & set(files)
    if key_for(today) not in available:
        report.error(key_for(today), "today's puzzle is not available")
    runway = 0
    cursor = today
    while key_for(cursor) in available:
        runway += 1
        cursor += dt.timedelta(days=1)
    if runway and runway < min_runway:
        last = key_for(cursor - dt.timedelta(days=1))
        report.warning("runway", f"only {runway} consecutive day(s) ready, through {last}")

    if dates:
        ordered = sorted(dates)
        for previous, current in zip(ordered, ordered[1:]):
            if (current - previous).days > 1 and current >= start:
                report.warning("schedule", f"date gap between {key_for(previous)} and {key_for(current)}")

    dictionaries = {size: load_dictionary(repo, size) for size in (4, 5)}
    editorial_checks(puzzles, start, min_word_gap, dictionaries, report)
    upcoming = [key_for(item["date"]) for item in sorted(puzzles, key=lambda item: item["date"]) if item["date"] >= start]
    return {
        "today": key_for(today),
        "from": key_for(start),
        "puzzles_checked": len(puzzles),
        "indexed": len(seen),
        "runway_days": runway,
        "editorial_scope": upcoming,
        "errors": report.errors,
        "warnings": report.warnings,
    }


def parse_arg_date(value):
    date = parse_key(value)
    if date is None:
        raise argparse.ArgumentTypeError("use MMDDYY")
    return date


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, type=Path, help="tripod-games checkout")
    parser.add_argument("--today", type=parse_arg_date, help="MMDDYY, defaults to today in Eastern time")
    parser.add_argument("--from", dest="start", type=parse_arg_date, help="start of editorial checks, MMDDYY")
    parser.add_argument("--min-runway", type=int, default=3)
    parser.add_argument("--min-word-gap", type=int, default=20)
    args = parser.parse_args()

    if not (args.repo / "index.json").exists():
        print(f"not a tripod-games checkout: {args.repo}", file=sys.stderr)
        return 2
    today = args.today or dt.datetime.now(ZoneInfo("America/New_York")).date()
    result = audit(args.repo, today, args.start or today, args.min_runway, args.min_word_gap)
    print(json.dumps(result, indent=2))
    return 1 if result["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
