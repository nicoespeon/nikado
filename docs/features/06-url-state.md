# Feature 06: URL State

## Goal

Graph state is persisted in the URL so users can share their Mikado graph via link.

## Dependencies

Features 01-05 (serializes the full model)

## What to Build

### `src/model/url.ts`

Pure functions for URL serialization:

- `serializeGraph(graph: MikadoGraph)` returns a URL-safe string
- `deserializeGraph(urlString: string)` returns `MikadoGraph | null` (null for invalid data)

Strategy: JSON > compress (e.g., `lz-string` base64) > URL hash fragment.

### URL sync

- **On state change**: Zustand middleware or subscription updates `window.location.hash`
- **On app load**: read `window.location.hash`, deserialize, hydrate the store
- **Debounce** URL updates to avoid thrashing browser history during rapid edits

### Share button

- UI button (toolbar or floating) that copies the current URL to clipboard
- Brief confirmation feedback (e.g., "Link copied!" toast or tooltip)

### Error handling

- Malformed URL data: show empty canvas, no crash
- Empty URL: show empty canvas (normal fresh start)
- URL exceeding browser limits: handle gracefully (~2000 chars max)

## Acceptance Criteria

- Graph state is reflected in the URL hash after every change
- Refreshing the page restores the exact graph (tasks, edges, statuses, positions)
- Sharing the URL shows the same graph to anyone
- Share button copies URL and shows confirmation
- Empty URL shows empty canvas
- Malformed URL data shows empty canvas without crashing
- Node positions are preserved in serialization
- Unit tests: `serializeGraph` > `deserializeGraph` round-trip produces identical graph
- Unit tests: `deserializeGraph` returns null for invalid input
- Integration test: create graph, read URL, reload page, verify graph restored

## Notes

- If adding Zod for runtime validation of URL data, replace the local `Brand` utility type with Zod's `.brand()` API
- Install `lz-string` (or similar) with `--save-exact`
- A graph with ~20 tasks should fit comfortably in the URL length budget
- Debounce interval: 300-500ms is a good starting point
- Node positions (x, y) need to be in the serialized data. They're part of the user's layout.
- The `MikadoGraph` type may need position data, or positions can be serialized separately.
