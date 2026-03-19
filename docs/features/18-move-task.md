# Feature 18: Move Task (Reparent)

## Goal

Users can move a task (and its subtree) to be a child of a different existing task. Introduces a new UI state: "move mode."

## Dependencies

Feature 16 (reorder siblings: introduces the long-press context menu on mobile)

## What to Build

### Model (`src/model/graph.ts`)

```typescript
export function moveTask(
	graph: MikadoGraph,
	taskId: TaskId,
	newParentId: TaskId,
): MikadoGraph;

export function canMoveTask(
	graph: MikadoGraph,
	taskId: TaskId,
	newParentId: TaskId,
): boolean;
```

`moveTask` steps:

1. Remove old dependency (`oldParent → taskId`)
2. Add new dependency (`newParentId → taskId`) at end of newParent's children
3. If moved task is not done: mark newParent undone (propagates up via `markUndone`)

`canMoveTask` checks:

- taskId is not the goal
- newParentId is not a descendant of taskId (prevents cycles)
- newParentId is not the current parent
- newParentId exists

### Store (`src/store/graph-store.ts`)

New state: `movingNodeId: TaskId | null`

New actions:

- `startMove(taskId)` → sets `movingNodeId`
- `confirmMove(targetId)` → validates via `canMoveTask`, calls `moveTask`, clears `movingNodeId`, pushes history
- `cancelMove()` → clears `movingNodeId`

### Desktop UX (`src/DesktopView.tsx`)

Two-step keyboard flow:

1. Select a task, press `m` → enters move mode
2. Task gets visual indicator (dashed border, slightly transparent)
3. Navigate with arrow keys to target parent
4. Press `Enter` to confirm, `Escape` to cancel
5. Invalid targets dimmed or marked

Also add "Move" to the right-click context menu on TaskNode.

Show a status indicator while in move mode.

### Mobile UX

- "Move" option in the long-press context menu → enters move mode
- Action bar changes to show "Cancel" button
- Moving task gets visual indicator in OutlineView
- Tap target task → move executes
- Invalid targets visually indicated (dimmed)

### Node Rendering

- `TaskNode` (`src/components/nodes/TaskNode.tsx`): conditional border/opacity for moving node and valid/invalid targets
- `OutlineRow` in `OutlineView`: same conditional styling

### Help menu (`src/components/HelpMenu.tsx`)

Desktop: Add `["m", "Move task to new parent"]` to "Tasks" shortcuts.

## Testing

### Unit tests (`src/model/graph.test.ts`)

- Reparents a task to a new parent
- Cycle detection prevents moving to own descendant
- Cannot move the goal
- Cannot move to current parent (no-op)
- markUndone propagation on new parent
- Does not mutate original graph

### Integration tests (`src/App.test.tsx`)

- Full keyboard flow: m → navigate → Enter confirms move
- Escape cancels move mode
- Invalid target rejected

### Mobile tests (`src/components/OutlineView.test.tsx`)

- Long-press shows "Move" option
- Enter move mode, tap target, move executes
- Cancel button exits move mode

## Acceptance Criteria

- `m` key enters move mode on desktop
- Arrow keys navigate to target, Enter confirms, Escape cancels
- Right-click menu offers "Move" on desktop
- Long-press menu offers "Move" on mobile
- Visual feedback for moving task and valid/invalid targets
- Move is undoable
- Cycle detection prevents invalid moves
- Cannot move the goal
- URL reflects new structure
- Help menu shows new shortcut

## Notes

- Move mode is a UI state, not a domain concept. It lives in the store alongside `editingNodeId`.
- When move mode is active, other shortcuts (Tab, Enter, Delete, etc.) should be suppressed.
- The moved task appears as the last child of the new parent.
- If the moved task was not done, the new parent (and its ancestors) are marked undone.
