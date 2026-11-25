# Tripod Project Memory

## Project Overview
Angular standalone app + Capacitor iOS wrapper. Word puzzle game with triangle grid.
- Dev: `npm start`, Build: `npm run build`, Tests: `npm test` (Karma + Jasmine + ChromeHeadless)
- iOS: `npm run build && npx cap sync && npx cap open ios`

## Test Setup Patterns
- Angular standalone components need `overrideComponent` with `schemas: [NO_ERRORS_SCHEMA]` to avoid unknown element errors in unit tests
- `SimpleChange` is from `@angular/core`, NOT `@angular/core/testing`
- TriangleComponent sets `isReady` on the next tick in `displayOnly` mode and emits `valuesSubmitted` in a microtask, so neither changes state mid-check (NG0100, #62 and #71). Unit tests need `tick()` or `flushMicrotasks()` (in `fakeAsync`) to observe them; use plain `fixture.detectChanges()`, not `detectChanges(false)`
- `LandingComponent` tests need `provideRouter([])` for ActivatedRoute

## Key Files
- `src/services/game.service.ts` — loads game JSON, generates letters from words, caches to localStorage
- `src/services/game.service.spec.ts` — full test coverage of letter gen, HTTP, caching, date parsing
- `src/services/loader.service.spec.ts` — BehaviorSubject observable tests
- `src/services/haptic.service.spec.ts` — non-native guard tests
- `src/services/share.service.spec.ts` — generateResultText star ratings, clipboard/share fallback chain
- `src/app/game/game.component.spec.ts` — validation (correct/wrong-position/all-wrong), hints, reveal, aggregation
- `src/app/triangle/triangle.component.spec.ts` — circles, isCorrect, isWrongPosition, onModelChange, ngOnChanges

## CSS Fix (4-letter triangle spacing)
Changed margin percentages in `triangle.component.scss` for size-4 data-index 1,2,3,4:
- `calc(50%)` → `calc(200% / 3)` and `calc(125%)` → `calc(400% / 3)`
- Ensures all diagonal gaps equal ~60.1px

## Game Mechanics Quick Ref
- 5-letter: 12 circles, positions 1-12 (1-indexed), letters array 0-indexed
- 4-letter: 9 circles
- WORD_POSITIONS_5: wordOne=[8,6,4,2,1], wordTwo=[1,3,5,7,12], wordThree=[8,9,10,11,12]
- WORD_POSITIONS_4: wordOne=[6,4,2,1], wordTwo=[1,3,5,9], wordThree=[6,7,8,9]
- Validation: correct=green (persists), wrong-position=yellow (latest only), all-none=red flash

## Game JSON
Path: `games/YYYY/MM/MMDDYY.json`
```json
{ "category": "...", "wordOne": "WORD1", "wordTwo": "WORD2", "wordThree": "WORD3" }
```
For 4-letter puzzles add `"size": 4`.
