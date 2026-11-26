# Architecture

Clean / hexagonal, screaming architecture. Folders describe the domain, not the framework.

```
src/
  app/                 # Next.js routes only: thin, call use cases, render views
  domain/              # pure TypeScript: entities, state machine, rules. No I/O.
    requests/
    tasks/
    agents/
  application/         # use cases: createRequest, orchestrate, claimNextTask,
                       #            submitDevelopResult, submitTestResult
  ports/               # interfaces: TaskRepository, RequestRepository, LlmClient, PromptLibrary, EventLog
  adapters/            # implementations: Drizzle repositories, Gemini client, markdown prompt loader, clock, id generator
  presentation/        # kanban board and views: container / presentational split
prompts/               # the instructions of each agent, one markdown file per prompt
```

## Dependency rules

- `domain` imports nothing from `application`, `adapters`, `app`, or React.
- `application` depends only on `domain` and `ports`.
- `adapters` implement `ports`. Swapping the LLM or the database must not touch `domain` or `application`.
- Route handlers in `app/` contain no business logic.

## Stack

- Next.js (App Router), TypeScript `strict`, Tailwind CSS.
- Postgres on Supabase (free tier) through Drizzle ORM, using the pooler connection string in `DATABASE_URL`. No Supabase JS client for data access. The Supabase JS client is used only for Storage, behind the `WorkspaceWriter` and `ProjectFiles` ports: a project without a folder keeps its files in a Storage bucket under `<boardId>/`, and a project with a folder uses the disk.
- LLM provider: Gemini (free tier), behind the `LlmClient` port so it can be replaced by the Claude API.
- Agent prompts: markdown files in `prompts/`, read through the `PromptLibrary` port. A template holds the static instructions and `{{variable}}` placeholders. A line pair `{{#name}}` / `{{/name}}` wraps an optional section that is kept only when `name` has a value. Rendering fails when a placeholder has no value, when a value is not used, or when the file is missing. The files are not imported, so `next.config.ts` lists them in `outputFileTracingIncludes` to ship them with the serverless output.
- Deploy: Vercel. Package manager: npm.

## Agent principles

1. **Single responsibility.** Orchestrator plans, Develop writes code, Testing judges. No agent does another's job.
2. **No write conflicts.** Subtasks in progress may modify the target project only within their declared file scope, and two subtasks never write the same file at the same time.
3. **Bounded scope.** Each subtask states exactly which files and behavior it covers. Develop must not touch anything outside it.
4. **Explicit acceptance criteria.** The Orchestrator writes them. Testing judges only against them.
5. **Concrete feedback.** Testing returns a numbered list of failures, each with the violated criterion and file/line when possible.
6. **Deterministic checks first.** File exists, route exists, TSX parses (TypeScript compiler API). Only then LLM review.
7. **Bounded loops.** Max 3 attempts per task. No infinite retries. No silent failures.
8. **Observable.** Every agent decision is an event and appears on the board.
9. **Structured outputs.** Agents return JSON validated with zod. Invalid output counts as a failed attempt.
10. **No secrets in prompts or logs.** API keys come from environment variables only.

## Coding rules

- All code is in English: identifiers, files, folders, test names, log messages, UI copy.
- No comments in any file. Names carry the intent.
- TypeScript `strict: true`. No `any`.
- Vitest for `domain` and `application`. Test behavior, not implementation details.
- Use-case tests run against in-memory adapters, never the database.
- Infrastructure adapters (Drizzle repositories, LLM client) are tested against a real instance from `docker compose up -d`, never against Supabase.
- Components follow container / presentational split. Presentational components take props only.
- Small functions named by intent (`claimNextReadyTask`, not `handle`).
- No placeholder code (`TODO`, `...`) in committed work.
