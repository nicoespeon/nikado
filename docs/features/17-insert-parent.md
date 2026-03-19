# Feature 17: Insert Parent

## Goal

Users can insert a new intermediate task between a task and its current parent, without deleting and recreating nodes. Useful for grouping related tasks under a new parent.

`A → X` becomes `A → [new] → X`. The new task takes X's position in sibling order.

## Dependencies

Feature 16 (reorder siblings: introduces the long-press context menu on mobile)

## What to Build

### Model: insert function (`src/model/graph.ts`)

```typescript
export function insertParent(
	graph: MikadoGraph,
	taskId: TaskId,
	label: string,
): { graph: MikadoGraph; newTaskId: TaskId };
```

Steps:

1. Find the dependency `parentId → taskId`
2. Create new task with label
3. In the `dependencies` array: replace that dependency with `parentId → newTask`, then append `newTask → taskId`
4. New task starts as `pending`

No-op if taskId is the goal (no parent to insert between).

### Store (`src/store/graph-store.ts`)

- `insertParent(taskId, label)` → pushes history, starts editing the new task, selects it
- Same pattern as `addSubTask`: returns new task id

### Desktop: keyboard shortcut (`src/components/DesktopView.tsx`)

| Key       | Action        |
| --------- | ------------- |
| Shift+Tab | Insert parent |

Creates the new parent and enters edit mode for its label. Same flow as Tab (add child) but in the opposite direction.

Also add "Insert parent" to the right-click context menu on TaskNode (introduced for reorder in Feature 16).

### Mobile

Add "Insert parent" to the long-press context menu in OutlineView. Hidden for the goal task. After insert: auto-select and enter edit mode for the new parent.

### Help menu (`src/components/HelpMenu.tsx`)

Desktop: Add `["Shift + Tab", "Insert parent"]` to the "Tasks" shortcuts category.

## Testing

### Unit tests (`src/model/graph.test.ts`)

- Inserts a new parent between parent and child
- New task preserves sibling order position
- No-op when task is the goal
- Does not mutate original graph

### Integration tests (`src/App.test.tsx`)

- Shift+Tab creates a new parent and enters edit mode
- New parent appears between the old parent and the task

### Mobile tests (`src/components/OutlineView.test.tsx`)

- Long-press shows "Insert parent" option for non-goal tasks
- "Insert parent" hidden for the goal
- Selecting "Insert parent" creates the intermediate task

## Acceptance Criteria

- Shift+Tab inserts a parent on desktop
- Right-click menu offers "Insert parent" on desktop
- Long-press menu offers "Insert parent" on mobile
- New parent enters edit mode immediately
- Insert is undoable
- Graph layout updates correctly
- URL reflects new structure
- Help menu shows new shortcut
- No-op for the goal

## Notes

- The new task takes the same position in sibling order as the original task (it replaces the old dependency in-place, not appended to the end).
- The new parent inherits no status from the child. It starts as `pending`.
