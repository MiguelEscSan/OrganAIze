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
