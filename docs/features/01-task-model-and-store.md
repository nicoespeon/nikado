# Feature 01: Task Model & Store

## Goal

Create the pure data model and Zustand store that all other features build on.

## Dependencies

None. This is the foundation.

## What to Build

### `src/model/graph.ts`

Types and pure functions for the Mikado graph:

- **Types**: `Brand`, `TaskId`, `TaskStatus`, `Task`, `Dependency`, `MikadoGraph` (see [architecture.md](../architecture.md))
- `createTask(label: string)` returns a new `Task` with a branded `TaskId` and `"pending"` status
- `addDependency(graph, fromId, toId)` returns a graph with the new dependency edge
- `removeTask(graph, taskId)` returns a graph with the task, its sub-tree, and all affected edges removed
- `setTaskStatus(graph, taskId, status)` returns a graph with updated task status
- `canMarkDone(graph, taskId)` returns true only if all dependencies are `"done"`
- `findLeafTasks(graph)` returns tasks with no outgoing dependencies

### `src/store/graph-store.ts`

Zustand store exposing:

- `graph` state (the `MikadoGraph`)
- Actions wrapping each model function: `createTask`, `addDependency`, `removeTask`, `setTaskStatus`

The store is a thin adapter. It calls model functions and updates state.

### `src/model/graph.test.ts`

Unit tests for every pure function. Test the model directly, no React rendering needed.

## Acceptance Criteria

- `createTask("Do the thing")` returns a task with a unique ID, the given label, and `"pending"` status
- `addDependency` adds a dependency edge that appears in `graph.dependencies`
- `removeTask` removes the task, all its descendants, and all related edges
- `setTaskStatus` updates the status of the specified task
- `canMarkDone` returns `false` when any dependency is not `"done"`, `true` otherwise
- `findLeafTasks` returns only tasks with no outgoing dependencies
- All functions are pure: they return new objects, never mutate input
- Zustand store wraps these functions and holds the graph state

## Notes

- ID generation: `crypto.randomUUID()` cast to `TaskId`
- The graph is a DAG. `addDependency` should prevent cycles (or at minimum, document that cycle prevention is a future concern).
- Cascade delete: removing task X also removes every task only reachable through X, plus all edges involving removed tasks.
- Install `zustand` with `--save-exact`.
