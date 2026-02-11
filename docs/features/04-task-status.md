# Feature 04: Task Status

## Goal

User can mark tasks as done, current, pending, or parked, with visual feedback and business rule enforcement.

## Dependencies

Features 01, 02, 03

## What to Build

### Status interaction

- Click or keyboard shortcut on a task node to cycle its status
- Four states: `pending`, `current`, `done`, `parked` (direct selection via a small control is likely better than cycling through four)

### Visual treatment

Each status is visually distinct:

- **`pending`**: default/neutral appearance
- **`current`**: highlighted (e.g., colored border, badge, or glow)
- **`done`**: dimmed or checked off (e.g., strikethrough, green check, reduced opacity)
- **`parked`**: visually muted/greyed out, distinct from done (e.g., dashed border, "paused" icon)

### Business rules

- A task can only be marked `done` if **all** its sub-tasks are `done`
- If the user tries to mark a task done with undone sub-tasks, show feedback (shake, tooltip, or highlight blockers)
- Reverting to `pending` or `current` is always allowed
- A task can be `parked` at any time (blocked by external factors). Unparking sets it back to `pending`.
- Marking a parent `undone` does NOT cascade to children. Each task is independent.

### Leaf task highlighting

Pending leaf tasks (no sub-tasks) should be visually highlighted as "available to work on." This is core to the Mikado workflow.

## Acceptance Criteria

- User can change any task's status
- Each status has distinct visual treatment
- Cannot mark a task `done` if any sub-task is not `done`. Shows feedback.
- Can always revert to `pending` or `current`
- Pending leaf tasks are visually highlighted as actionable
- Unit tests: `canMarkDone` returns false when sub-tasks aren't done, true when they are
- Unit tests: `setTaskStatus` transitions work correctly
- Integration test: mark leaf done, then parent done, verify both show done state
- Integration test: try to mark parent done with undone child, verify prevention

## Notes

- Use the `canMarkDone` pure function from Feature 01
- Consider whether only one task can be `current` at a time. The Mikado method suggests focusing on one thing, but don't enforce this unless it feels natural.
- Status colors should work well with the goal node's styling from Feature 02
