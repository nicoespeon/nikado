# Architecture

## Data Model

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };

type TaskId = Brand<string, "TaskId">;

type TaskStatus = "pending" | "current" | "done" | "parked";

type Task = {
	id: TaskId;
	label: string;
	status: TaskStatus;
};

type Dependency = {
	from: TaskId;
	to: TaskId;
};

type MikadoGraph = {
	goalId: TaskId | null;
	tasks: Task[];
	dependencies: Dependency[];
};
```

Maps directly to ReactFlow:

- `Task` > ReactFlow `Node` (with custom `data` containing label and status)
- `Dependency` > ReactFlow `Edge` (from parent to child)

The graph is a **DAG** (directed acyclic graph). A task cannot transitively depend on itself.

## Module Boundaries

### `src/model/` (Pure Domain Logic)

No React imports, no side effects. Every function takes data in and returns data out.

- `graph.ts`: core operations (`createTask`, `addDependency`, `removeTask`, `setTaskStatus`, `findLeafTasks`, `canMarkDone`)
- `url.ts`: serialize/deserialize `MikadoGraph` to/from URL-safe string

Unit tests live alongside: `graph.test.ts`, `url.test.ts`.

### `src/store/` (State Management)

- `graph-store.ts`: Zustand store wrapping model functions as actions

The store is a thin adapter. It holds the `MikadoGraph` state and exposes actions that delegate to pure model functions.

### `src/components/` (React + ReactFlow)

- `nodes/TaskNode.tsx`: custom ReactFlow node component for rendering a task (memoized)
- Other UI components as needed (share button, toolbar, etc.)

Components consume the Zustand store via hooks. They contain rendering logic only. Business rules live in `src/model/`.

### `src/App.tsx` (Composition Root)

Wires everything together: ReactFlow provider, store hydration, top-level layout.

## Data Flow

```
User interaction
  > React component event handler
    > Zustand store action
      > Pure model function
        > New MikadoGraph state
          > Zustand notifies subscribers
            > ReactFlow re-renders affected nodes
```

URL sync is a side-channel:

- **On change**: store subscribes to state changes and updates the URL hash
- **On load**: App reads the URL hash and hydrates the store

## URL State Strategy

The full `MikadoGraph` is serialized into the URL hash fragment (`#`):

- No server needed. The URL contains the entire graph.
- Shareable. Copy the URL and anyone sees the same graph.
- Bookmarkable. Browser history works naturally.

Implementation notes:

- Encode as JSON, then compress (e.g., `lz-string` base64) to keep URLs short
- Most browsers support ~2000 characters in URLs. Plan for this limit.
- Malformed URL data should show an empty canvas without crashing.

## Performance

ReactFlow re-renders can be expensive:

- **Memoize custom node components** with `React.memo`
- **Memoize `nodeTypes` object.** Pass a stable reference, not an inline object.
- Use Zustand **selectors** to subscribe only to the slice of state each component needs
- Don't pass the entire graph as a prop. Let components pull what they need from the store.

## Future Considerations

Not in MVP, but the architecture anticipates these.

**Undo/redo**: the pure model layer makes this straightforward. Snapshot `MikadoGraph` before each action, push to a history stack. The store exposes `undo`/`redo` actions.

**Timebox timer**: a separate concern from the graph. Model it in its own store (`src/store/timer-store.ts`). The timer tracks which task is `current` and logs time spent. Keep timer state out of the URL (ephemeral).

**Local storage**: Zustand has a `persist` middleware. Add it to the graph store to save/load from `localStorage`. Complements URL state (URL for sharing, localStorage for persistence).

**Export**: serialize the graph to different formats (image, JSON, markdown). The pure model layer makes this easy since `MikadoGraph` is plain data.

**Real-time collaboration**: anticipated from the start.

- The pure model layer (`src/model/`) can be shared between local and synced modes.
- Zustand store can be replaced or wrapped with a CRDT-backed store (y.js + WebRTC).
- Pure model functions work regardless of where the state comes from.
- The sync layer sits between the store and the model. Components don't change.
