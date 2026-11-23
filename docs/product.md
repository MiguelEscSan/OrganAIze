# Product

## Purpose

Agent Team is a small web app where three AI agents work together on a user request:

1. **Orchestrator** receives a request card, splits it into subtasks with acceptance criteria, and assigns them.
2. **Develop** implements one subtask at a time against a target web project.
3. **Testing** checks Develop's output against the subtask's acceptance criteria and returns a numbered list of concrete failures until everything passes.

Everything the agents do is visible on a kanban board. A viewer should see, at a glance, which agent is working, which state each task is in, and why a task is stuck.

## Users

- **Technical evaluators** who review the test deliverable.
- **Developers** who create requests and follow their progress.

Both use a desktop browser. The app must still work at phone width without page-level horizontal scroll; the board itself scrolls horizontally by column.

## Vocabulary

- **Request**: a card the user creates with free-text input. It holds subtasks and is complete when all of them reach Deploy.
- **Task**: a subtask card, the unit the system works on.
- **Agent**: Orchestrator, Develop or Testing.
- **Feedback**: the numbered failure list Testing returns, shown on the card as "Testing".

## Board

Columns: **Definition | Ready to develop | In progress | QA | Review | Deploy**.

- Cards show title, description, assigned agent, attempt count (`n/3`) and last feedback.
- Request cards show progress as a parent, for example "2/5 subtasks in Deploy".
- An agent panel shows one card per agent with status (idle, working, reviewing) and its last message.
- The live log refreshes every 2 seconds by polling.
- Empty, loading and error states are visible in every view.

## Views

- **Board**: the kanban above.
- **Projects**: the target web projects the agents work against.
- **Team**: the three agents and their current status.
- **Settings**: attempt limit, time and token budgets, API key status (shows Configured or Missing, never the value).

## Out of scope

- Real deployment to a host. "Deploy" means the subtask was approved by Testing.
- Multi-user accounts, authentication, or permissions.
- Anything not in this Purpose list.
