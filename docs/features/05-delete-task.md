# Feature 05: Delete Task

## Goal

User can delete tasks from the graph. Deletion cascades to sub-trees.

## Dependencies

Features 01, 02, 03

## What to Build

### Delete interaction

- Keyboard: `Delete` or `Backspace` on a selected/focused task
- Optional: delete button on the node or in a context menu

### Cascade delete

When deleting a task:

1. Remove the task itself
2. Remove all descendants (sub-tasks, their sub-tasks, etc.)
3. Remove all edges involving removed tasks

Uses the `removeTask` function from Feature 01.

### Confirmation

- Leaf task (no sub-tasks): no confirmation needed
- Task with sub-tasks: brief confirmation (e.g., "Delete task and 3 sub-tasks?")
- Goal (root) node: clears the entire graph, confirm with stronger messaging

### Edge deletion

Users can also delete individual edges without deleting nodes. This disconnects a sub-task from its parent but keeps the sub-task as a free-floating node.

## Acceptance Criteria

- User can delete any task via `Delete`/`Backspace`
- Deleting a task with sub-tasks cascade-deletes the entire sub-tree
- All edges involving deleted tasks are removed
- Confirmation prompt for tasks with sub-tasks
- Deleting the goal clears the graph (with confirmation)
- Users can delete individual edges without deleting nodes
- Integration test: create goal with sub-tasks, delete a middle task, verify sub-tree is gone
- Integration test: delete the goal, verify graph is empty
- Integration test: delete an edge, verify nodes remain but are disconnected

## Notes

- The `removeTask` model function handles cascade logic. The component just calls the store action.
- Consider undo support in the future (not MVP, but don't block it). The pure model makes undo straightforward via state snapshots.
- ReactFlow has built-in delete handling for selected elements. Leverage it.
