# Feature 19: Progress Indicator

## Goal

Give users a sense of progress when working on large graphs. Show how many tasks are done out of the total.

## Dependencies

None.

## What to Build

### Model (`src/model/graph.ts`)

```typescript
export function computeProgress(graph: MikadoGraph): {
	done: number;
	total: number;
};
```

Counts all tasks in the graph. `done` = tasks with status `"done"`. `total` = all tasks. Parked tasks count toward total.

Returns `{ done: 0, total: 0 }` when the graph is empty.

### Visibility Threshold

The indicator is hidden when `total < 5`. Below that, the graph is small enough to see everything at a glance.

### Desktop UX (`src/DesktopView.tsx`)

A small element in the `top-right` panel, after the existing buttons (undo/redo, reset, export, copy, share).

Contents:

- A circular progress ring (green stroke on gray track). Small: ~20px diameter.
- Text showing the fraction: `4/12`.

When all tasks are done, the ring is full green. The GoalCelebration already handles the party moment, so the ring just stays full.

### Mobile UX (`src/MobileView.tsx`)

A thin (3-4px) full-width progress bar fixed below the toolbar (and below the saved-graphs bar if Pro is active).

- Green fill proportional to `done / total`.
- No text label (screen space is tight, and the outline already shows individual task states).
- Smooth CSS transition on width changes for the dopamine hit.

### Styling

- Green color matching the "done" status (`#7bc043` or the Tailwind green used elsewhere for done tasks).
- Dark mode: same green, slightly adjusted for contrast if needed.
- The circular ring uses a gray track in light mode, darker gray in dark mode.

### Component

Create `src/components/ProgressIndicator.tsx` with two named exports:

- `ProgressRing`: for desktop (circular ring + fraction text).
- `ProgressBar`: for mobile (thin horizontal bar).

Both read from the store directly. Both return `null` when `total < 5`.

## Testing

### Unit tests (`src/model/graph.test.ts`)

- Empty graph returns `{ done: 0, total: 0 }`
- Graph with mix of statuses counts correctly
- Parked tasks count toward total, not done

### Integration tests

Desktop (`src/DesktopView.test.tsx` or `src/App.test.tsx`):

- Progress not visible with fewer than 5 tasks
- Progress visible with 5+ tasks, shows correct fraction
- Fraction updates when a task is marked done

Mobile (`src/components/MobileView.test.tsx` or `src/App.test.tsx`):

- Progress bar not visible with fewer than 5 tasks
- Progress bar visible with 5+ tasks
- Bar width updates when a task is marked done

## Acceptance Criteria

- Desktop: circular progress ring + `done/total` fraction in top-right panel
- Mobile: thin green progress bar below toolbar
- Hidden when fewer than 5 tasks
- Updates immediately when task status changes
- Works in both light and dark mode
- URL-synced state means progress is restored on page load
- No layout shift when the indicator appears/disappears

## Notes

- The `computeProgress` function is pure and lives in the model layer.
- The threshold (5) is a constant in the component, not a user setting.
- The indicator is read-only. No interactions, no click handlers.
