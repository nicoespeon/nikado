# Feature 08: Control Menu

## Goal

Replace ReactFlow's default `<Controls />` with a custom toolbar that surfaces common actions and serves as the mount point for future feature buttons.

## Dependencies

Features 01-07

## What to Build

### `src/components/ControlMenu.tsx`

A custom toolbar component that replaces `<Controls />` in `App.tsx`. Use ReactFlow's `<Panel position="bottom-center" />` for positioning (handles z-index and viewport correctly).

Buttons for v1:

| Button       | Action                                                | Enabled when     |
| ------------ | ----------------------------------------------------- | ---------------- |
| Add sub-task | Calls `addSubTask` on selected node, enters edit mode | Node is selected |
| Share        | Copies `window.location.href` to clipboard            | Graph exists     |
| New graph    | Resets the store to empty state                       | Always           |
| Undo         | Placeholder (wired in Feature 09)                     | Disabled         |
| Redo         | Placeholder (wired in Feature 09)                     | Disabled         |
| Export       | Placeholder (wired in Feature 10)                     | Disabled         |
| Help (?)     | Placeholder (wired in Feature 11)                     | Disabled         |

Each button shows a tooltip with the action name and keyboard shortcut (if one exists).

### Modify `src/App.tsx`

- Remove `<Controls />` import from `@xyflow/react`
- Add `<ControlMenu />` inside the `<ReactFlow>` wrapper
- The control menu reads from `useGraphStore` to determine enabled/disabled state

### Store: `resetGraph` action

Add a `resetGraph` action to `graph-store.ts`. Resets state to the initial empty graph.

The model function:

```typescript
// src/model/graph.ts
export function emptyGraph(): MikadoGraph {
	return { goalId: null, tasks: [], dependencies: [] };
}
```

### "New graph" confirmation

If the graph is non-empty, show a confirmation dialog before resetting. A native `window.confirm()` is fine for v1.

### "Share" feedback

Use `navigator.clipboard.writeText()` to copy the URL. Show brief visual feedback (e.g., button text changes to "Copied!" for 2 seconds).

### `src/components/ControlMenu.test.tsx`

Integration tests:

- Toolbar renders with expected buttons
- "Add sub-task" is disabled when no node is selected, enabled when one is
- "Share" copies the current URL to clipboard
- "New graph" resets the canvas
- Placeholder buttons are visible but disabled

## Acceptance Criteria

- Default ReactFlow `<Controls />` is removed
- Custom toolbar renders at a fixed position on the canvas
- "Add sub-task" works for the selected node (mirrors Tab keyboard shortcut)
- "Share" copies URL to clipboard with brief feedback
- "New graph" clears the graph (with confirmation if non-empty)
- Placeholder buttons for undo, redo, export, help are visible but disabled
- Each button shows a tooltip with the action name and shortcut key
- Integration tests pass

## Notes

- The existing test in `App.test.tsx` that queries `.react-flow__controls` must be updated to look for the custom toolbar.
- Keep the toolbar visually minimal. Horizontal bar with icon buttons, similar to Excalidraw's bottom toolbar.
- No icon library needed for v1. Simple inline SVGs or Unicode characters work.
- The toolbar must not capture keyboard events that the global handler in `App.tsx` already handles. Buttons respond to click/touch only.
- Memoize the component to follow the project's ReactFlow patterns.
