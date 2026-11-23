# CLAUDE.md — agent-team

## Purpose

A small Next.js app where a team of three AI agents works together on a user request:

1. **Orchestrator**: receives a request card, splits it into subtasks, assigns them.
2. **Develop**: implements one subtask at a time against the target web project.
3. **Testing**: checks Develop's output against the subtask's acceptance criteria and returns concrete failures until everything passes.

Everything the agents do must be visible on a kanban board.

This is a technical test deliverable. It must be deployed on Vercel, use a free database (Supabase), and never commit API keys.

## Stack

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- Postgres on Supabase (free tier) via Drizzle ORM. Use the Supabase connection string (pooler) in `DATABASE_URL`; do not use the Supabase JS client for data access.
- LLM provider for agents: **Gemini** (free tier). Hidden behind an `LlmClient` port so it can be swapped (e.g. to Claude API) without touching `domain` or `application`.
- Deploy: Vercel
- Package manager: npm

## Architecture

Clean / hexagonal, screaming architecture. Folders describe the domain, not the framework.

```
src/
  app/                 # Next.js routes only (thin: call use cases, render views)
  domain/              # pure TypeScript: entities, state machine, rules. No I/O.
    requests/
    tasks/
    agents/
  application/         # use cases: createRequest, orchestrate, claimNextTask, submitDevelopResult, submitTestResult
  ports/               # interfaces: TaskRepository, RequestRepository, LlmClient, EventLog
  adapters/            # implementations: drizzle repositories, LLM adapters, clock/id generators
  presentation/        # kanban board components (container / presentational split)
```

Rules:
- `domain` imports nothing from `application`, `adapters`, `app`, or React.
- `application` depends only on `domain` and `ports`.
- `adapters` implement `ports`. Swapping the LLM or the database must not touch `domain` or `application`.
- Route handlers in `app/` contain no business logic.

## Domain rules (non-negotiable)

- **Request** = a card created by the user with a free-text input. Requests are queued in the **Ready to develop** column.
- The Orchestrator splits a request into **subtasks** as soon as it is created. Each subtask is its own card in Ready.
- A request can have many subtasks. The request is complete when all its subtasks reach **Deploy**.
- **Task states:** `definition` → `ready` → `in_progress` → `qa` → `deploy`, plus `review` (reached after too many failed QA attempts or a budget stop). A failed QA sends the task back to `in_progress` with feedback attached.
- **Definition is written by the user.** The user creates a request card in Definition and, when it is ready, moves it to Ready to develop. Only the user performs `definition` → `ready`.
- **The system moves everything after Ready.** The program claims the next `ready` task into `in_progress`, and moves tasks between `in_progress`, `qa` and `deploy`. The user cannot move a task past Ready.
- Transitions are validated by one pure function (`transitionTask`) in `domain`, which takes the actor (`user` or `system`).
- **At most one task is `in_progress` in the whole system at any time.** Enforce this in the database (unique partial index or transactional claim), not only in code.
- Other tasks wait in `ready` in FIFO order. The queue is unlimited.
- `qa` holds at most one task, because it is fed only by the single `in_progress` task.
- Each task has a max of 3 attempts. A rejection from QA (`rejectFromQa`) requires feedback, adds one attempt and returns the task to `in_progress`. On the third rejection the task moves to `review`, where the user decides: send it back to Ready (attempts reset to zero, feedback kept) or delete it. The system cannot move a task out of review.
- Every state change writes an event (who, from, to, when, reason). The board log reads from these events.
- **Soft limit while in progress.** A task in `in_progress` has a time budget and a token budget (both configurable in Settings). Time alone is not a reliable signal, so a task is not killed for running long.
- **Stopping a long run.** When a budget is exceeded, the system stops the agent run and moves the task to `review` with the reason written in the feedback (for example, "Stopped after 15 min without finishing"). The attempt counter does not change, because the system did not judge the work.
- **The user decides from review.** For a task stopped by a budget, Review offers three actions:
  - **Continue:** the task returns to `in_progress` with the same attempt count and a new budget. It is never unlimited: each continuation requires a new decision.
  - **Send to Ready:** attempts reset to zero, as for any review task.
  - **Delete:** removes the task.
