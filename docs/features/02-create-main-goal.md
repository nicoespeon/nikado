# Feature 02: Create Main Goal

## Goal

User can create a main goal (the root task of the Mikado graph) on the canvas.

## Dependencies

Feature 01 (task model & store)

## What to Build

### Custom `TaskNode` component

- `src/components/nodes/TaskNode.tsx`: custom ReactFlow node for rendering tasks
- Memoized with `React.memo` for performance
- Shows the task label, editable inline on creation
- Visual emphasis for the goal node (e.g., larger, distinct border/color)

### Refactor `App.tsx`

- Replace local `useState` / `useNodesState` with the Zustand store from Feature 01
- Wire the double-click handler to create a goal task through the store
- Register `TaskNode` as a custom node type (memoize the `nodeTypes` object)
- Enforce single goal: if a goal already exists, double-clicking the canvas does nothing

### Bridge: Store to ReactFlow

- Derive ReactFlow `Node[]` and `Edge[]` from the Zustand store's `MikadoGraph`
- This mapping can live in a utility or as store selectors

## Acceptance Criteria

- Double-clicking an empty canvas creates a goal node with an editable label
- The goal node is visually distinct from regular task nodes
- Only one goal can exist. Double-clicking when a goal exists does not create another.
- The goal node's label can be edited (click to edit, Enter to confirm, Escape to cancel)
- Integration test: double-click canvas, goal node appears with editable label
- Integration test: double-click again, no second goal created

## Notes

- `App.tsx` already uses a named export. No change needed there.
- ReactFlow's `nodeTypes` must be a stable reference (declared outside the component or memoized), otherwise every render recreates all nodes.
- When the user double-clicks after a goal exists: do nothing. Sub-task creation is Feature 03.
