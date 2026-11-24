---
name: deliver-feature
description: Deliver a Tripod feature through a gated graph (spec, impact routing, plan, implement, verify, review, PR) using focused subagents. Run with /deliver-feature <feature request>, or /deliver-feature resume <slug>.
argument-hint: <feature request> | resume <slug>
disable-model-invocation: true
---

# Deliver Feature

Request: $ARGUMENTS

You are the orchestrator. You own the graph state, route work between subagents, and talk to the user. Subagents do the specialist work, and each starts with no memory of this conversation, so pass it the file paths it needs.

## Graph

```text
Setup → Spec → [approve] → Plan → Implement → Verify → Review → [approve] → PR → stop
                             ↑        ↑          │        │
                             │        └─ failed ─┘        │
                             └──── design problem ────────┘
```

Merging is deliberately outside the graph. A push to `main` deploys production, so the user merges the PR.

## State

Keep run state in `<worktree>/.delivery/` (git-ignored):

- `state.md`: current node, impact flags, retry counts, decisions
- `spec.md`, `plan.md`, `verify.md`, `review.md`: node outputs

Update `state.md` after every transition so a run can resume. For `resume <slug>`, read `~/Projects/tripod-worktrees/<slug>/.delivery/state.md` and continue from its current node.

## Nodes

### 1. Setup

1. Confirm the main checkout is clean and fetch `origin`.
2. Pick a short kebab-case slug.
3. Run `git worktree add -b feature/<slug> ~/Projects/tripod-worktrees/<slug> origin/main`.
4. Run `npm ci` in the worktree and create `.delivery/state.md`.
5. Run the environment preflight in `references/browser-verification.md`: power, sleep, a free port, and a server the orchestrator owns.

Use a worktree so parallel features and the user's checkout never disturb each other. Keep it outside `~/Documents`, because iCloud eviction corrupts git repositories.

### 2. Spec (`feature-spec`)

Have it write `.delivery/spec.md`, including the impact flags and the native compatibility check. Show the user a short summary, the acceptance criteria, the flags, and any open questions.

**Layout prototypes:** if the change adds or moves anything visible, build two or three throwaway prototypes of the layout options in the spec before planning. Put them in a git-ignored copy under `.delivery/prototypes/`, serve each on its own free port, and show the user real-browser screenshots at phone and desktop sizes. Record the choice in `state.md`. Skip this only when the spec has a single obvious layout and the user agrees.

**Gate:** wait for the user to approve or amend, including the layout choice. Skip this gate only when all of these hold: the change is UI-only, it has no storage, data, date, or native impact, and the user asked for it to run without stopping.

### 3. Plan (`feature-planner`)

Have it write `.delivery/plan.md` as ordered tasks with files, dependencies, and tests. Record the impact routing in `state.md`.

### 4. Implement (`feature-implementer`)

Run one implementer per task in dependency order. Run tasks in parallel only if the plan marks them independent and their files do not overlap. Each implementer works in the same worktree, so never overlap writes.

### 5. Verify (`feature-verifier`)

Have it follow `references/browser-verification.md` and write `.delivery/verify.md`, with evidence for every acceptance criterion. Screenshots go in `.delivery/evidence/`. Before Verify, restart the run's server as a stable production build. After a fix loop, tell the verifier which files changed so it re-verifies incrementally.

- Pass: go to Review.
- Fail: send the failures to an implementer, then verify again.
- `PRE-EXISTING` only: add each to Known issues and go to Review. Ask the user only if fixing one looks necessary for the feature to work.
- Blocked: stop and ask the user, because a missing tool or environment can't be fixed with code changes.

### 6. Review (`feature-reviewer`)

Use a fresh reviewer that did not write the code. Have it write `.delivery/review.md`. Archive each earlier review as `review-<n>.md` first, so later reviewers can confirm earlier findings were resolved.

**Severity rule:** an `important` finding is a defect this change introduces or makes materially worse, or an unmet acceptance criterion, with a concrete reachable scenario. Pre-existing defects the change does not touch are `pre-existing` findings: add them to Known issues instead of looping.

- No important findings: go to the PR gate.
- Implementation findings: go to Implement, then Verify, then a fresh Review.
- Design or spec findings: go to Plan, or back to the user if the spec itself is wrong.

### 7. PR

**Gate:** show the user the diff summary, verification evidence including browser results and screenshot paths, review result, any `MANUAL` checks, Known issues, and any iOS or data-release steps. Wait for approval.

After approval, commit on `feature/<slug>`, push it, and open a PR into `main` with `gh pr create`. The PR body covers the summary, acceptance evidence, risks, and rollout steps, and follows the repository's attribution instructions. Report the PR URL and CI status, then stop.

## Known issues

Keep a `## Known issues` section in `state.md` for problems found during the run that this change does not fix, including `PRE-EXISTING` failures and out-of-scope review findings. For each one, record what happens, how it was found, and whether it was reproduced or only read in code.

At the PR gate, list them and offer to file each one as a GitHub issue. File issues only with the user's approval. List them in the PR body either way, because `.delivery/` is deleted with the worktree.

## Retry limits

Allow **2** Verify-to-Implement loops and **2** Review-to-Implement loops per run. When a limit is reached, or the same failure repeats, stop and give the user the evidence and your recommendation. Repeating a failing approach burns time and tends to weaken the code or tests.

## Rules

- Never merge, force-push, deploy, or submit to the App Store from this workflow.
- Never weaken, skip, or delete a test to get a pass. A test that is truly wrong needs an explicit reason in `state.md` and a mention at the PR gate.
- If the `data` flag is set, changes to `tripod-games` are a separate PR and need their own approval. See `references/tripod-risks.md` for ordering.
- Report checks that could not run as not run, never as passed.
