---
name: fix-bug
description: Fix a Tripod bug through a gated graph (reproduce, failing test, root cause, fix, regression verification, independent review, PR) using focused subagents. Run with /fix-bug <bug report>, or /fix-bug resume <slug>.
argument-hint: <bug report> | resume <slug>
disable-model-invocation: true
---

# Fix Bug

Report: $ARGUMENTS

You are the orchestrator. You own the graph state, route work between subagents, and talk to the user. Each subagent starts with no memory of this conversation, so pass it the worktree and report path.

## Graph

```text
Setup → Reproduce → Root cause → [approve if risky] → Fix → Verify → Review → [approve] → PR → stop
            │                                          ↑       │        │
            └─ cannot reproduce → ask user             └─ fail ┴────────┘
```

Reproduction comes first because a fix for a bug nobody has observed cannot be proved. The test that fails before the fix and passes after it is the core evidence for the PR.

## State

Keep run state in `<worktree>/.delivery/` (git-ignored):

- `state.md`: current node, impact flags, retry counts, decisions
- `bug.md`: report, reproduction, root cause, regression test, fix scope
- `verify.md`, `review.md`, `evidence/`: verification and review outputs

Update `state.md` after every transition. For `resume <slug>`, read `~/Projects/tripod-worktrees/<slug>/.delivery/state.md` and continue from its current node.

## Nodes

### 1. Setup

1. Confirm the main checkout is clean and fetch `origin`.
2. Pick a short kebab-case slug.
3. Run `git worktree add -b fix/<slug> ~/Projects/tripod-worktrees/<slug> origin/main`.
4. Run `npm ci` in the worktree and create `.delivery/state.md`.
5. Run the environment preflight in `../deliver-feature/references/browser-verification.md`: power, sleep, a free port, and a server the orchestrator owns.

If the report points at a specific puzzle's words or file, use `/qa-puzzles` instead, because the bug may be in `tripod-games` data rather than the app.

### 2. Reproduce and diagnose (`bug-investigator`)

It reproduces the bug on unmodified code, adds the smallest failing regression test, and identifies the root cause in `.delivery/bug.md`. For a bug involving timeouts, loading, or other async behavior, it also maps every timer and loading state involved, so the fix handles their overlaps together.

- **Reproduced:** continue.
- **Not reproduced:** stop and show the user what was tried and the one piece of information that would help most. Do not make a speculative fix.
- **Not a bug:** explain the evidence and stop.

### 3. Risk gate

Pause for approval when any flag from `../deliver-feature/references/tripod-risks.md` is `storage`, `data`, `date`, or `native`, when the fix changes intended behavior, or when the scope grows beyond the root cause. Show the root cause, proposed fix, and risk.

Otherwise continue, because the PR gate still protects production.

### 4. Fix (`bug-fixer`)

It fixes the root cause with the smallest correct change and makes the regression test pass. It must prove each new or changed test catches the bug by temporarily removing the matching fix, confirming the test fails, and restoring the code exactly.

### 5. Verify (`feature-verifier`)

Tell it this is a bug run, so `.delivery/bug.md` is its acceptance source. It must confirm the original reproduction no longer occurs, run the regression test, and complete the required browser checks. Before Verify, restart the run's server as a stable production build. After a fix loop, tell the verifier which files changed so it re-verifies incrementally.

- Pass: go to Review.
- Product failure: return to Fix.
- `PRE-EXISTING` only: add each to Known issues and go to Review. Ask the user only if fixing one looks necessary for the bug fix to work.
- Blocked because a required tool or environment is unavailable: stop and ask the user. More code changes cannot solve that.

### 6. Review (`feature-reviewer`)

Use a fresh reviewer that did not write the code, with `.delivery/bug.md` as the source of truth. Archive each earlier review as `review-<n>.md` first, so later reviewers can confirm earlier findings were resolved.

**Severity rule:** an `important` finding is a defect this change introduces or makes materially worse, or an unmet acceptance criterion, with a concrete reachable scenario. Pre-existing defects the change does not touch are `pre-existing` findings: add them to Known issues instead of looping.

- No important findings: go to the PR gate.
- Fix findings: return to Fix, then Verify, then a fresh Review.
- Wrong diagnosis: return to Reproduce.

### 7. PR

Before the gate, run the development-server E2E check in `../deliver-feature/references/browser-verification.md`. CI uses the development build, which catches development-only Angular errors that the production build hides.

**Gate:** show the root cause, diff summary, before-and-after evidence, the development-server E2E result, review result, Known issues, and rollout notes. Wait for approval.

After approval, commit on `fix/<slug>`, push it, and open a PR into `main` with `gh pr create`. The PR body covers the symptom, root cause, fix, evidence, risks, and rollout steps, and follows the repository's attribution instructions. Report the PR URL and CI status, then stop.

## Known issues

Keep a `## Known issues` section in `state.md` for problems found during the run that this change does not fix, including `PRE-EXISTING` failures and out-of-scope review findings. For each one, record what happens, how it was found, and whether it was reproduced or only read in code.

At the PR gate, list them and offer to file each one as a GitHub issue. File issues only with the user's approval. List them in the PR body either way, because `.delivery/` is deleted with the worktree.

## Retry limits

Allow **2** Verify-to-Fix loops, **2** Review-to-Fix loops, and **1** return to Reproduce. When a limit is reached, or the same failure repeats, stop and give the user the evidence and your recommendation.

## Rules

- Never merge, force-push, deploy, or submit to the App Store from this workflow.
- Never weaken, skip, or delete a test to get a pass.
- Fix the cause, not only the symptom. If a mitigation is the right call for now, label it as one at the PR gate.
- Report checks that could not run as not run, never as passed.
