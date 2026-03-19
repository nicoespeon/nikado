# Feature 16: Reorder Siblings

## Goal

Users can reorder sibling tasks without deleting and recreating them. Move a task up or down among its siblings using keyboard shortcuts (desktop) or a long-press context menu (mobile).

## Dependencies

Feature 07 (keyboard navigation), Feature 13 (mobile outline view), Feature 14 (mobile action bar)

## What to Build

### Model: reorder functions (`src/model/graph.ts`)

Two pure functions:

```typescript
export function moveSiblingUp(graph: MikadoGraph, taskId: TaskId): MikadoGraph;
export function moveSiblingDown(
	graph: MikadoGraph,
	taskId: TaskId,
): MikadoGraph;
```

Find all dependencies where `from === parentId`. Locate the task's index among those sibling dependencies. Swap the two `Dependency` entries in the full `dependencies` array.

No-op when:

- Task has no parent (it's the goal)
- Task is the only child
- Task is already at the boundary (first for up, last for down)

"Up" = earlier in the dependencies array = visually higher in the graph (dagre layout places first children at the top).

### Store: reorder actions (`src/store/graph-store.ts`)

- `moveSiblingUp(taskId)` — calls model function, pushes history
- `moveSiblingDown(taskId)` — calls model function, pushes history

Selection stays on the moved task.

### Desktop: keyboard shortcuts (`src/components/DesktopView.tsx`)

| Key     | Action            |
| ------- | ----------------- |
| Alt + ↑ | Move sibling up   |
| Alt + ↓ | Move sibling down |

Add to `handleKeyDown` with `e.altKey` guard. Only fires when a node is selected and not editing.

### Mobile: long-press context menu (`src/components/OutlineView.tsx`)

Add a long-press handler (500ms threshold) on outline rows. On long-press, show a context menu near the row with:

- **Move up** (hidden when task is first sibling or is the goal)
- **Move down** (hidden when task is last sibling or is the goal)

New component for the context menu, positioned relative to the long-pressed row. Dismisses on tap outside or Escape.

This context menu will be extended by Features 17 and 18.

### Help menu (`src/components/HelpMenu.tsx`)

Desktop: Add `["Alt + ↑ / ↓", "Reorder sibling"]` to the "Tasks" shortcuts category.

Mobile: Add "Long-press a task for more actions" to the "Interesting Actions" section.

## Testing

### Unit tests (`src/model/graph.test.ts`)

- `moveSiblingUp` swaps task with previous sibling
- `moveSiblingDown` swaps task with next sibling
- No-op when task is the goal (no parent)
- No-op when task is the only child
- No-op when task is first sibling and moving up
- No-op when task is last sibling and moving down
- Other dependencies in the array are not affected

### Integration tests (`src/App.test.tsx`)

- Alt+↑ moves selected node up among siblings
- Alt+↓ moves selected node down among siblings
- Alt+↑ on first sibling is a no-op
- Selection stays on the moved node

### Mobile tests (`src/components/OutlineView.test.tsx`)

- Long-press shows context menu with Move up / Move down
- Move up reorders the task
- Context menu hides Move up for first sibling
- Context menu dismisses on tap outside

## Acceptance Criteria

- Alt+↑ / Alt+↓ reorder siblings on desktop
- No-op at boundaries (no wrapping)
- Long-press context menu on mobile with Move up / Move down
- Context menu options hidden when not applicable
- Reorder is undoable
- Graph layout updates after reorder
- URL reflects new order (dependencies array serialized as-is)
- Help menu shows new shortcuts

## Notes

- Sibling order is implicit in the `dependencies` array. No schema change needed.
- The long-press context menu introduced here is the foundation for Features 17 and 18.
- The context menu should be a reusable component that other features can extend with additional options.
