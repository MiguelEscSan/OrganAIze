# Environment, Git and delivery

## Local setup

- Infrastructure: `docker compose up -d` starts Postgres 16 for adapter tests. Its credentials are local-only test values.
- Adapter tests (Drizzle repositories) run against this container, never against Supabase. Supabase is only used for the deployed `DATABASE_URL`.
- Copy `.env.example` to `.env.local` for local work. Never commit `.env*` files except `.env.example`.

## Local Supabase Storage

`docker compose up -d` also starts a local Supabase Storage (storage-api, its own Postgres and an nginx gateway) and creates the private bucket `agent-team-projects`. Nothing here is a real secret: the JWT secret and keys are local-only test values.

Use these in `.env.local` to run projects without a folder against Docker:

```
SUPABASE_URL=http://127.0.0.1:54600
SUPABASE_STORAGE_BUCKET=agent-team-projects
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoiYWdlbnQtdGVhbS1sb2NhbCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.EMvRmbHrde1TaCOLr7MPIFnoBX0e0Uw5eeeHxePoZFY
```

- The gateway listens on host port 54600 and forwards `/storage/v1/` to storage-api. The ports 54268-54467 are reserved by Windows on some machines, so 54351 does not bind there.
- The key is an HS256 JWT with role `service_role`, signed with the local secret `agent-team-local-jwt-secret-0123456789`. To regenerate it, sign `{"role":"service_role","iss":"agent-team-local","iat":1700000000,"exp":4102444800}` with that secret using HMAC SHA-256 (base64url), then update `SERVICE_KEY` and `AUTH_JWT_SECRET` in `docker-compose.yml`.
- The integration test `src/adapters/supabase/create-supabase-object-store.integration.test.ts` runs the real object store against this gateway. It skips itself when `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_STORAGE_BUCKET` is unset or the gateway is unreachable. Export both variables in the shell to run it.

## Required variables

Documented in `.env.example` with empty values:

- `DATABASE_URL`: Supabase Postgres connection string (pooler). Local runs point at the Docker Postgres.
- `LLM_API_KEY`: Gemini API key.
- `LLM_PROVIDER`: provider name, currently `gemini`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`: only needed for projects without a folder, whose files live in Supabase Storage. Disk projects work without them. The bucket must exist and be private.

## Optional variables

- `BROWSER_CHECK_ENABLED`: set to `true` to enable the browser check. Default off.
  - It runs the request QA automatically with Playwright and enables the manual "Run browser check" button on subtasks in QA.
  - It installs the target project's dependencies with `--ignore-scripts` and starts its dev server, so use it only on a local machine, not on Vercel.
  - When off (and in the cloud), the request QA passes automatically because the code was already audited per subtask.

## LLM provider

`LLM_PROVIDER` selects the provider. Any value other than `ollama` uses Gemini.

- **Gemini** needs `LLM_API_KEY` and `LLM_MODEL`.
- **Ollama** runs the model locally, needs no API key and is the default for development:
  - `LLM_MODEL`: Ollama model name, for example `qwen3:4b-instruct`.
  - `OLLAMA_BASE_URL`: server address. Defaults to `http://127.0.0.1:11434`.
  - `OLLAMA_NUM_CTX`: context window in tokens, sent as `num_ctx`. Defaults to 8192; an invalid value falls back to 8192.
- Develop limits the read-only project context in its prompt to the client's context window (one character per token), up to 30,000 characters.
- Ollama requests have no client-side headers or body timeout, so a slow local model is not cut off. The time and token budgets in Settings are the only limits.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server. |
| `npm run build` | Builds for production. |
| `npm start` | Serves the production build. |
| `npm run lint` | Runs ESLint. |
| `npm run db:migrate` | Applies the migrations in `drizzle/` to the database in `DATABASE_URL`, read from the environment or `.env.local`. |
| `npm test` | Runs the Vitest suite. |

## Deployment

The target setup is Vercel for the app and Supabase (free tier) for Postgres and Storage. API keys are read from the environment only and never appear in prompts, logs or the repository.

The agent prompts in `prompts/*.md` are read from disk at run time. `next.config.ts` includes them in the serverless output (`outputFileTracingIncludes`), so no setting is needed on Vercel.

Set these variables on Vercel: `DATABASE_URL`, `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` and `BROWSER_CHECK_ENABLED=false`.

- `DATABASE_URL` on Vercel is the Supabase Transaction pooler (port 6543). The direct connection is IPv6-only on the free plan and Vercel is IPv4-only.
- `SUPABASE_URL` is the project base URL, for example `https://<ref>.supabase.co`, without `/rest/v1/`.
- `SUPABASE_SERVICE_ROLE_KEY` is the legacy `service_role` key or the new `sb_secret_...` key. Never the anon or publishable key.
- The bucket must exist and be private. Projects created without a folder keep their files there.

To create the tables in a new Supabase project, run `npm run db:migrate` once from a machine with `DATABASE_URL` pointing at it. Use the Session pooler (port 5432), because migrations run DDL in a transaction and the direct connection does not resolve on networks without IPv6. Running it again is safe: applied migrations are skipped. It only works on an empty database or one it created, so a database whose tables were made by hand fails on the first `CREATE TABLE`.

## Git

- Conventional Commits only: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`.
- No "Co-Authored-By" or AI attribution in commits.
- Never work directly on `main`. Create a feature branch first.
- One feature, one branch: `feat/<name>`, `fix/<name>` or `chore/<name>`.
- Each task gets at least one work-unit commit that includes its tests and docs.
- Husky pre-push hook runs the full test suite and blocks the push if any test fails, and blocks pushing to `main`.
- Never bypass the hook (`--no-verify`).
- Push, pull request and merge are decided by the user.

## Working method

Organic Driven Development: explore first, track substantial work in `odd/tasks/<feature>.md`, implement task by task. Write the failing test first when a deterministic behavior has a clear expected outcome.
