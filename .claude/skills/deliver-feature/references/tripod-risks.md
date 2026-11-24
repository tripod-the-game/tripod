# Tripod Impact Flags and Risks

Set every flag that applies. Each one adds required plan tasks, tests, and verification.

## `logic`
Touches validation, hints, reveal, submissions, scoring, or stats calculation.
- Cover both 4-letter (9 circles) and 5-letter (12 circles) puzzles.
- Cover shared corners, and keep the word-level purple and letter-level yellow signals distinct.

## `ui`
Touches components, styling, modals, or input.
- Check desktop and phone widths, keyboard navigation, and both puzzle sizes.
- For a visible layout change, show the user two or three real-browser prototypes at the spec gate, before planning. Two built layouts were rejected late in one run.

## `storage`
Touches any `tripod_*` localStorage key or its shape.
- Saved stats, streaks, and in-progress games are irreplaceable player data.
- Add a test that loads a fixture in the previous format and proves it survives.
- Handle missing and malformed values in the keys and fields this change reads or writes, without throwing or overwriting data. Malformed-data handling the change does not touch is out of scope. If it fails on `origin/main` too, report it as `PRE-EXISTING`.

## `data`
Touches the game JSON format, `index.json`, or game loading.
- Installed App Store builds fetch from `tripod-games` `main`, so a data change reaches old app versions immediately.
- Changes must be additive. Old clients must still load new files, and new clients must still load old files.
- Ship client support first. Publish data that depends on it only after that client is live and old clients are confirmed safe.
- Changes to request timeouts, Retry, or loading states are timing-sensitive. List every timer and loading state involved (request timeout, `LoaderService` minimum and maximum, `AppComponent` reveal and fade, Retry, date switching, stale responses) and test their overlaps, including a keyboard Retry while the loader is up or fading.

## `date`
Touches rollover, date parsing, past games, or streaks.
- Games roll over at midnight Eastern regardless of the player's time zone.
- Test both sides of midnight Eastern, both daylight saving transitions, and a player far from Eastern time.

## `native`
Touches Capacitor, haptics, native sharing, safe areas, splash, or `ios/`.
- Web CI does not cover this. Run `npm run build && npx cap sync`, then check in the simulator or list it as a manual step.
- Web deploys on merge, but iOS needs an App Store release, so the two can be live on different versions.

Check native compatibility for every change, flagged or not, at spec time:
- Any new web platform feature (for example `inert`, `:has()`, or `dialog`) must work in Safari on the app's iOS deployment target, `IPHONEOS_DEPLOYMENT_TARGET` in `ios/App/App.xcodeproj/project.pbxproj`. If it does not, list raising the target or a fallback as an open question.
- Before planning a device test, confirm that the installed Xcode supports the test iPhone's iOS version with `xcrun devicectl list devices`. If it does not, plan for TestFlight or a simulator instead.

## Commands

Run from the worktree:

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
caffeinate -i npx playwright test --config .delivery/playwright.<port>.config.ts --project=chromium --retries=0
caffeinate -i npx playwright test --config .delivery/playwright.<port>.config.ts --project="Mobile Safari" --retries=0
```

The run config uses the orchestrator's port, never 4200, which may belong to another checkout. GitHub Actions runs Chromium and Mobile Safari as separate jobs with retries, and retries can hide flakiness, so local runs use `--retries=0` and report any test that passed only on retry.

Follow `browser-verification.md` for browser setup, busy ports, and the required interactive pass.
