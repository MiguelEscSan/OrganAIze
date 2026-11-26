# Feature: QA of the parent request and the Awaiting release column

## Objective
A request is tested as a whole before anything reaches Deploy. Each subtask is audited on its own; once audited it waits in a new column, **Awaiting release**. When every subtask of the request is waiting, the request itself goes through QA. If it passes, the request and all its subtasks go to Deploy together. If it fails, only the subtasks responsible for the failures return to development.

## Problem
Today each subtask moves from QA to Deploy as soon as its own audit passes, and the request only rolls up to Deploy when every subtask is already there (`complete-request-task.ts`). Nothing tests the request as a whole, and the browser check is a manual button on a subtask.

## Decisions
- New status `awaiting_release`, shown as the column **Awaiting release** between QA and Deploy. It is not counted by the QA capacity rule (`qa-capacity.ts` counts only `qa`), which removes the deadlock that holding approved subtasks in QA would cause.
- Subtask flow: `in_progress` -> `qa` -> `awaiting_release` after its audit (deterministic checks, type check, LLM review, as today).
- Request flow: when the request has subtasks and every one is `awaiting_release`, the system moves the request `in_progress` -> `qa`. The system then runs the request QA.
- Request QA, local: when the browser check is enabled (`BROWSER_CHECK_ENABLED=true`) it runs the existing Playwright probe automatically, then an LLM review of the rendered page against the request description and the acceptance criteria of its subtasks. Cloud, or browser check disabled: the request QA passes automatically because the code was already audited per subtask.
- Pass: the request `qa` -> `deploy` and every subtask `awaiting_release` -> `deploy`, in one step, with events.
- Fail: the review returns failures, each with a criterion, an optional file and a message. A failure with a file is linked to the subtask that declares that file. Only those subtasks go `awaiting_release` -> `in_progress` with their failures as feedback and one attempt added (a third failed attempt sends the subtask to `review` as today). A failure with no file, or whose file no subtask declares, sends **every** subtask back. The request returns to `in_progress`.
- The request completion rollup (`completeRequestTask`) is replaced by this flow: a request reaches Deploy only through a passing request QA.
- A subtask in `awaiting_release` cannot be moved by the user; the system owns the transitions.
- `CLAUDE.md` states that Deploy is per subtask and lists six columns. The owner changes it; the code and `docs/` follow this document.

## Scope
- Domain: status, transitions, release rules (pure functions), request QA verdict and failure attribution.
- Persistence: the status value in the database (migration if it is an enum or constrained), in-memory repository.
- Application: subtask pass goes to `awaiting_release`; request QA use case wired into the claim, develop, test and resume loop.
- Presentation: the new column, request progress copy, card state.
- Docs: `docs/domain.md`, `docs/product.md`, and the proposed `CLAUDE.md` wording in this document.

## Out of scope
A separate Merge agent, task dependencies, project-level local or cloud type (the existing global `BROWSER_CHECK_ENABLED` stays), scripted Playwright flows, changing the model.

## Acceptance criteria
1. A subtask that passes its audit ends in `awaiting_release`, never directly in `deploy`.
2. `awaiting_release` tasks do not count against the QA capacity.
3. When all subtasks of a request are `awaiting_release`, the request moves to `qa`; with one still in `qa` or `in_progress` it does not.
4. Request QA passing moves the request and all its subtasks to `deploy` together, each with an event.
5. Request QA failing with failures pointing at a file declared by subtask A returns only A, with feedback and one more attempt; the others stay.
6. A failure without an attributable file returns all subtasks.
7. Cloud mode or browser check disabled: request QA passes without launching a browser.
8. The request reaches `deploy` only through request QA (no rollup).
9. The board shows the column Awaiting release between QA and Deploy and its tasks.
10. Existing behavior for attempts, budget stops and review is unchanged.

## Route
- T1 Domain: status, transitions and pure release and rejection rules (RED first).
- T2 Persistence: database status, migration, in-memory (RED first).
- T3 Application: subtask pass to `awaiting_release`, request QA use case, wiring in the loop (RED first, in-memory adapters).
- T4 Presentation: Awaiting release column and copy.
- T5 Docs and proposed `CLAUDE.md` wording.
- T6 Verification: test, tsc, lint, build, and a live run with the browser check enabled.

## Progress
- [x] T1 Domain: status awaiting_release, system moves, releaseSubtask, requestReadyForQa, approveRequest, rejectRequest; completeRequestTask removed (RED observed first, tests green)
- [x] T2 Persistence: migration 0010_awaiting_release_status (status check constraint widened); Drizzle test saves and reads awaiting_release against Docker Postgres (RED observed without the migration)
- [ ] T3 Request QA use case and wiring
- [ ] T4 Board column
- [ ] T5 Docs
- [ ] T6 Verification

## Next step
T3 (subtask pass to awaiting_release, request QA use case and wiring), then T4 and T5.
