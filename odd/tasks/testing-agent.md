# Feature: Testing agent (Phase 5)

## Objective
After Develop puts a subtask in QA, a Testing run checks it against its acceptance criteria and either sends it to Deploy or back to In progress with numbered feedback.

## Decisions
- Deterministic checks run first and cost no tokens; the LLM review runs only when they pass.
- Playwright runs only when the user confirms each run (it installs and starts code the LLM wrote).
- Verdicts go through the existing `submitTestResult` use case (pass -> Deploy, fail -> `rejectFromQa`).
- Testing runs after Develop has left subtasks in QA, respecting `maxQaTasks`.

## Scope
- Deterministic checks: files in the task scope exist; TSX/TS files parse with the TypeScript compiler API.
- LLM review: prompt with acceptance criteria and file contents; JSON validated with zod; failures returned as a numbered list with criterion and file/line.
- Playwright (interfaces only): start the target's `dev` script, load the app, check criteria that describe the UI. Only after explicit confirmation per run.
- Team panel: Testing shows working or idle.

## Out of scope
Budgets for Testing runs, parallel Testing, changing the Develop or Orchestrator prompts.

## Acceptance criteria
1. A task in QA with a missing file fails with a numbered feedback item naming the file.
2. A task with a TSX syntax error fails with the file and line.
3. A task that passes deterministic checks and the LLM review moves to Deploy.
4. A task that fails the LLM review moves back to In progress with the failure list as feedback and one attempt added.
5. Invalid LLM output counts as a failed attempt, not as a pass.
6. Playwright does not run unless the run is confirmed.

## Route
- T1 Deterministic checks (domain pure, then port `WorkspaceReader` and disk adapter). RED first.
- T2 `runTesting` use case with in-memory adapters, LLM review. RED first.
- T3 Trigger after `runDevelopSubtasks`; Team panel status.
- T4 Playwright adapter with confirmation gate. Tests against a sample project.

## Progress
- [x] T1 Deterministic checks (08349c0)
- [x] T2 runTesting with LLM review (2ae2670)
- [x] T3 Trigger and Team panel (trigger 56a2b02; panel in the commit that adds this line)
- [x] T4 Playwright with confirmation (button "Run browser check" on QA cards; native confirm per run; adapter tested against test-fixtures/interface-sample with real Chromium)
- [ ] Verification

## Next step
Implement T1 and T2 (one writer), then T3, then T4.
