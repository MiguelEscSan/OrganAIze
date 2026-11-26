# Agent Team

A small Next.js app where a team of three AI agents works together on a user request, and every step is visible on a kanban board.

| Agent | Responsibility |
| --- | --- |
| **Orchestrator** | Splits a request into subtasks with explicit acceptance criteria and decides which run in parallel and which in sequence. |
| **Develop** | Implements one subtask against the target web project, only inside its declared file scope. |
| **Testing** | Judges Develop's output against the acceptance criteria and returns a numbered list of concrete failures. |

When two subtasks declare the same file, Develop writes its change as a diff against the file's base content and a Merge step combines the diffs before Testing judges the result.

## How the agents work together

The agents never call each other. A single loop in `claimAndOrchestrateRequest` hands the work from one to the next, and every handoff is a state change on the board with an event (who, from, to, when, why).

```mermaid
flowchart TD
    U([User]) -->|writes card, moves it to Ready| R[Ready to develop]
    R -->|system claims the next request, FIFO| O{{Orchestrator}}
    O -->|plan invalid| OF[Count an attempt on the request]
    OF -->|3rd failure| RV[Review]
    OF -->|retry| O
    O -->|subtasks with files, criteria and parallel or sequence| D{{Develop}}
    D -->|invalid output, out of scope, merge failed| DF[Count an attempt on the subtask]
    DF -->|3rd failure| RV
    DF -->|retry with feedback| D
    D -->|files written| QA[QA]
    QA --> T{{Testing, per subtask}}
    T -->|rejected with numbered failures| DF
    T -->|approved| AR[Awaiting release]
    AR -->|every subtask approved| TR{{Testing, whole request}}
    TR -->|failures attributed to files| DF
    TR -->|approved| DP[Deploy: request and subtasks together]
    D -.->|time or token budget exceeded, no attempt counted| RV
    RV -->|user: continue, send to Ready or delete| D
```

### 1. The user defines, the system does the rest

The user writes a request card in **Definition** and moves it to **Ready to develop**. That is the only transition the user performs on the happy path. From **Ready** on, only the system moves cards.

Only one request is in progress at a time, enforced in the database, so two requests never write the same project at once. Other requests wait in FIFO order.

### 2. Orchestrator: plan

When a request is claimed, the project scaffold is created if missing and the Orchestrator asks the LLM for a plan: subtasks, each with its **files**, its **acceptance criteria** and a `runsInParallel` flag. The plan is validated with zod before anything is created. For example, `src/App.tsx` is rejected because the app entry is `App.tsx` at the project root.

Subtasks are born in **In progress**, assigned to Develop. The Orchestrator does not write code and does not judge it.

### 3. Develop: write

Develop gets one subtask at a time with: the criteria, the exact files it may write, their current content, read-only context from the rest of the project, the sibling subtasks (so it imports their real files instead of inventing them) and the last feedback, if any.

- **Parallel and sequence.** Every subtask flagged parallel runs in one batch at the same time. Otherwise the next subtask runs alone, in order.
- **Scope.** A write outside the declared files fails the attempt. The feedback lists the allowed files and suggests the closest match.
- **Shared files.** Two subtasks may declare the same file. Before writing, Develop compares the file on disk with the version it started from. If another subtask changed it in the meantime, a merge step reconciles the base, the file on disk and the proposed file, and the merged result is what gets written. If the merge cannot be produced, the attempt fails with the reason.
- When the files are written, the subtask moves to **QA**.

### 4. Testing: judge

Testing judges against the acceptance criteria only, in two levels.

**Per subtask**, in this order, stopping at the first level that fails:

1. Deterministic checks: every declared file exists and parses as TypeScript.
2. Type check of the project against the files of the subtask.
3. LLM review of the files against the criteria. The reply is validated with zod and must list a numbered failure with criterion, file and line for each violation.

A failure sends the subtask back to **In progress** with that numbered feedback and adds one attempt. A pass moves it to **Awaiting release**, not to Deploy.

**Per request**, when every subtask is awaiting release, the request enters **QA** and is judged as a whole:

