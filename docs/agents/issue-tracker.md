# Issue tracker conventions

The single reference for how agents and skills read and write tickets in **this**
workspace. Skills (`ticket-kickoff`, `update-ticket`, `clarifying-ticket`,
`plan-testcases`, `report-test-results`, `open-pr`, `review`) consult this file instead
of hardcoding a provider — fill it in when you instantiate the workspace, alongside
`workspace.config.yaml`.

## The adapter is the only entry point

**Never** call a tracker's API/MCP directly. All ticket I/O goes through the shell
adapter in `scripts/tracker/`, which dispatches by `TRACKER_PROVIDER` (`notion` | `jira`)
from `scripts/tracker/.env`:

| Need | Command |
|---|---|
| Read a ticket | `scripts/tracker/get-ticket-details.sh <KEY>` |
| Read comments | `scripts/tracker/get-ticket-comments.sh [--deep] <KEY>` |
| Set status/fields | `scripts/tracker/upsert-ticket-details.sh <KEY> --status … --priority … --title … --description …` |
| Add a comment | `scripts/tracker/add-ticket-comment.sh <KEY> "text"` (or pipe a file via stdin) |

Both write scripts accept `--dry-run`. The flags are **abstract**; the adapter maps them
to the provider (Notion properties; Jira fields + a status transition).

## This workspace's settings

> Fill these in from `workspace.config.yaml`.

- **Provider:** `<notion | jira>`
- **Ticket id format:** `<PREFIX>-<n>` (e.g. `FM-9`, `OFB-123`). The id regex is
  `<PREFIX>-\d+`. A bare number is accepted (Notion: looked up by the unique-id
  property; Jira: expanded with `JIRA_PROJECT_KEY`).
- **Notion only:** tasks database id = `<NOTION_DB_ID>`; unique-id property =
  `<NOTION_ID_PROP, default "Task ID">`. Never write `Task ID` or `Updated at`
  (read-only / auto).
- **Jira only:** project key = `<JIRA_PROJECT_KEY>`; status changes happen via
  **workflow transitions** (the adapter resolves a transition whose target matches the
  status name you pass).

## Status lifecycle

Canonical workflow phases → this org's real status names (from
`workspace.config.yaml: tracker.statuses`). Pass the **real name** to
`upsert-ticket-details.sh --status`.

| Phase (what the workflow means) | Real status name | Set by |
|---|---|---|
| `not_started`   | `<Not started>`   | product-owner on ticket creation |
| `in_progress`   | `<In progress>`   | ticket-kickoff, at the start of work |
| `ready_to_test` | `<Ready to test>` | developer at handoff (code repos) |
| `testing`       | `<Testing>`       | qa at test-design / during QA |
| `done`          | `<Done>`          | the build role after merge + distribute |

If a provider rejects a status (e.g. no Jira transition to it from the current state),
the adapter prints the available targets — pick the right real name and update the map
above so it matches your board.

## Notes

- **Reachability:** if the adapter errors (bad/missing token, network), treat the
  tracker as *unreachable* — proceed from inline context but loudly flag that status
  moves / comments did **not** persist (the dev-cycle does this automatically).
- **Improvement tickets:** non-blocking gate findings are filed with `/clarifying-ticket`,
  which creates a new ticket via this same adapter and returns the real new id.
