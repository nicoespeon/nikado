# Feature 13: Mobile Outline View

## Goal

On narrow screens (< 768px), replace the ReactFlow graph with a touch-friendly indented tree list. Users can open Nikado on their phone, see their graph as a readable list, create a goal, toggle tasks done, and collapse/expand subtrees.

## Dependencies

Features 01-12

## What to Build

### `src/hooks/use-is-mobile.ts`

A hook that returns `true` when the viewport is narrow (< 768px). Uses `window.matchMedia("(max-width: 767px)")`. Listens to the `change` event to update on resize. Cleans up on unmount. No new dependencies.

### New model functions in `src/model/graph.ts`

**`walkTree(graph, goalId, collapsedNodes)`** — returns a flat, depth-first ordered list of visible `TaskId`s. Skips children of collapsed nodes. Used by the outline view to determine render order.

**`taskDepth(graph, taskId)`** — walks up the parent chain, returns depth count. Goal = 0, direct children = 1, etc.

Both pure, tested in `graph.test.ts`.

### Refactor `src/App.tsx`

Extract the current desktop code into `src/DesktopView.tsx`:

- `ReactFlow` component and all its props/handlers
- `AutoFitView` component
- `nodeTypes` constant
- `onNodeClick`, `onPaneClick`, `onNodesChange` handlers
- `reactFlowRef`, `nodeSizes` state
- Desktop keyboard handlers
- `Panel` components (toolbar buttons, zoom controls, help button)
- Desktop empty state overlay

`App.tsx` becomes a thin shell:

```typescript
function App() {
	useDocumentTitle();
	useUrlSync();
	const isMobile = useIsMobile();
	return isMobile ? <MobileView /> : <DesktopView />;
}
```

This is a pure extraction. Zero logic changes. All existing desktop tests must pass.

### Modify `index.html`

Add `viewport-fit=cover` to the viewport meta tag:

```html
<meta
	name="viewport"
	content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

This enables `env(safe-area-inset-*)` CSS values for future toolbar/action bar padding.

### `src/MobileView.tsx`

Composes the mobile experience. For this feature, it contains:

- `OutlineView` (when a goal exists)
- Mobile empty state (when no goal exists)

The mobile empty state shows:

- Centered content with app branding
- Text: "Tap to create your goal"
- A prominent button (min 44px height) that creates the goal and enters inline editing

### `src/components/OutlineView.tsx`

The core mobile component. Renders `MikadoGraph` as an indented tree.

```
<div role="tree" aria-label="Mikado graph">
  {orderedTasks.map(taskId => (
    <OutlineRow key={taskId} ... />
  ))}
</div>
```

Uses `walkTree` to get visible tasks in order. Uses `taskDepth` for indentation depth.

### `src/components/OutlineRow.tsx`

Memoized. Each row contains (left to right):

1. **Indentation spacer** — `padding-left: depth * 1.5rem` (or similar)
2. **Collapse/expand chevron** — only if `hasChildren`. Tapping calls `toggleCollapse(taskId)`
3. **Checkbox** — tapping calls `toggleDone(taskId)`. Same visual as TaskNode checkbox
4. **Label text** — tapping selects the task (`selectNode(taskId)`)

Each row is `role="treeitem"` with `aria-level={depth + 1}`.

**Styling per status** (matches graph view):

- Goal: larger text, bold, no indentation
- Leaf (pending, no undone children): amber left accent or background tint
- Done: green checkbox, strikethrough text, muted opacity
- Parked: gray, muted
- Selected: blue left border or background highlight

**Not included in this feature:** inline editing (textarea). Comes in Feature 14.

### `src/hooks/use-is-mobile.test.ts`

Unit test with `renderHook`:

- Returns `false` when viewport is wide (default)
- Returns `true` when viewport is narrow
- Updates when `change` event fires
- Cleans up listener on unmount

### `src/model/graph.test.ts`

Add tests for the new model functions:

- `walkTree` returns tasks in depth-first order
- `walkTree` skips children of collapsed nodes
- `walkTree` handles empty graph
- `taskDepth` returns 0 for goal, 1 for children, etc.

### `src/components/OutlineView.test.tsx`

Integration tests (render component, set store state programmatically):

- Renders goal as prominent row
- Renders sub-tasks indented under parent
- Highlights leaf tasks with amber styling
- Shows done tasks with strikethrough
- Tapping a row selects it
- Tapping checkbox toggles done
- Collapse chevron hides children

### `src/App.test.tsx`

- All existing tests keep passing (desktop is the default, `matchMedia` mock returns `false`)
- Add mobile describe block: on mobile, renders outline view instead of graph

## Acceptance Criteria

- On desktop (>= 768px): ReactFlow graph renders exactly as before. Zero visual or behavioral changes.
- On narrow screens (< 768px): outline view renders instead of the graph.
- Outline view shows all visible tasks as indented rows with correct depth.
- Goal row is visually prominent (bold, larger text).
- Leaf tasks have amber accent.
- Done tasks show strikethrough and muted opacity.
- Tapping a row selects it.
- Tapping the checkbox toggles done status.
- Tapping the collapse chevron hides/shows children.
- Mobile empty state shows a "Create goal" button that works.
- URL created on desktop loads correctly in the outline view and vice versa.
- All tests pass (`pnpm test --run`), build passes (`pnpm build`), lint passes (`pnpm lint`).

## Notes

- `OutlineView` must NOT import anything from `@xyflow/react` or `reactflow-bridge.ts`. It depends only on the store and model.
- The `matchMedia` mock in `test-setup.ts` may need upgrading to support test-controlled `matches` values.
- Keep `DesktopView.tsx` as a pure extraction. Resist the urge to refactor while extracting.
- The existing `useDocumentTitle` and `useUrlSync` hooks stay in `App.tsx` since they apply to both views.