- **Only one budget-stop per task is pending at a time.** While a task waits in review, the system does not run it again.
- **Open decision:** the default values for the time and token budgets, and whether a budget stop should ever count as an attempt. Until decided, a budget stop never counts as an attempt.

## Board

Columns: **Definition | Ready to develop | In progress | QA | Review | Deploy**.

- Cards show: title, description, assigned agent, attempt count, last feedback (if any).
- Request cards are shown as a parent with progress (e.g. 2/5 subtasks in Deploy).
- Agent panel: one card per agent with status (idle / working / reviewing) and last message.
- Live log refreshes every 2 seconds (polling is acceptable).
- Empty states, loading states and error states must be visible.

## Agent principles

These apply to the agent prompts and to the code that runs them.

1. **Single responsibility.** Orchestrator plans, Develop writes code, Testing judges. No agent does another agent's job.
2. **One writer at a time.** Only the task in `in_progress` can modify the target project.
3. **Bounded scope.** Each subtask states exactly which files and behavior it covers. Develop must not touch anything outside that scope.
4. **Explicit acceptance criteria.** The Orchestrator writes them. Testing judges only against them, never against its own taste.
5. **Concrete feedback.** Testing returns a numbered list of failures, each with the criterion it violates and the file/line when possible. Vague feedback ("looks wrong") is rejected.
6. **Deterministic checks first.** File exists, route exists, TSX parses (TypeScript compiler API). Only then LLM review.
7. **Bounded loops.** Max 3 attempts per task. No infinite retries. No silent failures.
8. **Observable.** Every agent decision is logged as an event and reflected on the board.
9. **Structured outputs.** Agents return JSON validated with a schema (zod). Invalid output counts as a failed attempt.
10. **No secrets in prompts or logs.** API keys come from environment variables only.

## Coding rules

- Language: all code is in English. This covers identifiers (functions, variables, types, parameters), file and folder names, test names, log messages and UI copy.
- No comments in code, in any file. The code must read as prose: names carry the intent, so no comment is needed.
- TypeScript `strict: true`. No `any`.
- Tests with Vitest for `domain` and `application` (state machine, queue rule, retry rule). Test behavior, not implementation details.
- Use case tests run against in-memory adapters, not the database.
- Adapters that touch infrastructure (Drizzle repositories, LLM client) are tested against a real instance started with Docker Compose (`docker compose up -d`), never against Supabase.
- Components: container / presentational split. Presentational components take props only.
- Keep functions small and named by intent (`claimNextReadyTask`, not `handle`).
- No placeholder code (`TODO`, `...`) in committed work.

## Environment

- Local infrastructure runs with `docker compose up -d` (Postgres for adapter tests). The compose file is versioned; its credentials are local-only test values.
- Copy `.env.example` to `.env.local` for local work. Never commit `.env*` files except `.env.example`.
- Required variables (document in `.env.example`, with empty values):
  - `DATABASE_URL` (Supabase Postgres connection string)
  - `LLM_API_KEY`
  - `LLM_PROVIDER`

## Git and delivery

- Conventional Commits only (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`).
- No "Co-Authored-By" or AI attribution in commits.
- Work on a feature branch, never directly on `main`.
- One feature, one branch. Each functionality gets its own branch, named `feat/<name>`, `fix/<name>` or `chore/<name>`.
- Each task gets at least one work-unit commit that includes its tests and docs.
- A pre-push hook (Husky) runs the full test suite and blocks the push if any test fails. It also blocks pushing directly to `main`.
- Never bypass the hook (`--no-verify`).
- Push, PR, and merge are decided by the user.

## Working method (for Claude Code)

- Organic Driven Development: explore first, then track substantial work in `odd/tasks/<feature>.md`, then implement task by task.
- Write the failing test first when a deterministic behavior has a clear expected outcome.
- Do not add features outside the Purpose above.
- Ask one question at a time when a real product decision is missing.

## Open decisions

- The four short questions from the test brief (to answer in the README at delivery).
