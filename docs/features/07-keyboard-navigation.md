# Feature 07: Keyboard Navigation

## Goal

Power users can navigate and manipulate the graph entirely via keyboard. The app is accessible to screen reader users.

## Dependencies

Features 01-06

## What to Build

### Focus management

- Selected node has a visible focus indicator (blue ring)
- Edges are not focusable (skipped by Tab)
- `Space` with no goal creates the goal and enters edit mode
- `Space` with existing goal selects and enters edit mode on the goal

### Graph navigation

- Arrow keys move selection along edges: `ArrowDown` to first child, `ArrowUp` to parent, `ArrowLeft`/`ArrowRight` between siblings
- Sibling navigation wraps around

### Task actions via keyboard

| Key                    | Action                                        |
| ---------------------- | --------------------------------------------- |
| `Space`                | Create goal (if empty) or focus goal + edit   |
| `Tab`                  | Create a sub-task of the selected node        |
| `Enter`                | Create a sibling of the selected node         |
| `e` / `F2`             | Edit the selected node's label                |
| `Escape`               | Cancel label editing                          |
| `ArrowUp`              | Navigate to parent                            |
| `ArrowDown`            | Navigate to first child                       |
| `ArrowLeft/Right`      | Navigate between siblings                     |
| `Delete` / `Backspace` | Delete the focused task (not yet implemented) |

### Accessibility (ARIA)

- Task nodes have `role="treeitem"` (or appropriate role for a DAG)
- Graph container has `role="tree"` (or `role="application"` if tree doesn't fit)
- Each node announces: label, status, and sub-task count
- Status changes announced via `aria-live` region
- Focus changes communicated to screen readers

### Skip navigation

- Skip link or landmark to jump to the graph

## Acceptance Criteria

- All task operations accessible via keyboard (create, edit, navigate)
- Focus is always visible on the current node
- Arrow keys navigate the graph structure
- Screen reader announces task label, status, and sub-task count
- No mouse required for a complete workflow (create goal > add sub-tasks > mark done > share)
- Integration tests: keyboard-driven workflow covering create, navigate, edit
- Screen reader testing: verify announcements with axe-core or similar

## Notes

- Keybindings inspired by Mindmup.com.
- Start with basics (implemented): Space/Tab/Enter/e/F2/arrows. Delete shortcut deferred to Feature 05.
- Status cycling shortcut deferred to Feature 04.
- Test with VoiceOver (macOS) for real-world screen reader behavior.
- `aria-keyshortcuts` can document shortcuts for assistive tech.
- This feature benefits from being last. It polishes the UX of all previous features.
