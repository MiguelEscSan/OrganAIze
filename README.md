# Agent Team

A small Next.js app where a team of three AI agents works together on a user request, and every step is visible on a kanban board.

| Agent | Responsibility |
| --- | --- |
| **Orchestrator** | Splits a request into subtasks with explicit acceptance criteria and decides which run in parallel and which in sequence. |
| **Develop** | Implements one subtask against the target web project, only inside its declared file scope. |
| **Testing** | Judges Develop's output against the acceptance criteria and returns a numbered list of concrete failures. |

When two subtasks declare the same file, Develop writes its change as a diff against the file's base content and a Merge step combines the diffs before Testing judges the result.

## How a request flows

1. The user writes a request card in **Definition** and moves it to **Ready to develop**. This is the only transition the user performs on the happy path.
2. The system claims the next ready request into **In progress**. The Orchestrator splits it into subtasks.
3. Develop implements each subtask and moves it to **QA**.
4. Testing checks the subtask. A pass moves it to **Deploy**. A failure sends it back to **In progress** with feedback attached and adds one attempt.
5. After 3 failed attempts, or when a time or token budget is exceeded, the task moves to **Review**, where the user decides: continue (budget stops only), send back to Ready, or delete.
6. A request is complete when all its subtasks are in **Deploy**. Here "Deploy" means Testing approved the subtask; nothing is published to a host.

Only one request is in progress at a time, enforced in the database. Other requests wait in FIFO order. QA holds at most N tasks (configurable in Settings, default 2).

Testing can also drive the running target app with Playwright, but only after the user confirms each run, because it installs and starts code the model wrote.

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
| `LLM_MODEL` | Model name for the chosen provider. |

See [LLM provider](#llm-provider) for the Ollama variables.

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
