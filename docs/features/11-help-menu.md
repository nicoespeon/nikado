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
| Arrow Up           | Navigate to parent        |
| Arrow Down         | Navigate to first child   |
| Arrow Left/Right   | Navigate between siblings |
| Delete / Backspace | Delete task               |
| Ctrl+Z             | Undo                      |
| Ctrl+Shift+Z       | Redo                      |
| ?                  | Toggle help               |

**Getting started**

Brief guidance (3-5 bullets):

- Create a goal: the main change you want to achieve
- Break it into sub-tasks: press Tab on any task
- Work from the leaves up: start with tasks that have no sub-tasks
- Share your graph: click Share to copy the URL
- Learn more about the [Mikado Method](https://mikadomethod.info/)

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
