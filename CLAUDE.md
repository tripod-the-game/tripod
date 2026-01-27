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
- **Green (correct):** letter is in the correct position
- **Yellow (wrong-position):** letters at a word's positions form a valid puzzle word, but in the wrong word slot
- **Red flash:** all submitted letters are wrong

## Game JSON format

Games are stored in `games/MMDDYY.json`:
```json
{
    "category": "Category Hint",
    "wordOne": "FIRST",
    "wordTwo": "TENTH",
    "wordThree": "FIFTH"
}
```

For 4-letter puzzles, add `"size": 4` (5-letter puzzles default and don't need the field).

## Key architecture

- **Angular standalone components** with lazy routing
- `game.component.ts` — main game logic, submission validation, hints, reveal
- `triangle.component.ts` — renders the triangle grid, handles input/navigation
- `game.service.ts` — loads game JSON, generates letter arrays from words
- `past-submissions.component.ts` — modal to review previous submissions
- `landing.component.ts` — home/landing page

## Build & run

```
npm start        # dev server
npm run build    # production build
```
