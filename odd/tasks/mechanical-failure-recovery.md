# Mechanical failure recovery

## Objective

A task that keeps failing for mechanical reasons (syntax, type errors, invalid JSON, out-of-scope writes, a failed merge, an invalid plan) gets more automatic attempts, with the full history of previous failures in Develop's prompt, before it lands in Review. A task that fails on substance (an acceptance criterion judged unmet by the LLM review, or a failed request QA) still goes to Review after the normal limit so the user sees it.

## Why

Review was too heavy: the user had to press a button to send back tasks that failed for trivial reasons. Develop also saw only the last feedback, so it repeated earlier mistakes.

## Scope

- The failure kind is decided by its origin, never by reading the text of the feedback.
- No new database column and no migration: the threshold depends on the kind of the failure being counted.
  - Substantive failure: Review when attempts reach the normal limit (3).
  - Mechanical failure: Review when attempts reach the extended limit (6).
- Develop's prompt lists every previous failure of the task, numbered by attempt, taken from the event log.
- Budget stops are unchanged: they go to Review and never resume by themselves.
- Review stays the final stop and the system never moves a task out of it.

## Tasks

- [x] T1 Domain: failure kind and the two thresholds in the attempt-counting functions, with tests first.
- [x] T2 Application: tag each source of failure with its kind (deterministic checks, type check, invalid output, scope, merge, invalid plan: mechanical; LLM criterion review, request QA: substantive).
- [x] T3 Application: Develop's prompt includes the numbered history of previous failures, with tests.
- [x] T4 Docs: `docs/domain.md` and the README corner-case table.

## Acceptance criteria

- A task with three mechanical failures is still in progress; with six it is in review.
- A task with a substantive failure at its third attempt is in review.
- Develop's prompt contains every previous failure in order.
- Existing behavior for budget stops and manual review decisions is unchanged.

## Progress

- T1 and T2 (commit bfe7cb6): `failure-kind.ts` with `attemptLimitFor` and `statusAfterFailedAttempt`; `maxMechanicalAttemptsPerTask = 6`; `rejectFromQa` and `countFailedAttempt` take the kind explicitly; `TestVerdict` failed variant carries `kind`. RED observed (2 domain failures, 7 application failures) before implementing. Tests: reject-task, count-failed-attempt, submit-test-result, run-testing "failure kinds", run-develop, orchestrate-request.
- T3 (commit 05686b6): `previousFailuresOf` in the domain, used by `developPrompt`, capped to 5. RED observed for the prompt tests.
- T4: docs and README updated.
- Request QA is unchanged and keeps the limit of 3.
- Follow-up not done: the attempt dots and the details text on the board still show 3 as the maximum.