- With `BROWSER_CHECK_ENABLED=true` (local), Playwright starts the app, collects the visible text and the console errors, and the LLM reviews that against the request and the criteria of all its subtasks.
- Otherwise (for example on Vercel, where a browser cannot run) the request passes without reviewing the running app, because the code was already audited per subtask. The deploy event says so explicitly.
- Either way the deploy event records what was reviewed, so the log shows how much was actually checked.

A request reaches **Deploy** only through a passing request QA, and the request and all its subtasks move together. Here "Deploy" means Testing approved the work. Nothing is published to a host.

When the request QA fails, each failure is attributed to the subtask that declares its file, and only those subtasks go back to work with the failures as feedback. A failure without a file, or with a file no subtask declares, sends every subtask back.

### 5. Review: the user decides

A card lands in **Review** after the third failed attempt, or when a budget stops a run. The user can:

| Decision | Effect |
| --- | --- |
| **Send to Ready** | Attempts reset to zero, feedback kept. A subtask goes back to work; a request goes back to the queue. |
| **Continue** | Budget stops only. Back to In progress with the same attempts and a fresh budget. Each continuation is a new decision. |
| **Delete** | Removes the card. Allowed only in Definition and Review. |

The system never moves a card out of Review.

### Corner cases

| Situation | What happens |
| --- | --- |
| The model replies with invalid JSON, or JSON that does not match the schema | The attempt fails with the schema error as feedback. |
| Develop writes a file it did not declare | The attempt fails. The feedback lists the allowed files. |
| Two subtasks edit the same file | The merge step reconciles them. If it cannot, the attempt fails with the reason. |
| Testing cannot complete its review (provider error, malformed reply) | It counts as a failed verdict with the reason, never as a silent pass. |
| The LLM provider is unavailable | The run stops without counting an attempt, so an outage does not burn the 3 attempts. |
| A run exceeds the time or token budget | The run stops, the card goes to Review with the reason, and no attempt is counted. A budget stop is never treated as a judgment of the work. |
| QA already holds N tasks | Develop does not push another one. The run stops without counting an attempt and continues on the next pass. |
| The plan is invalid | The attempt is counted on the request. After 3 the request goes to Review. |
| A subtask passes but the whole app fails | Request QA sends back only the subtasks responsible, with the failures attributed to their files. |
| Two writers touch the same card at once | Transitions are applied with an expected-status check, and a stale write is rejected as a conflict instead of overwriting. |
| The loop makes no progress | The loop compares a snapshot of statuses and attempts before and after each pass and stops when nothing changed, so there are no infinite retries. |

### Known limits

- Testing reads code and the text of the rendered page. It does not see network data or interaction results, so a field that is rendered but never fetched can pass review.
- The shared-file merge is done by the LLM over whole files, not by a mechanical three-way diff. It is the most likely step to need a retry when two subtasks edit the same file.
- Without the browser check, the request QA adds no new judgment on top of the per-subtask audit.

## Views

- **Board**: Definition, Ready to develop, In progress, QA, Review and Deploy columns. Cards show title, description, assigned agent, attempt count and last feedback. Requests show subtask progress.
- **Projects**: the target web projects the agents work against, with their files and a preview.
- **Team**: one card per agent with its status (idle, working, reviewing) and last message.
- **Settings**: attempt limit, QA capacity, time and token budgets, and whether the API key is configured (never its value).

The live log refreshes every 2 seconds by polling.

## Stack

- Next.js (App Router), TypeScript in strict mode, Tailwind CSS
- Postgres on Supabase through Drizzle ORM
- Ollama (local) or Gemini as the LLM provider, behind an `LlmClient` port so it can be swapped without touching `domain` or `application`
- Zod for validating every agent output
- Vitest for tests, Playwright for browser checks
- Husky pre-push hook that runs the full test suite

## Architecture

Clean and hexagonal, with folders that describe the domain.

```
src/
  app/            Next.js routes only; thin handlers that call use cases
  domain/         pure TypeScript: entities, state machine, rules, no I/O
  application/    use cases and the command/query mediator
  ports/          interfaces: repositories, LlmClient, event log, workspace
  adapters/       Drizzle repositories, Gemini client, in-memory and disk adapters
  presentation/   board components, container / presentational split
```

