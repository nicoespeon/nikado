# Feature 15: Mobile Toolbar

## Goal

Users can undo mistakes, share their graph URL, switch themes, and access help from their phone. A fixed top bar provides always-visible utility actions.

## Dependencies

Feature 13 (mobile view exists), Feature 14 (action bar exists)

## What to Build

### `src/components/MobileToolbar.tsx`

A fixed top bar: `fixed top-0 left-0 right-0` with `pt-[env(safe-area-inset-top)]` for notch/dynamic island.

**Buttons:**

| Button        | Reuses               | Notes                            |
| ------------- | -------------------- | -------------------------------- |
| Undo          | `UndoButton`         | Disabled when no history         |
| Redo          | `RedoButton`         | Disabled when no future          |
| Share         | `ShareButton`        | Copies URL to clipboard          |
| Copy Markdown | `CopyMarkdownButton` | Copies graph as text             |
| Reset         | `ResetButton`        | Clears graph (with confirmation) |
| Theme toggle  | `ThemeToggle`        | Cycles light/dark/system         |
| Help          | Opens help menu      | Same `HelpMenu` component        |

These components already access the store independently. They do NOT depend on ReactFlow. Reuse them directly.

**Omitted:** `ExportButton`. It depends on the ReactFlow DOM (captures the canvas as an image). On mobile there is no ReactFlow canvas. `CopyMarkdownButton` covers the "export" use case.

**Styling:** horizontal row of icon buttons, white/dark background, bottom border. Visually consistent with desktop toolbar buttons but spaced for touch (min 44px targets).

### Update `src/MobileView.tsx`

- Add `MobileToolbar` at the top of the composition
- Add top padding to the outline view / empty state to account for toolbar height
- Wire help menu state: `MobileToolbar` help button opens `HelpMenu` overlay (same component used on desktop)

### `src/components/MobileToolbar.test.tsx`

Integration tests:

- Renders undo/redo buttons with correct disabled states
- Undo/redo buttons trigger store actions
- Share button copies URL to clipboard
- Copy Markdown button copies graph as text
- Reset button clears the graph
- Theme toggle cycles themes
- Help button opens the help menu
- Export button is not rendered

## Acceptance Criteria

- Mobile toolbar renders at the top of the screen on mobile.
- All utility actions work: undo, redo, share, copy markdown, reset, theme toggle, help.
- Export-to-image button is not shown on mobile.
- Help menu opens and closes correctly from the toolbar.
- Toolbar respects safe area insets (no content hidden behind notch/dynamic island).
- All buttons have minimum 44px touch targets.
- All tests pass, build passes, lint passes.

## Notes

- The existing button components (`UndoButton`, `RedoButton`, etc.) may need minor styling adjustments for the mobile toolbar context (they currently use `w-7 h-7` which is 28px, below the 44px touch target minimum). Consider wrapping them with larger touch areas or adjusting their size when rendered in the mobile toolbar.
- The `HelpMenu` component already works as a modal overlay with backdrop click-to-close. No changes needed for mobile.
- On mobile, the `?` keyboard shortcut for help is irrelevant (no physical keyboard). The toolbar button is the only trigger.
- This feature completes the mobile experience. After this, the full workflow is possible: create goal, add tasks, manage status, undo mistakes, share URL, access help.
