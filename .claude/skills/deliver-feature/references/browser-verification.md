# Real Browser Verification

Automated assertions prove specific behavior. This pass catches what they miss: broken layouts, console errors, failed requests, and flows that do not work for a real player.

## Required automated browser tests

Run from the worktree:

```bash
npx playwright install chromium webkit
CI=1 npm run e2e -- --project=chromium
CI=1 npm run e2e -- --project="Mobile Safari"
```

`CI=1` prevents Playwright from reusing a server on port 4200 that may belong to another checkout. If that port is busy, create `.delivery/playwright.<port>.config.ts` that extends `../playwright.config`, sets `testDir` to `../e2e`, uses a free port for `baseURL`, runs `npx ng serve --port <port>`, and sets `reuseExistingServer: false`. Do not modify the repository's Playwright config for this.

## Required interactive pass

1. Start this worktree on a free port with `npx ng serve --port <port>`, and confirm the response comes from this worktree's build. Stop the server when finished.
2. Use the Chrome DevTools tools to open a new page. Do not reuse or close pages you did not open.
3. Run the affected flow at both sizes:
   - Phone: 390 × 844, with touch and mobile emulation
   - Desktop: 1280 × 800
4. Cover the states relevant to the change. For game changes, include both 4- and 5-letter puzzles, a reload, and an existing saved game.
5. After each flow, check the console and network. New errors, failed app requests, and uncaught exceptions are failures.
6. Save screenshots of key states in `.delivery/evidence/`, named `<ac-or-check>-<viewport>.png`, then look at them. Check for clipping, overlap, overflow, unreadable text, and controls hidden by the keyboard or safe area.

Isolate browser storage for the run. Use a fresh context where possible, and only clear storage for the local test origin, never production or another site.

## Native changes

When the `native` flag is set, run `npm run build && npx cap sync ios`, then launch in an iOS simulator and smoke-test the affected flow. Revert sync noise that is not part of the change. If the simulator cannot run, mark it `MANUAL` with exact steps so the orchestrator shows it at the PR gate.

## Reporting

Record each check as `PASS`, `FAIL`, `NOT RUN`, or `MANUAL`. A required check that did not run fails verification. Only the native simulator check may be `MANUAL`. If the failure is a missing tool or environment problem, label it `BLOCKED` so the orchestrator asks the user instead of sending it back for code changes.
