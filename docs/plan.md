# Delivery plan

Each phase is one feature branch (`feat/<name>`), built task by task with tests first. Push, PR and merge remain the user's decisions.

## Phase 0: Domain (done on `feat/domain-rules`)

- Task states, `transitionTask` with actors, one in progress, FIFO queue rule.
- `rejectFromQa` with attempt limit and review routing.
- Budget rules: `exceedsBudget`, `stopForBudget`, Continue action in the board.
- Edit and delete rules for Definition and Review.
- 37 Vitest tests passing.

Open: `stopForBudget` does not yet return a `TaskEvent`. Add it so budget stops appear in the log like other transitions.

## Phase 1: Application ports and use cases

- Ports: `TaskRepository`, `RequestRepository`, `EventLog`, `LlmClient`, clock and id generator.
- Use cases: `createRequest`, `claimNextReadyTask`, `submitDevelopResult`, `submitTestResult`, `stopForBudgetUse`, `reviewDecision`.
- Tests against in-memory adapters.

## Phase 2: Persistence

- Drizzle schema and migrations for requests, tasks, events, and a `settings` table holding the attempt limit (default 3), the time budget (default 15 min) and the token budget (default 50 000 tokens). Settings are editable from the Settings view and persist per user.
- Unique partial index so only one task is `in_progress`.
- Repository adapters tested against Docker Postgres (`docker compose up -d`).
- Connect to Supabase only when deploying. Needed from the user: the pooler connection string with its password.

## Phase 3: Orchestrator

- `LlmClient` adapter for Gemini, with zod-validated JSON output.
- Splits a request into subtasks with acceptance criteria and assigns them.
- Invalid output counts as a failed attempt and is logged.

## Phase 4: Develop and queue engine

- Claims the next ready task when nothing is in progress.
- Develop writes code inside the task's declared scope.
- Enforces the time and token budgets from Settings; a stop moves the task to review with the reason.

## Phase 5: Testing

- Deterministic checks first: file exists, route exists, TSX parses with the TypeScript compiler API.
- Then LLM review against the acceptance criteria.
- Returns a numbered failure list with criteria and file/line. Vague feedback is rejected.
- Pass moves the task to Deploy; fail rejects via `rejectFromQa`.

## Phase 6: Board and observability

- Live polling every 2 seconds.
- Agent panel with idle, working, reviewing status and last message.
- Request cards with progress (for example 2/5 in Deploy).
- Empty, loading and error states everywhere.
- Settings page wired to persistence: attempt limit, budgets.

## Phase 7: Delivery

- Deploy to Vercel with Supabase as `DATABASE_URL`.
- README: how the app was built with Claude Code, and answers to the four test brief questions.

## Open decisions

1. Resolved: budget defaults are 15 min and 50 000 tokens, stored in the `settings` table.
2. Resolved: a budget stop does not count as an attempt.
3. Deferred: the four short questions from the test brief. Revisit at Phase 7 (README).
