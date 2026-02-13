# Feature 05: Delete Task

## Goal

User can delete tasks from the graph. Deletion cascades to sub-trees.

## Dependencies

Features 01, 02, 03

## What to Build

### Delete interaction

- Keyboard: `Delete` or `Backspace` on a selected/focused task
- No delete button for now. Plan for a button in Feature 08 (control menu).

### Cascade delete

When deleting a task:

1. Remove the task itself
2. Remove all descendants (sub-tasks, their sub-tasks, etc.)
3. Remove all edges involving removed tasks

Uses the `removeTask` function from Feature 01.

### No confirmation

Deletion is immediate. No confirmation dialog. Undo (Feature 09) will handle mistakes.

### No edge deletion

Edges cannot be selected or deleted independently. All nodes must be connected to the goal. No orphan nodes.

## Acceptance Criteria

- User can delete any task via `Delete`/`Backspace`
- Deleting a task with sub-tasks cascade-deletes the entire sub-tree
- All edges involving deleted tasks are removed
- Deleting the goal clears the graph
- Integration test: create goal with sub-tasks, delete a middle task, verify sub-tree is gone
- Integration test: delete the goal, verify graph is empty

## Notes

- The `removeTask` model function handles cascade logic. The component just calls the store action.
- Consider undo support in the future (not MVP, but don't block it). The pure model makes undo straightforward via state snapshots.
- ReactFlow has built-in delete handling for selected elements. Leverage it.
