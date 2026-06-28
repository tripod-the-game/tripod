# Tripod - Project Context

## Game Mechanics

Tripod is a word puzzle game. Players fill letters into circles arranged in a triangle shape. Three words overlap at the triangle's corners:

### 5-letter puzzle (12 circles)
```
         1           (apex)
       2   3
     4       5
   6           7
 8   9  10  11   12    (bottom row)
```
- **Word 1 (left edge):** positions [8, 6, 4, 2, 1] — bottom-left to apex
- **Word 2 (right edge):** positions [1, 3, 5, 7, 12] — apex to bottom-right
- **Word 3 (bottom row):** positions [8, 9, 10, 11, 12] — left to right

### 4-letter puzzle (9 circles)
```
      1          (apex)
     2 3
    4   5
   6 7 8 9      (bottom row)
```
- **Word 1 (left edge):** positions [6, 4, 2, 1]
- **Word 2 (right edge):** positions [1, 3, 5, 9]
- **Word 3 (bottom row):** positions [6, 7, 8, 9]

### Shared corners
- **Apex** (position 1): last letter of Word 1 = first letter of Word 2
- **Bottom-left** (position 8 or 6): first letter of Word 1 = first letter of Word 3
- **Bottom-right** (position 12 or 9): last letter of Word 2 = last letter of Word 3

### Validation colors
- **Green (correct):** letter is in the exact correct position (`#4caf50`)
- **Purple (wrong-position):** the letters at a word's positions spell a valid puzzle word, but placed in the wrong word slot — this is a word-level signal, not letter-level (`#9c27b0`)
- **Yellow (present):** letter exists somewhere in the remaining unsolved positions, but isn't correct here — letter-level signal (`#f9a825`)
- **Red flash:** all submitted letters were completely wrong — temporary shake animation

### Submissions & hints
- **Unlimited submissions** — no guess limit; players can keep trying until solved or revealed
- **3 hints per game** — each hint reveals a random unsolved letter; hints persist across resets
- **Last hint warning** — when only one letter remains unsolved, using a hint shows a confirmation modal and ends the game (marks as not solved)
- **Reveal all** — fills every remaining letter at once; counts as a loss but is still recorded in stats

## Game JSON format

Games are stored in a separate GitHub repository and fetched at runtime:

**Base URL:** `https://raw.githubusercontent.com/tripod-the-game/tripod-games/main`

Games are organized by year and month: `games/YYYY/MM/MMDDYY.json`

```
games/
  index.json              ← list of available game dates (array of MMDDYY strings)
  2026/
    01/
      012626.json
      012726.json
```

Each game file:
```json
{
    "category": "Category Hint",
    "wordOne": "FIRST",
    "wordTwo": "TENTH",
    "wordThree": "FIFTH"
}
```

For 4-letter puzzles, add `"size": 4` (5-letter puzzles default and don't need the field).

All games are cached in localStorage (`tripod_game_<date>`) as a fallback for network failures. Games roll over at **midnight EST/EDT** regardless of the user's local timezone.

## Key architecture

**Angular standalone components** with lazy routing.

### Components
- `game.component.ts` — main game logic, submission validation, hints, reveal
- `triangle.component.ts` — renders the triangle grid, handles input/navigation
- `landing.component.ts` — home/landing page with display-only triangle preview
- `how-to-play.component.ts` — tutorial modal (step 1: rules + color legend, step 2: interactive practice with GUAVA/APPLE/GRAPE)
- `past-submissions.component.ts` — modal carousel to review previous submission attempts
- `past-date-selector.component.ts` — Material Datepicker for loading past games (shows solved/revealed/started status per date)
- `stats.component.ts` — statistics modal (win%, streaks, guess distribution 1–6 and 7+)
- `submit-button.component.ts` — submit button with shake feedback
- `reset-button.component.ts` — reset button (clears non-correct letters, preserves hints)

### Services
- `game.service.ts` — fetches game JSON from GitHub, generates letter arrays from words, handles date/timezone logic
- `state.service.ts` — all localStorage persistence: submissions, per-date state (hints used, hinted positions, revealed flag), in-progress letter inputs
- `stats.service.ts` — win%, current/max streak, guess distribution tracking
- `share.service.ts` — generates share text and PNG card image; platform-aware (native share on iOS/Android, Web Share API, clipboard fallback)
- `haptic.service.ts` — Capacitor haptics, no-ops gracefully on web
- `loader.service.ts` — loading spinner with minimum display time and iOS splash screen awareness

### localStorage keys
- `tripod_stats` — all game results (date, solved, attempts, hintsUsed, revealed)
- `tripod_submissions` — full submission history with per-circle validation states
- `tripod_state_<MMDDYY>` — per-date: hintsUsed, hintedPositions, revealed
- `tripod_inputs_<MMDDYY>` — per-date in-progress letter inputs
- `tripod_game_<date>` — cached game JSON
- `tripod_games_index` — cached list of available dates
- `tripod_seen_tutorial` — whether the tutorial has been shown

## Build & run

```
npm start        # dev server
npm run build    # production build
```

## iOS (Capacitor)

The app uses Capacitor to wrap the Angular app as a native iOS app.

- **Package ID:** `com.tripod.app`
- **Xcode project:** `ios/`
- **Config:** `capacitor.config.ts`

```
npm run build          # build Angular app
npx cap sync           # copy web assets to iOS project
npx cap open ios       # open in Xcode
```

To deploy updates: build → sync → archive in Xcode → upload to App Store Connect.
