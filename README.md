# Agent Team

A small Next.js app where a team of three AI agents works together on a user request, and every step is visible on a kanban board.

| Agent | Responsibility |
| --- | --- |
| **Orchestrator** | Splits a request into subtasks with explicit acceptance criteria and decides which run in parallel and which in sequence. |
| **Develop** | Implements one subtask against the target web project, only inside its declared file scope. |
| **Testing** | Judges Develop's output against the acceptance criteria and returns a numbered list of concrete failures. |

When two subtasks declare the same file, a merge step reconciles their edits before Testing judges the result.

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

Develop gets one subtask at a time with: the criteria, the exact files it may write, their current content, read-only context from the rest of the project, the sibling subtasks (so it imports their real files instead of inventing them) and the failures of earlier attempts, numbered in order (the five most recent), so it does not repeat them.

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

A card lands in **Review** after its third substantive failure (an acceptance criterion judged unmet, or a failed request QA), after its sixth mechanical failure (syntax, types, invalid output, scope, merge, invalid plan, an incomplete review), or when a budget stops a run. The kind is decided by where the failure came from, never by reading its text. The user can:

| Decision | Effect |
| --- | --- |
| **Send to Ready** | Attempts reset to zero, feedback kept. A subtask goes back to work; a request goes back to the queue. |
| **Continue** | Budget stops only. Back to In progress with the same attempts and a fresh budget. Each continuation is a new decision. |
| **Delete** | Removes the card. Allowed only in Definition and Review. |

The system never moves a card out of Review.

### Corner cases

| Situation | What happens |
| --- | --- |
| The model replies with invalid JSON, or JSON that does not match the schema | A mechanical failure: the attempt fails with the schema error as feedback and the task gets up to 6 attempts before Review. |
| Develop writes a file it did not declare | The attempt fails. The feedback lists the allowed files. |
| Two subtasks edit the same file | The merge step reconciles them. If it cannot, the attempt fails with the reason. |
| Testing cannot complete its review (provider error, malformed reply) | It counts as a mechanical failed verdict with the reason, never as a silent pass. |
| The LLM provider is unavailable | The run stops without counting an attempt, so an outage does not burn the attempts. |
| A run exceeds the time or token budget | The run stops, the card goes to Review with the reason, and no attempt is counted. A budget stop is never treated as a judgment of the work. |
| QA already holds N tasks | Develop does not push another one. The run stops without counting an attempt and continues on the next pass. |
| The plan is invalid | A mechanical failure: the attempt is counted on the request. After 6 the request goes to Review. |
| A subtask keeps failing the LLM review of its criteria | A substantive failure: after 3 attempts the subtask goes to Review so the user sees it. |
| A subtask passes but the whole app fails | Request QA sends back only the subtasks responsible, with the failures attributed to their files. |
| Two writers touch the same card at once | Transitions are applied with an expected-status check, and a stale write is rejected as a conflict instead of overwriting. |
| The loop makes no progress | The loop compares a snapshot of statuses and attempts before and after each pass and stops when nothing changed, so there are no infinite retries. |

### Known limits

- Testing reads code and the text of the rendered page. It does not see network data or interaction results, so a field that is rendered but never fetched can pass review.
- The shared-file merge is done by the LLM over whole files, not by a mechanical three-way diff. It is the most likely step to need a retry when two subtasks edit the same file.
- Without the browser check, the request QA adds no new judgment on top of the per-subtask audit.
- The attempt counter is shared between kinds: a task with three mechanical failures that then fails on substance goes to Review at once, because its attempts already reached the substantive limit.

How to run, configure and deploy the app is in [docs](docs/README.md).
