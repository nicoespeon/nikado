# Feature 14: Mobile Action Bar

## Goal

Users can add sub-tasks, rename tasks, delete tasks, and fully manage their graph from their phone. A fixed bottom bar appears when a task is selected, providing touch-friendly alternatives to keyboard shortcuts.

## Dependencies

Feature 13 (mobile outline view, `OutlineRow` exists)

## What to Build

### `src/components/MobileActionBar.tsx`

A fixed bottom bar. Only rendered when `selectedNodeId !== null` and `editingNodeId === null`.

Position: `fixed bottom-0 left-0 right-0` with `pb-[env(safe-area-inset-bottom)]` for iPhone home indicator.

**Buttons** (44px min touch targets, icon + small label):

| Button       | Action                                                  | Visible when              |
| ------------ | ------------------------------------------------------- | ------------------------- |
| Add sub-task | `addSubTask(selectedId, "")` then `startEditing(newId)` | Always                    |
| Add sibling  | `addSibling(selectedId, "")` then `startEditing(newId)` | Selected task is not goal |
| Edit         | `editTask(selectedId)`                                  | Always                    |
| Delete       | `removeTask(selectedId)` with inline confirmation       | Always                    |

No icon library. Use inline SVGs or Unicode characters (consistent with existing buttons).

**Delete confirmation for non-leaf tasks:**

First tap changes button to "Confirm?" with red styling. If tapped again within 3 seconds, deletes. After 3 seconds, reverts to normal. No native `confirm()` dialog.

For leaf tasks (no children), delete immediately on first tap.

**After add sub-task / add sibling:** the new task enters editing mode automatically. The outline view should scroll the new row into view.

**Active states:** use `active:` Tailwind variant for tap feedback on all buttons.

### Update `src/components/OutlineRow.tsx`

Add inline editing support (not present in Feature 13).

When `editingNodeId === task.id`:

- Replace label text with a `<textarea>` (same pattern as `TaskNode.tsx`)
- Auto-focus the textarea
- Enter confirms (`setTaskLabel` + `stopEditing`)
- Escape cancels (`stopEditing`)
- Blur confirms
- Show character counter: `{draft.length}/{MAX_LABEL_LENGTH}`
- Reuse `MAX_LABEL_LENGTH` and `createTaskLabel` from model

Scroll the editing row into view using `scrollIntoView({ block: "center" })`.

### Update `src/MobileView.tsx`

Add `MobileActionBar` to the composition (renders below `OutlineView`). Account for the action bar height in the outline view's bottom padding so content isn't hidden behind it.

### `src/components/MobileActionBar.test.tsx`

Integration tests:

- Renders nothing when no task selected
- Shows action buttons when task selected
- Hidden while editing
- Add sub-task creates a new task and enters editing mode
- Add sibling creates a sibling (button hidden for goal)
- Edit enters editing mode on selected row
- Delete removes leaf task immediately
- Delete shows confirmation for non-leaf, requires second tap
- Delete confirmation resets after timeout

### `src/components/OutlineView.test.tsx`

Add editing tests:

- When editing, row shows textarea with current label
- Enter confirms the edit
- Escape cancels the edit
- Character counter shows current/max length

## Acceptance Criteria

- Bottom action bar appears when a task is selected on mobile.
- Action bar disappears when editing (virtual keyboard takes the space).
- "Add sub-task" creates a child task and enters editing mode.
- "Add sibling" creates a sibling task and enters editing mode. Hidden when goal is selected.
- "Edit" enters inline editing on the selected row's label.
- "Delete" removes leaf tasks immediately. Non-leaf tasks require inline confirmation.
- Inline editing works: Enter confirms, Escape cancels, blur confirms.
- New tasks scroll into view.
- All buttons have minimum 44px touch targets.
- All tests pass, build passes, lint passes.

## Notes

- The action bar must not capture keyboard events. Only responds to touch/click.
- When the virtual keyboard is open (editing mode), the action bar is hidden to avoid overlap. The textarea handles Enter/Escape directly.
- Store actions (`addSubTask`, `addSibling`, `editTask`, `removeTask`, `startEditing`, `stopEditing`, `setTaskLabel`) already exist. No store changes needed.
- The `scrollIntoView` call should be in a `useEffect` watching `editingNodeId` changes, not inline in the click handler (DOM may not have updated yet).
