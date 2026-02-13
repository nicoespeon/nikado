# Feature 10: Export to Image

## Goal

Users can export the current graph as a PNG image.

## Dependencies

Feature 08 (export button lives in the control menu)

## What to Build

### New dependency: `html-to-image`

Install with `--save-exact`. Lightweight library (~4KB gzipped) for capturing DOM elements as images. This is the approach ReactFlow's docs recommend.

### `src/components/export-image.ts`

A utility function:

```typescript
export function exportGraphAsImage(filename?: string): Promise<void>;
```

Steps:

1. Select the `.react-flow__viewport` DOM element
2. Compute full graph bounds with `getNodesBounds` from `@xyflow/react` (captures all nodes, not just the visible viewport)
3. Call `toPng` from `html-to-image` with appropriate dimensions and background color
4. Create a temporary `<a download>` element and click it to trigger the download
5. Clean up

### Filename

Default to the goal label (sanitized for filenames) or `nikado-graph.png` if no goal label exists.

### Modify `src/components/ControlMenu.tsx`

Enable the Export button. Wire it to `exportGraphAsImage()`. Disable when the graph is empty (no goal).

This is a pure UI action. No store involvement.

### Testing

Testing actual image export in jsdom is impractical (`html-to-image` relies on real DOM rendering). Strategy:

1. Unit test the filename derivation logic (if extracted)
2. Integration test: mock `html-to-image`'s `toPng`, verify it gets called when the Export button is clicked
3. Export button is disabled when graph is empty, enabled when graph has a goal

### `src/components/ControlMenu.test.tsx` (additions)

- Export button disabled when graph is empty
- Export button enabled when graph has a goal
- Clicking export triggers the download flow (mocked `toPng`)

## Acceptance Criteria

- Clicking the Export button downloads a PNG of the current graph
- Downloaded file has a meaningful filename (goal label or default)
- Export captures the full graph, not just the visible viewport
- Export includes the background grid
- Export button is disabled when the canvas is empty
- Integration test verifies the export wiring

## Notes

- `html-to-image` has known issues with certain CSS features (e.g., `backdrop-filter`). The current Nikado styling is simple enough to avoid these.
- Consider showing a brief "Exporting..." state on the button while the image generates.
- SVG export (`toSvg` from the same library) could be offered later as a toggle. PNG is the pragmatic default.
- Specify a white background color in export options so the image isn't transparent.
