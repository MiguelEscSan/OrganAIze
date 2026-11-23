# Environment, Git and delivery

## Local setup

- Infrastructure: `docker compose up -d` starts Postgres 16 for adapter tests. Its credentials are local-only test values.
- Adapter tests (Drizzle repositories) run against this container, never against Supabase. Supabase is only used for the deployed `DATABASE_URL`.
- Copy `.env.example` to `.env.local` for local work. Never commit `.env*` files except `.env.example`.

## Required variables

Documented in `.env.example` with empty values:

- `DATABASE_URL`: Supabase Postgres connection string (pooler). Local runs point at the Docker Postgres.
- `LLM_API_KEY`: Gemini API key.
- `LLM_PROVIDER`: provider name, currently `gemini`.

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
