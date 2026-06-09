---
name: open-pr
description: Open a pull/merge request for the current ticket branch to its parent branch (feature/* → develop, fix/* → main, per workspace.config.yaml), titled "<KEY>: <title>". Uses the VCS adapter (github/gitlab). Use after QA has approved a ticket.
argument-hint: [ticket-number]
allowed-tools:
  - Bash(git *)
  - Bash(scripts/vcs/*)
  - Bash(scripts/tracker/*)
---

# Open PR

Ships an approved ticket as a pull/merge request through the **VCS adapter**
(`scripts/vcs/`), which targets `github` (`gh`) or `gitlab` (`glab`) — auto-detected
from the `origin` remote. Never call `gh`/`glab` directly.

## Preconditions

- QA has approved the ticket.
- You are on the ticket's work branch with all work committed.

## Steps

1. **Determine the base from the branch name** (branch model in `workspace.config.yaml`):
   - `feature/<KEY>` → base = `branch_model.feature_base` (default **`develop`**).
   - `fix/<KEY>` → base = `branch_model.fix_base` (default **`main`**).

2. **Resolve the ticket title** if not supplied:
   ```bash
   scripts/tracker/get-ticket-details.sh <KEY>   # first line is "<KEY> — <title>"
   ```

3. **Open (or reuse) the PR/MR** via the adapter — it pushes the branch, skips a
   duplicate, and prints the URL + `number=`:
   ```bash
   scripts/vcs/open-pr.sh \
     --base <base> --head <work_branch> \
     --title "<KEY>: <title>" \
     --body "<short summary of what changed + acceptance covered + Ticket: <url>>"
   ```

## Output

Return the PR/MR URL and number (printed by `open-pr.sh`). Do **not** merge here —
merging is the reviewer's / dependency-ordered step.
