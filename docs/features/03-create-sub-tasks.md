# Feature 03: Create Sub-Tasks

## Goal

User can add sub-tasks to any existing task, building the Mikado dependency graph.

## Dependencies

Features 01, 02

## What to Build

### Sub-task creation

Choose one primary interaction (keep it simple, Excalidraw-style):

- **Option A**: Select a task node, press a keyboard shortcut (e.g., `Tab` or `Enter`) to create an attached sub-task
- **Option B**: Button/icon on the task node
- **Option C**: Right-click context menu

Also allow creating sub-tasks by dragging a connection from an existing node to empty space (ReactFlow's `onConnectEnd` event).

### Auto-positioning

New sub-tasks should appear below their parent with reasonable spacing. No perfect auto-layout needed, but avoid overlapping.

### Edge creation

Creating a sub-task automatically draws an edge from parent to child. The edge represents: "parent depends on this sub-task."

### Label editing

New sub-tasks are immediately in edit mode so the user can type a label.

## Acceptance Criteria

- User can add a sub-task to any existing task
- New sub-task appears as a connected node below its parent
- Dependency edge is created automatically
- Sub-task label is immediately editable on creation
- Multiple sub-tasks can be added to the same parent
- Sub-tasks can have their own sub-tasks (arbitrary depth)
- Integration test: create goal, add sub-task, verify node and edge exist
- Integration test: add sub-task to a sub-task, verify nested structure

## Notes

- Edge direction in ReactFlow should visually show the dependency (parent > child)
- Consider a subtle animation when a new sub-task appears
- For deep graphs: auto-fit or scroll to keep things visible
