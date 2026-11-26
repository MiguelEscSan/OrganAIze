# Domain rules

These rules are non-negotiable and live in `src/domain`. They are pure TypeScript with no I/O.

## States

`definition → ready → in_progress → qa → awaiting_release → deploy`, plus `review`.

- A subtask that passes its own audit goes `qa → awaiting_release`, never directly to `deploy`.
- A request is tested as a whole: when it has subtasks and every one is `awaiting_release`, the request moves `in_progress → qa` and the request QA runs.
- A request reaches `deploy` only through a passing request QA. The request and all its subtasks move to `deploy` together, each with an event. There is no rollup from subtasks.
- `review` is reached after too many failed QA attempts, or when a budget stop occurs.
- A failed QA sends the task back to `in_progress` with feedback attached.

## Request QA

- **Local** (`BROWSER_CHECK_ENABLED=true`): the system runs the Playwright probe automatically, then an LLM review of the rendered page against the request description and the acceptance criteria of its subtasks.
- **Cloud or browser check disabled**: the request QA passes automatically, because the code was already audited per subtask.
- **Evidence**: the request's deploy event records what the request QA saw. With the browser check disabled it says the running app was not reviewed. Otherwise it gives the characters of visible text, the console error count, the subtasks and acceptance criteria judged, and a 200-character excerpt of the visible text.
- **Failure attribution**: each failure carries a criterion, an optional file and a message. A failure with a file goes to the subtask that declares that file, and only those subtasks return `awaiting_release → in_progress` with their failures as feedback and one more attempt (a third failed attempt sends the subtask to `review`). A failure with no file, or whose file no subtask declares, returns every subtask. The request returns to `in_progress`.

## Who moves what

- **The user** moves only `definition → ready` (and back `ready → definition`). The user creates requests in Definition and moves them to Ready when they are ready.
- **The system** moves everything after Ready: claims the next `ready` task into `in_progress`, then `in_progress → qa → awaiting_release`, and the request `in_progress → qa → deploy` together with its subtasks.
- The user cannot move a task past Ready.
- `review` is decided by the user (see below). The system cannot move a task out of review.

All transitions go through one pure function, `transitionTask`, which receives the actor (`user` or `system`).

## Queue

- At most one request is `in_progress` at any time. Its subtasks may be in progress together. Enforced in the database (unique partial index or transactional claim), not only in code.
- Other tasks wait in `ready` in FIFO order. The queue is unlimited.
- `qa` holds at most N tasks, where N is configurable in Settings (default 2). The rule counts only `qa`: tasks in `awaiting_release` do not count against it.

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
