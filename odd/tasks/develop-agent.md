# Develop agent

## Objective
Let the Develop agent implement one subtask inside its declared file scope, then hand the result to QA.

## Problem
`submitDevelopResult` only moves a task to `qa`. Nothing generates or writes code, nothing checks file scope, and the `files` and `acceptanceCriteria` stored on each subtask are not used.

## Decisions
- LLM output is the full content of every file the subtask touches, validated with zod. Invalid output counts as a failed attempt.
- Develop writes only inside the board's `rootPath`, and only to files listed in the subtask's `files`.
- Any out-of-scope path rejects the whole output; nothing is written.
- Budgets (time and tokens) reuse the existing settings defaults: 15 minutes and 50,000 tokens.

## Scope
- Domain: file-scope check, develop output shape.
- Ports: `WorkspaceWriter`.
- Adapters: in-memory writer, disk writer.
- Application: `runDevelop`, parallel overlap check on claim, budget wiring.
- Presentation: agent panel status for Develop.

## Out of scope
Testing agent, Playwright, Edit and Continue changes.

## Tasks
- [x] DEV-01 Phase 1: domain file-scope check and develop output shape, with tests (6 tests; RED observed as missing module, then GREEN)
- [x] DEV-02 Phase 2: `WorkspaceWriter` port and in-memory adapter
- [x] DEV-03 Phase 3: disk `WorkspaceWriter` with temp-dir tests
- [x] DEV-04 Phase 4: `runDevelop` use case with in-memory tests (6 tests)
- [x] DEV-05 Phase 5: overlapping files across subtasks (already enforced by the plan schema in `orchestration-plan.ts`, with tests; runtime lock deferred until runs are concurrent)
- [x] DEV-06 Phase 6: wire time and token budgets to Develop (`LlmReply` carries optional `totalTokens`; over budget → `review` with reason in `lastFeedback`, attempts unchanged; 3 tests)
- [~] DEV-07 Phase 7: register the command (done) and show Develop status on the agent panel (pending: no live panel exists yet, and nothing triggers `RunDevelop` yet)
- [ ] DEV-08 Phase 8: end-to-end run on a sample project

## Acceptance criteria
- Output touching a file outside the subtask's `files` is refused and nothing is written.
- Invalid LLM output counts as a failed attempt with feedback.
- Two subtasks in progress never write the same file.
- A subtask over budget goes to `review` with the reason in `lastFeedback`.

## Applicable checks
- Vitest for domain and application, against in-memory adapters.
- Disk adapter against a temporary directory.
- `tsc`, lint and `npm run build` before each commit.

## Progress
- DEV-01 to DEV-04 done on `feat/develop-agent`, 195 tests passing.
- Known gap: `runDevelop` writes files before `submitDevelopResult` checks QA capacity. If QA is full, the files are written and the subtask stays in progress; the next run overwrites them. Fix when wiring the command in DEV-07.
- LLM unavailability counts as a failed attempt, not an immediate review, so a short outage can use up attempts.

- DEV-05: the plan schema already rejects a parallel subtask that shares a file. Runs are sequential today, so no runtime lock is needed yet. A runtime lock becomes necessary when Develop runs subtasks concurrently.
- DEV-06 needs a decision: `LlmReply` carries no token count. Counting tokens means adding usage to the LLM port.

- DEV-06 done: the user chose to add usage to the LLM port. Time is measured with the `Clock` port around the LLM call; tokens come from the reply. The budget check runs before parsing and before any write.

- DEV-07 partial: the QA-capacity gap is fixed. `runDevelop` checks the shared `qaFullReason` before writing, so a full QA writes nothing and keeps the attempt count (test added). `RunDevelop` is registered in `register-handlers.ts`, and the server opens a disk writer rooted at each board's `rootPath`.
- DEV-07 trigger (automatic, chosen by the user): after a request is split, `runDevelopSubtasks` runs its develop subtasks in turn until each reaches qa, or stops when QA is full or an attempt is not counted. It runs inside the Ready request, so the HTTP call waits for the whole develop pass. Moving that to a background worker is deferred.
- DEV-07 done: the Team page shows Develop as working (with the subtask title) or idle, derived from the board's tasks by `developActivity` (2 domain tests). The Orchestrator and Testing cards stay static.
- DEV-07 status: the Team page reads the board through `ListBoard`; if that read fails it falls back to the static cards.

- Board root: Develop writes into the `rootPath` of the board that owns the subtask's request. Projects are created from the Projects page; `PROJECT_ROOT` was removed. Switching boards switches the project. The run resolves the board through `BoardRepository` and opens a writer with `workspaceFor(rootPath)`. Covered by one test in `run-develop.test.ts`.
- Review: a task sent back to Ready from Review starts the orchestrator, as a task released from Definition does (PR #15).
- Errors: Gemini failures are shown in a bottom-left banner that explains the cause (rejected key, unknown model, rate limit, overload, missing variables) (PR #16).
- Configuration: `LLM_API_KEY` and `LLM_MODEL` come from `.env.local`; the model name must not include the `models/` prefix. The app reads `.env.local` only when the server starts.
- Databases: the app uses `agent_team_dev` and the tests use `agent_team_test`, so running the tests no longer clears the app's data. Only `*_test` databases are truncated.

## Next step
DEV-08: end-to-end run on the sample project `C:/Projects/TimeScheduleERM` (empty folder) through the board TimeScheduleERM, with `LLM_MODEL=gemini-3.5-flash-lite`. Expected: the orchestrator splits each request and writes files into that folder. Rerun if Gemini answers 503 (temporary overload).
