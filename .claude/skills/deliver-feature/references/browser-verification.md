# Real Browser Verification

Automated assertions prove specific behavior. This pass catches what they miss: broken layouts, console errors, failed requests, and flows that do not work for a real player.

## Environment preflight

The orchestrator runs this at Setup and again before any run expected to take more than 10 minutes. Record the results in `state.md` under `## Environment`.

1. **Power:** run `pmset -g batt`. If the Mac is on battery or below 30%, ask the user to plug in before long runs. A sleeping Mac produces false E2E failures.
2. **Sleep:** wrap every long command in `caffeinate -i`, for example `caffeinate -i npx playwright test ...`. Do not rely on a separate `caffeinate` timer.
3. **Port:** choose a free port from 4210 to 4299 with `lsof -nP -iTCP:<port> -sTCP:LISTEN`. Never use, stop, or test against port 4200 or any port this run did not start, because those belong to the user or other checkouts.
4. **Server ownership:** the orchestrator starts and stops the run's server. Record its port and PID. Subagents reuse it and never start a second server on that port. If it dies, the orchestrator restarts it and tells any running subagent that connection-refused failures from that window are environmental.
5. **Chrome DevTools:** its tools cannot read or write files in the worktree or scratchpad. Inspect DevTools screenshots inline, and save evidence PNGs with Playwright instead.

## Stable server for verification

A live-reloading dev server rebuilds mid-run and can show Vite's error overlay, which caused a false failure before. Use the dev server only while code is changing. The production build hides development-only checks, so a separate development-server E2E run before the PR gate covers those. For Verify, after the code is settled, serve a production build without watching:

```bash
npx ng serve --configuration production --port <port> --no-watch --no-live-reload
```

Restart this server after every code change, and confirm it serves this worktree before testing.

## Required automated browser tests

Run from the worktree, inside `caffeinate -i`, with `--retries=0` so flakiness is visible:

```bash
npx playwright install chromium webkit
caffeinate -i npx playwright test --config .delivery/playwright.<port>.config.ts --project=chromium --retries=0
caffeinate -i npx playwright test --config .delivery/playwright.<port>.config.ts --project="Mobile Safari" --retries=0
```

Create `.delivery/playwright.<port>.config.ts` from this template. Do not modify the repository's Playwright config for a run.

```ts
// Git-ignored run config. The orchestrator owns the server on <port>.
import path from 'node:path';
import { defineConfig } from '@playwright/test';
import base from '../playwright.config';

const root = path.resolve(__dirname, '..');

export default defineConfig({
  ...base,
  testDir: path.join(root, 'e2e'),
  outputDir: path.join(root, 'test-results'),
  reporter: [['list']],
  use: { ...base.use, baseURL: 'http://localhost:<port>' },
  webServer: {
    command: 'npx ng serve --configuration production --port <port> --no-watch --no-live-reload',
    cwd: root,
    url: 'http://localhost:<port>',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
```

## Development-server E2E before the PR gate

CI runs E2E against the development build (`npm start`), which includes Angular's development-only checks such as `NG0100 ExpressionChangedAfterItHasBeenCheckedError`. The production build skips those checks, so a run that passes on production can still fail CI, as happened on PR #70.

The orchestrator runs this once after Review passes, when the code is final, and before showing the PR gate:

1. Pick a second free port from 4210 to 4299 and start a development server without watching. Record its port and PID in `state.md`:

   ```bash
   npx ng serve --port <dev-port> --no-watch --no-live-reload
   ```

2. Create `.delivery/playwright.dev<dev-port>.config.ts` from the template above, with `<dev-port>` as the port and that command as `webServer.command`.
3. Run full E2E on both projects with `--retries=0`, inside `caffeinate -i`.
4. Stop the development server.

Handle the results like this:

- **Pass:** record the result in `verify.md` and show it at the PR gate.
- **Fails only here:** check the same failure on `origin/main` with a development server. If it is `PRE-EXISTING`, add it to Known issues and ask the user how the tests should handle it. Otherwise it is a product failure: return to Fix, then Verify and a fresh Review, which counts toward the retry limits.
- **Could not run:** report it as not run at the PR gate.

## Required interactive pass

1. Use the run's server and confirm the response comes from this worktree's build.
2. Use the Chrome DevTools tools to open a new page. Do not reuse or close pages you did not open.
3. Run the affected flow at both sizes:
   - Phone: 390 × 844, with touch and mobile emulation
   - Desktop: 1280 × 800
4. Cover the states relevant to the change. For game changes, include both 4- and 5-letter puzzles, a reload, and an existing saved game.
5. After each flow, check the console and network. New errors, failed app requests, and uncaught exceptions are failures.
6. Save screenshots of key states in `.delivery/evidence/`, named `<ac-or-check>-<viewport>.png`, then look at them. Check for clipping, overlap, overflow, unreadable text, and controls hidden by the keyboard or safe area.

Isolate browser storage for the run. Use a fresh context where possible, and only clear storage for the local test origin, never production or another site.

## Pre-existing failures

Before reporting a product failure, check whether the same failure occurs on `origin/main`. The orchestrator creates a base worktree on request with `git worktree add --detach ~/Projects/tripod-worktrees/<slug>-base origin/main` and runs `npm ci` there, and removes it at cleanup.

- Fails the same way on base, and the change does not make it worse: mark it `PRE-EXISTING`. It does not fail verification unless an acceptance criterion requires fixing it.
- Absent on base, or worse on the branch: mark it `FAIL`.
- Not compared: say so. Do not assume either way.

## Re-verification after a fix

After a fix loop, re-verify incrementally instead of repeating everything:

- Always rerun the build, the full unit suite, and full E2E on both projects.
- Rerun targeted browser checks for the changed files and every acceptance criterion they can affect.
- Carry other results forward only if their code is unchanged since they passed. Label them `CARRIED` with the run they came from. Never carry a result across a change to the code it covers.

Run the full interactive pass again only for the final verify before the PR gate, or when UI code changed.

## Progress reporting

Append a short timestamped line to `.delivery/verify.md` under `## Progress` when each major step starts and ends, so the orchestrator can answer "what's the progress?" without reading transcripts.

## Native changes

When the `native` flag is set, run `npm run build && npx cap sync ios`, then launch in an iOS simulator and smoke-test the affected flow. Revert sync noise that is not part of the change. If the simulator cannot run, mark it `MANUAL` with exact steps so the orchestrator shows it at the PR gate.

## Reporting

Record each check as `PASS`, `FAIL`, `PRE-EXISTING`, `CARRIED`, `NOT RUN`, or `MANUAL`. A required check that did not run fails verification. Only the native simulator check may be `MANUAL`. If the failure is a missing tool or environment problem, label it `BLOCKED` so the orchestrator asks the user instead of sending it back for code changes.
