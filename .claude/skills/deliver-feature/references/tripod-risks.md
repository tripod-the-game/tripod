# Tripod Impact Flags and Risks

Set every flag that applies. Each one adds required plan tasks, tests, and verification.

## `logic`
Touches validation, hints, reveal, submissions, scoring, or stats calculation.
- Cover both 4-letter (9 circles) and 5-letter (12 circles) puzzles.
- Cover shared corners, and keep the word-level purple and letter-level yellow signals distinct.

## `ui`
Touches components, styling, modals, or input.
- Check desktop and phone widths, keyboard navigation, and both puzzle sizes.

## `storage`
Touches any `tripod_*` localStorage key or its shape.
- Saved stats, streaks, and in-progress games are irreplaceable player data.
- Add a test that loads a fixture in the previous format and proves it survives.
- Handle missing and malformed values without throwing or overwriting data.

## `data`
Touches the game JSON format, `index.json`, or game loading.
- Installed App Store builds fetch from `tripod-games` `main`, so a data change reaches old app versions immediately.
- Changes must be additive. Old clients must still load new files, and new clients must still load old files.
- Ship client support first. Publish data that depends on it only after that client is live and old clients are confirmed safe.

## `date`
Touches rollover, date parsing, past games, or streaks.
- Games roll over at midnight Eastern regardless of the player's time zone.
- Test both sides of midnight Eastern, both daylight saving transitions, and a player far from Eastern time.

## `native`
Touches Capacitor, haptics, native sharing, safe areas, splash, or `ios/`.
- Web CI does not cover this. Run `npm run build && npx cap sync`, then check in the simulator or list it as a manual step.
- Web deploys on merge, but iOS needs an App Store release, so the two can be live on different versions.

## Commands

Run from the worktree:

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
CI=1 npm run e2e -- --project=chromium
CI=1 npm run e2e -- --project="Mobile Safari"
```

`CI=1` stops Playwright from reusing a dev server on port 4200 that may belong to another checkout. GitHub Actions currently runs only Chromium, so the Mobile Safari run is a local gate. CI retries can hide flakiness, so report any test that passed only on retry.

Follow `browser-verification.md` for browser setup, busy ports, and the required interactive pass.
