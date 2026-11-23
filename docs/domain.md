# Domain rules

These rules are non-negotiable and live in `src/domain`. They are pure TypeScript with no I/O.

## States

`definition → ready → in_progress → qa → deploy`, plus `review`.

- `review` is reached after too many failed QA attempts, or when a budget stop occurs.
- A failed QA sends the task back to `in_progress` with feedback attached.

## Who moves what

- **The user** moves only `definition → ready` (and back `ready → definition`). The user creates requests in Definition and moves them to Ready when they are ready.
- **The system** moves everything after Ready: claims the next `ready` task into `in_progress`, then `in_progress → qa → deploy`.
- The user cannot move a task past Ready.
- `review` is decided by the user (see below). The system cannot move a task out of review.

All transitions go through one pure function, `transitionTask`, which receives the actor (`user` or `system`).

## Queue

- At most one request is `in_progress` at any time. Its subtasks may be in progress together. Enforced in the database (unique partial index or transactional claim), not only in code.
- Other tasks wait in `ready` in FIFO order. The queue is unlimited.
- `qa` holds at most N tasks, where N is configurable in Settings (default 2).

## Attempts

- Each task has a maximum of 3 attempts.
- `rejectFromQa` requires feedback, adds one attempt and returns the task to `in_progress`.
- On the third rejection the task moves to `review` with reason `attempts`.

## Review decisions (user)

- **Send to Ready**: attempts reset to zero, feedback kept. Applies to any review task.
- **Delete**: removes the task. Allowed in Definition and Review.
- **Continue**: only for tasks stopped by budget. Returns the task to `in_progress` with the same attempt count and a new budget. Each continuation needs a new user decision; it is never unlimited.

## Budgets (soft limit)

- An in-progress task has a time budget and a token budget, configurable in Settings.
- Time alone is not a reliable signal, so a task is never killed for running long.
- When a budget is exceeded, the system stops the run and moves the task to `review` with the reason as feedback (for example "Stopped after 15 min without finishing"). The attempt counter does not change.
- Only one budget stop per task is pending at a time. A task waiting in review is not run again.

## Events

Every state change writes an event: task, from, to, actor, reason, timestamp. The board log reads from these events.

## Settings

- Attempt limit: default 3.
- Time budget: default 15 minutes per run.
- Token budget: default 50 000 tokens per run.
- QA cap: default 2 tasks in `qa` at once.
- Stored per user in a `settings` table and editable from the Settings view.

## Decisions

- A budget stop never counts as an attempt.
