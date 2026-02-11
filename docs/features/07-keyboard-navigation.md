# Feature 07: Keyboard Navigation

## Goal

Power users can navigate and manipulate the graph entirely via keyboard. The app is accessible to screen reader users.

## Dependencies

Features 01-06

## What to Build

### Focus management

- `Tab` moves focus between task nodes (logical order: top-to-bottom, left-to-right)
- Focused node has a visible focus indicator (outline or highlight)
- Focus wraps around (last node > first node)

### Graph navigation

- Arrow keys move focus along edges: `↓` to child, `↑` to parent, `←`/`→` between siblings
- Multiple children/parents: arrow keys cycle through them

### Task actions via keyboard

| Key                     | Action                                       |
| ----------------------- | -------------------------------------------- |
| `Enter`                 | Edit the focused task's label                |
| `Escape`                | Cancel label editing / deselect              |
| `Space`                 | Cycle task status (pending > current > done) |
| `Tab` (on focused node) | Create a sub-task for the focused node       |
| `Delete` / `Backspace`  | Delete the focused task                      |
| `Ctrl+C` / `Cmd+C`      | Copy share URL to clipboard                  |

### Accessibility (ARIA)

- Task nodes have `role="treeitem"` (or appropriate role for a DAG)
- Graph container has `role="tree"` (or `role="application"` if tree doesn't fit)
- Each node announces: label, status, and sub-task count
- Status changes announced via `aria-live` region
- Focus changes communicated to screen readers

### Skip navigation

- Skip link or landmark to jump to the graph

## Acceptance Criteria

- All task operations accessible via keyboard (create, edit, status change, delete)
- Focus is always visible on the current node
- Arrow keys navigate the graph structure
- Screen reader announces task label, status, and sub-task count
- No mouse required for a complete workflow (create goal > add sub-tasks > mark done > share)
- Integration tests: keyboard-driven workflow covering create, navigate, status change, delete
- Screen reader testing: verify announcements with axe-core or similar

## Notes

- ReactFlow has built-in keyboard support. Extend it, don't replace it.
- Start with basics: Tab navigation + shortcuts. Arrow navigation along edges can be a stretch goal.
- Test with VoiceOver (macOS) for real-world screen reader behavior.
- `aria-keyshortcuts` can document shortcuts for assistive tech.
- This feature benefits from being last. It polishes the UX of all previous features.
