# Feature 09: Undo/Redo

## Goal

Users can undo and redo graph changes with standard keyboard shortcuts.

## Dependencies

Feature 08 (control menu provides the UI buttons)

## What to Build

### Approach: snapshot-based history

`MikadoGraph` is a small, plain object (tasks array + dependencies array + goalId). Snapshot-based is the right choice:

- The model is already pure and immutable. Every action produces a new `MikadoGraph`.
- The graph rarely exceeds 20-30 tasks (URL length budget constrains it).
- Command-based requires defining inverse operations for every action. More code, more bugs.
- Snapshot-based is trivial: push the previous state onto a stack before each action.

### `src/model/history.ts`

Pure functions and types for history management:

- `History` type: `{ past: ReadonlyArray<MikadoGraph>; future: ReadonlyArray<MikadoGraph> }`
- `pushState(history, current)`: pushes current onto past, clears future
- `undo(history, current)`: pops from past, pushes current onto future. Returns null if past is empty.
- `redo(history, current)`: pops from future, pushes current onto past. Returns null if future is empty.
- `MAX_HISTORY_SIZE` constant (50). `pushState` drops the oldest entry when the limit is reached.

### `src/model/history.test.ts`

Unit tests:

- `pushState` adds to past, clears future
- `undo` moves state from past to future
- `redo` moves state from future to past
- `undo` returns null when past is empty
- `redo` returns null when future is empty
- History respects `MAX_HISTORY_SIZE`

### Modify `src/store/graph-store.ts`

- Add state fields: `past: MikadoGraph[]`, `future: MikadoGraph[]`
- Add actions: `undo()`, `redo()`
- Add derived selectors: `canUndo`, `canRedo`
- Wrap each mutating action (`createGoal`, `addSubTask`, `addSibling`, `setTaskLabel`, `removeTask`, `setTaskStatus`, `resetGraph`) to call `pushState` before applying the change
- `editingNodeId` and `selectedNodeId` are UI state, not part of `MikadoGraph`. They stay out of snapshots.
- Extract a `snapshot(state)` helper that picks just the `MikadoGraph` fields (`goalId`, `tasks`, `dependencies`).

### Label edit grouping

Snapshot before `startEditing`, not on each `setTaskLabel` call. This way, all typing during an edit session counts as one undo step. The undo restores the state from before editing started.

### Modify `src/App.tsx`

Add keyboard handlers in the existing `handleKeyDown`:

- `Cmd/Ctrl+Z` (no Shift): calls `undo()`
- `Cmd/Ctrl+Shift+Z`: calls `redo()`

These should be checked before other shortcuts to avoid conflicts.

### Modify `src/components/ControlMenu.tsx`

Enable the Undo and Redo buttons. Wire them to `store.undo()` and `store.redo()`. Disable when `canUndo` / `canRedo` is false.

### Integration tests

- Undo after creating a subtask removes the subtask
- Redo after undo restores the subtask
- Undo after undo walks back multiple steps
- New action after undo clears the redo stack
- Undo/redo toolbar buttons reflect availability (enabled/disabled)
- `Ctrl+Z` / `Ctrl+Shift+Z` trigger undo/redo

## Acceptance Criteria

- `Cmd/Ctrl+Z` undoes the last graph change
- `Cmd/Ctrl+Shift+Z` redoes the last undone change
- Undo/redo toolbar buttons work and reflect availability
- New action after undo clears the redo stack
- History is capped at 50 entries
- UI state (selection, editing) is not part of the undo stack
- URL updates after undo/redo (existing URL sync handles this)
- Label edits are grouped: one undo step per edit session
- Unit tests for pure history functions
- Integration tests for shortcuts, button states, multi-step undo

## Notes

- `MikadoGraph` snapshots are a few KB at most for 20 tasks. Memory is not a concern.
- Only snapshot on graph-mutating actions. Not on `selectNode`, `startEditing`, or `stopEditing`.
- The `resetStore` helper in tests needs updating to also reset `past` and `future`.
- `Cmd+Z` / `Cmd+Shift+Z` on macOS, `Ctrl+Z` / `Ctrl+Shift+Z` on other platforms. Use `e.metaKey || e.ctrlKey` to cover both.
