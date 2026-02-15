# Feature 12: Collapse/Expand Subtasks

## Goal

Users can collapse a parent node to hide its descendants, reducing visual noise on large graphs. Collapsed state persists in the URL and expands automatically during image export.

## Dependencies

Feature 07 (keyboard navigation), Feature 10 (export to image), Feature 06 (URL state)

## What to Build

### Model: visibility helper (`src/model/graph.ts`)

Add a pure function:

```typescript
export function isNodeHidden(
	graph: MikadoGraph,
	taskId: TaskId,
	collapsedNodes: Set<TaskId>,
): boolean;
```

Walk up the parent chain via `findParent`. Return `true` if any ancestor is in `collapsedNodes`. The collapsed node itself is NOT hidden (only its descendants are).

### URL serialization (`src/model/url.ts`)

Extend the serialized format to include an optional `collapsedNodes` field:

- `serializeGraph(graph, collapsedNodes?)` includes `collapsedNodes: TaskId[]` only when non-empty
- `deserializeGraph(urlString)` returns `{ graph, collapsedNodes }` instead of just `MikadoGraph`
- `isValidGraph` accepts optional `collapsedNodes` (array of strings)

Old URLs without `collapsedNodes` deserialize with an empty set. Backward compatible.

### Store: collapse state (`src/store/graph-store.ts`)

Add to the store (outside undo/redo history):

- `collapsedNodes: Set<TaskId>` (initial: empty set)
- `toggleCollapse(taskId)` — toggle membership, no-op on leaf nodes
- `collapseNode(taskId)` — add to set, no-op on leaf nodes
- `expandNode(taskId)` — remove from set
- `expandAll()` — clear the set

These actions do NOT call `pushHistory`. The `snapshot()` function stays unchanged.

**Cleanup on mutations:**

- `removeTask`: also remove deleted taskId and its descendants from `collapsedNodes`
- `undo`/`redo`: prune `collapsedNodes` IDs that no longer exist in `tasks`

### ReactFlow bridge (`src/store/reactflow-bridge.ts`)

- `toReactFlowNodes(graph, nodeSizes, collapsedNodes)` — filter out hidden tasks before dagre layout
- `toReactFlowEdges(graph, collapsedNodes)` — filter out edges where source or target is hidden
- Extend `TaskNodeData` with: `hasChildren: boolean`, `isCollapsed: boolean`, `childCount: number`

### TaskNode UI (`src/components/nodes/TaskNode.tsx`)

Add a collapse button on the **right side** of the node, inside the existing flex row (after the label). Only rendered when `data.hasChildren` is true and the node is not being edited.

- Expanded: `▾` (down-pointing triangle)
- Collapsed: `▸ h · {childCount}` (right-pointing triangle, shortcut hint, separator, direct child count)

The button uses `className="nodrag"` and `tabIndex={-1}`. Clicking calls `toggleCollapse(data.taskId)`.

### Keyboard shortcuts (`src/App.tsx`)

| Key | Action                                  |
| --- | --------------------------------------- |
| h   | Toggle collapse/expand on selected node |
| [   | Collapse selected node                  |
| ]   | Expand selected node                    |

Modify existing arrow key behavior:

- **ArrowLeft** on an expanded node with children: collapse it
- **ArrowLeft** on a collapsed node or leaf: navigate to parent (existing)
- **ArrowRight** on a collapsed node: expand it
- **ArrowRight** on an expanded node: navigate to first child (existing)

### URL sync (`src/hooks/use-url-sync.ts`)

- On load: `deserializeGraph` returns `{ graph, collapsedNodes }`, set both in store
- On serialize: pass `state.collapsedNodes` to `serializeGraph`

### Export image (`src/components/export-image.ts`)

Before capture:

1. Save current `collapsedNodes` from store
2. Call `expandAll()`
3. Let React re-render (existing `fitView` wait handles this)

In `finally`: restore saved `collapsedNodes` via `setState`.

### Help menu (`src/components/HelpMenu.tsx`)

Add shortcuts to the table:

| Key   | Action                 |
| ----- | ---------------------- |
| h     | Toggle collapse/expand |
| [ / ] | Collapse / Expand      |

Update ArrowLeft/ArrowRight descriptions to mention collapse/expand behavior.

## Testing

### Unit tests (`src/model/graph.test.ts`)

- `isNodeHidden` returns false when no ancestors are collapsed
- `isNodeHidden` returns true when immediate parent is collapsed
- `isNodeHidden` returns true when any ancestor is collapsed
- `isNodeHidden` returns false for the collapsed node itself

### Unit tests (`src/model/url.test.ts`)

- Round-trip with collapsed nodes
- Empty collapsedNodes omitted from serialized output
- Old URLs without collapsedNodes default to empty set

### Integration tests (`src/App.test.tsx`)

- `h` key toggles collapse on selected node with children
- `[` collapses, `]` expands
- ArrowRight expands a collapsed node instead of navigating
- ArrowLeft collapses an expanded node with children
- Collapsed descendants are not rendered
- Collapsed state round-trips through the URL
- Collapse button appears only on nodes with children
- Collapse button shows child count when collapsed

## Acceptance Criteria

- Collapse button appears on right side of nodes with children
- Button shows shortcut hint and child count when collapsed
- `h`, `[`, `]` shortcuts work on selected node
- ArrowLeft/ArrowRight integrate collapse/expand with navigation
- Collapsed descendants are hidden from the graph (nodes and edges)
- Layout recomputes without hidden nodes
- Collapsed state persists in the URL
- Old URLs without collapse state still load correctly
- All nodes expand during image export, restore after capture
- Collapse is NOT undoable (not in undo/redo stack)
- Integration tests pass

## Notes

- Collapsed state is a view concern, not a domain mutation. It lives in the store alongside `editingNodeId` and `selectedNodeId`, not inside `MikadoGraph`.
- When a collapsed node is deleted, clean up its entry from `collapsedNodes`.
- When undo/redo changes graph structure, prune orphaned IDs from `collapsedNodes`.
- If the selected node becomes hidden after a collapse (edge case: programmatic collapse), select the nearest visible ancestor.
