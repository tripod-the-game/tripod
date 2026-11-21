---
name: qa-puzzles
description: Audit Tripod daily puzzles for broken data, schedule gaps, repeated content, and weak editorial fit, then report fixes without changing the puzzle repository. Run with /qa-puzzles, /qa-puzzles MMDDYY, or /qa-puzzles MMDDYY-MMDDYY.
argument-hint: [MMDDYY | MMDDYY-MMDDYY]
disable-model-invocation: true
---

# QA Puzzles

Scope: $ARGUMENTS

Audit what players will actually receive: the `main` branch of `tripod-the-game/tripod-games`. With no scope, review today's puzzle and everything scheduled after it.

## Graph

```text
Fresh clone → Deterministic audit → Editorial review → Report → [approve fixes] → separate PR
```

This workflow is read-only until the user approves a specific fix.

## Nodes

### 1. Fresh clone

Clone into a new temporary directory outside `~/Documents`:

```bash
QA_DIR="$(mktemp -d)/tripod-games"
git clone --depth 1 https://github.com/tripod-the-game/tripod-games.git "$QA_DIR"
```

Use a fresh clone so the audit reflects GitHub, not a local checkout that could be stale or stalled by iCloud.

### 2. Deterministic audit

From the Tripod repository, run:

```bash
python3 -I .claude/skills/qa-puzzles/scripts/audit_puzzles.py --repo "$QA_DIR" [--from MMDDYY]
```

Exit code 1 means errors were found and is a normal audit result. Exit code 2 means the audit could not run, so report that instead of a clean result.

- **Errors** can break a puzzle: invalid JSON or fields, mismatched corners, index problems, or no puzzle today.
- **Warnings** need judgment: repeats, a short schedule runway, date gaps, or words outside the dictionary.

### 3. Editorial review (`puzzle-reviewer`)

Pass it `QA_DIR`, the scope, and the audit JSON. Limit it to puzzles in scope, because old puzzles have already shipped. If more than 14 puzzles are in scope, split them into batches.

### 4. Report

Lead with the release decision for each date:

- **Blocked:** has an audit error, so players could be affected
- **Needs review:** has a warning or editorial concern worth a human decision
- **Ready:** passed the audit and review

Prioritize today's and tomorrow's puzzles. For each problem, give the date, the evidence, and a concrete suggested fix. Separate facts the script proved from editorial opinion.

### 5. Fixes

Ask before changing anything. After approval, work on a branch in a fresh clone outside iCloud and follow the `tripod-games` `CLAUDE.md`. Verify each replacement with its `new-games` helper, then rerun this audit before opening a PR.

Never push directly to `main` or merge. Changes to `tripod-games/main` reach all players, including installed iOS versions, as soon as they merge.

Be especially careful changing today's puzzle or any past puzzle. Players may have saved progress against the original words, so point this out and get explicit approval.
