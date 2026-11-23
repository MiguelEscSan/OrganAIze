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
- [ ] DEV-02 Phase 2: `WorkspaceWriter` port and in-memory adapter
- [ ] DEV-03 Phase 3: disk `WorkspaceWriter` with temp-dir tests
- [ ] DEV-04 Phase 4: `runDevelop` use case with in-memory tests
- [ ] DEV-05 Phase 5: reject overlapping files across tasks in progress
- [ ] DEV-06 Phase 6: wire time and token budgets to Develop
- [ ] DEV-07 Phase 7: register the command and show Develop status on the agent panel
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
- Feature document created on `feat/develop-agent`.

## Next step
DEV-01: write the file-scope tests first (RED), then the implementation.
