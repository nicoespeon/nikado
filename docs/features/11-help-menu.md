# Feature 11: Help Menu

## Goal

Users can open a help overlay that shows keyboard shortcuts and basic Mikado method guidance.

## Dependencies

Feature 08 (help button lives in the control menu)

## What to Build

### `src/components/HelpMenu.tsx`

A modal overlay triggered by the Help (?) button in the control menu. Two sections:

**Keyboard shortcuts**

| Key                | Action                    |
| ------------------ | ------------------------- |
| Space              | Create goal / focus goal  |
| Tab                | Create sub-task           |
| Enter              | Create sibling            |
| e / F2             | Edit label                |
| Escape             | Cancel editing            |
| d                  | Toggle done               |
| Delete / Backspace | Delete task               |
| Arrow Left         | Navigate to parent        |
| Arrow Right        | Navigate to first child   |
| Arrow Up/Down      | Navigate between siblings |
| Ctrl/⌘+Z           | Undo                      |
| Ctrl/⌘+Shift+Z     | Redo                      |
| + / -              | Zoom in / out             |
| 0                  | Fit view                  |
| t                  | Cycle theme               |
| r                  | Reset                     |
| s                  | Share (copy URL)          |
| c                  | Copy as text              |
| x                  | Export as image           |
| ?                  | Toggle help               |

**Getting started**

Brief guidance (4 bullets + links). Bold the key action in each bullet. Light emoji per bullet.

- 🎯 **Set your goal.** The big change you want to make.
- 🧩 **Break it down.** Press Tab to add sub-tasks. Keep splitting until each piece is small enough to do.
- 🍃 **Work from the leaves.** Start with tasks that have no children. Mark them done, then move up.
- ⏱️ **Timebox your work.** Give yourself ~15 min per task. If you can't finish: pause, break it into smaller tasks, revert your changes, and pick a new leaf.
- 🔗 **Share your progress.** Click Share to copy a URL with your full graph.
- Links: [Read this intro](https://understandlegacycode.com/blog/a-process-to-do-safe-changes-in-a-complex-codebase) or check out the [book](https://mikadomethod.info/).

### Use `<dialog>` element

The HTML `<dialog>` element provides built-in focus trapping and Escape handling. Good for accessibility without extra dependencies.

### Keyboard shortcut: `?`

Pressing `?` (with no input/textarea focused) opens or closes the help menu. Add to the existing `handleKeyDown` in `App.tsx`.

### State management

Help menu open/close is local UI state. Use `useState` in the owning component. No store needed.

### Modify `src/components/ControlMenu.tsx`

Enable the Help (?) button. Wire it to toggle the help menu visibility.

### `src/components/HelpMenu.test.tsx`

Integration tests:

- Help menu opens when Help button is clicked
- Help menu shows keyboard shortcuts table
- Help menu shows getting started section
- Help menu closes on Escape or clicking close button
- `?` key toggles the help menu

## Acceptance Criteria

- Help button in toolbar opens the help overlay
- `?` key opens/closes the help overlay
- Overlay shows all keyboard shortcuts in a readable format
- Overlay shows brief Mikado method guidance with external link
- Overlay closes on Escape, clicking close, or clicking outside
- Integration tests pass

## Notes

- Keep content static. No dynamic shortcut registry needed at this scale.
- Style the overlay to match the app's minimal aesthetic: semi-transparent backdrop, centered card, close button.
- The `?` shortcut must be ignored when an input/textarea is focused (same guard as other shortcuts in `handleKeyDown`).
- The shortcuts table should reflect the actual state of implemented shortcuts at the time this feature is built. Update it if earlier features add or change shortcuts.
