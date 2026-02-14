# Nikado

A visual tool for the [Mikado method](docs/domain.md).

Users create a single goal, decompose it into sub-tasks, and work from leaf nodes up.

No backend: all state lives in the URL.

## Commands

```sh
pnpm dev             # Start Vite dev server
pnpm test            # Vitest in watch mode
pnpm test --run      # Single run (use before committing)
pnpm build           # TypeScript check + Vite production build
pnpm lint            # ESLint, zero warnings allowed
pnpm format --write  # Prettier
```

**Gotchas:**

- `console-fail-test` is active. Any `console.log/warn/error` in tests will fail them.
- Pre-commit hook runs lint-staged (Prettier on staged files).

## Architecture

Three layers, strictly separated. See [docs/architecture.md](docs/architecture.md) for details.

```
src/model/       Pure functions & types. No React, no side effects. Fully testable.
src/store/       Zustand store. Thin adapter over model functions. Exposes actions.
src/components/  React + ReactFlow rendering. Minimal logic.
src/App.tsx      Top-level composition.
```

**Data flow:** User interaction > Component > Store action > Model function (pure) > New state > ReactFlow re-renders

**Key constraints:**

- One goal (root task) per graph
- Deleting a task cascade-deletes its entire sub-tree
- The graph is a DAG, no cycles

## Coding Conventions

- Named exports only, no `export default`
- `type` over `interface`; discriminated unions for state
- Immutability: `const`, no mutations, `.map/.filter/.reduce` over loops
- No `any`. Use `unknown` + narrowing
- Let TypeScript infer types and return types
- Exported functions first, private helpers below
- Extract logic into well-named functions instead of comments; comments only for "why"
- Install dependencies with exact versions (`--save-exact`)
- Tabs for indentation (Prettier config)

## Testing Strategy

- **Integration tests** are the default: render components, interact via Testing Library, assert visible outcomes
- **Unit tests** for pure model functions in `src/model/`, with structural assertions (`toEqual`, `toMatchObject`)
- Query by **role, text, or label**. Avoid querying by CSS class names.
- Assert whole results, not individual properties
- Test files colocated: `Foo.tsx` / `Foo.test.tsx`, `graph.ts` / `graph.test.ts`

## ReactFlow

- Version 12. Import from `"@xyflow/react"` (named exports, no default import)
- Custom node types go in `src/components/nodes/`
- **Memoize** custom node components to prevent full-graph re-renders
- `panOnDrag={false}` is required for Testing Library compatibility (see App.tsx comment)
- `ResizeObserver` mock is in `src/test-setup.ts` (required for jsdom)

## Feature Specs

Detailed specs live in [docs/features/](docs/features/). They are numbered by dependency order. Implement them in sequence. Update the number below after completing each feature.

**Last completed feature: 07**

### MVP

1. Task model & store (pure data layer)
2. Create main goal
3. Create sub-tasks
4. Task status (done/undone/current/parked)
5. Delete task (cascade)
6. URL state persistence + share button
7. Keyboard navigation + a11y

### Post-MVP

Features planned but not yet specced. Rough priority order:

8. Control menu (custom toolbar replacing ReactFlow's default Controls)
9. Undo/redo
10. Export to image
11. Help menu (keyboard shortcuts, Mikado method basics)
12. Parking slot (park tasks blocked by external factors)
13. Timebox timer (set/start/stop, default 15 min, time tracking per task/day)
14. Local storage persistence
15. Real-time collaboration (y.js + WebRTC, no server)
16. User-facing docs (detailed guides beyond the help menu)

## Writing Style

For all docs, specs, and comments in this project:

- Short sentences. Get to the point.
- No em-dashes. Use periods, colons, or parentheses instead.
- Don't repeat yourself. Say it once clearly.
- Use active voice. "The store updates state" not "State is updated by the store."
- Bullet points over paragraphs when listing facts or rules.
- No filler ("In other words", "It's worth noting", "Essentially").

## PR Conventions

- Titles follow conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Keep PRs single-purpose
- CI runs: build, lint, test, type-check. All must pass.