Dependency rules:

- `domain` imports nothing from the other layers or from React.
- `application` depends only on `domain` and `ports`.
- `adapters` implement `ports`, so swapping the database or the LLM never touches `domain` or `application`.
- Every state change goes through one pure function, `transitionTask`, which takes the actor (`user` or `system`) and writes an event with who, from, to, when and why.

More detail lives in [docs](docs/README.md): product, domain rules, architecture, delivery plan and environment.

## Getting started

Requirements: Node.js, npm and Docker.

```powershell
npm install
docker compose up -d
```

Copy `.env.example` to `.env.local` and fill in:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Locally it points at the Docker Postgres; in production it is the Supabase pooler string. |
| `LLM_API_KEY` | Gemini API key. Not needed with Ollama. |
| `LLM_PROVIDER` | `ollama` or `gemini`. Any value other than `ollama` uses Gemini. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Only for projects created without a folder, which keep their files in Supabase Storage. Disk projects do not need them. |
| `LLM_MODEL` | Model name for the chosen provider. |

See [LLM provider](#llm-provider) for the Ollama variables.

**Local Storage (local-only values).** `docker compose up -d` also starts a local Supabase Storage with the private bucket `agent-team-projects`. To use it, set `SUPABASE_URL=http://127.0.0.1:54600`, `SUPABASE_STORAGE_BUCKET=agent-team-projects` and `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoiYWdlbnQtdGVhbS1sb2NhbCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.EMvRmbHrde1TaCOLr7MPIFnoBX0e0Uw5eeeHxePoZFY` in `.env.local`. The key is a local test token, not a secret. Details in [environment](docs/environment.md).

## LLM provider

**Ollama** runs the model locally and is the default for development. No API key is needed.

| Variable | Meaning |
| --- | --- |
| `LLM_PROVIDER` | `ollama` |
| `LLM_MODEL` | Ollama model name, for example `qwen3:4b-instruct`. |
| `OLLAMA_BASE_URL` | Ollama server address. Defaults to `http://127.0.0.1:11434`. |
| `OLLAMA_NUM_CTX` | Context window in tokens, sent as `num_ctx`. Defaults to 8192; an invalid value falls back to 8192. |

Develop limits the read-only project context in its prompt to the client's context window (one character per token), up to 30,000 characters. Ollama requests have no client-side headers or body timeout, so a slow local model is not cut off; the time and token budgets in Settings are the only limits.

**Gemini** is used when `LLM_PROVIDER` is `gemini` or unset. It needs `LLM_API_KEY` and `LLM_MODEL`.

`docker compose up -d` starts Postgres 16 with two databases: `agent_team_test` for adapter tests and `agent_team_dev` for local app data. Its credentials are local-only test values.

Start the app:

```powershell
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm run build` | Builds for production. |
| `npm start` | Serves the production build. |
| `npm run lint` | Runs ESLint. |
| `npm test` | Runs the Vitest suite. |

## Testing

- `domain` and `application` are tested with Vitest. Use case tests run against in-memory adapters, never the database.
- Adapters that touch infrastructure (Drizzle repositories, the LLM client, the Playwright runner) are tested against real instances started with Docker Compose, never against Supabase.
- Tests describe behavior, not implementation details.
- The pre-push hook runs the whole suite and blocks the push on any failure. It also blocks pushing directly to `main`.

## Deployment

The target setup is Vercel for the app and Supabase (free tier) for Postgres. Set `DATABASE_URL`, `LLM_API_KEY` and `LLM_PROVIDER` as environment variables on Vercel. API keys are read from the environment only and never appear in prompts, logs or the repository.

## Conventions

- All code, identifiers, file names, log messages and UI copy are in English, and the code carries no comments.
- Conventional Commits, one feature per branch (`feat/`, `fix/`, `chore/`), never directly on `main`.
- Each task gets at least one work-unit commit that includes its tests and docs.
- Work is tracked task by task in `odd/tasks/<feature>.md`.
