# Token-usage parsers

Two scripts that read the Claude Code JSONL transcripts under
`~/.claude/projects/<encoded-cwd>/` (where `<encoded-cwd>` is the project path
with every `/` turned into `-`) and report token usage + wall-clock span.

Each transcript file is **one agent session**. Run from the project root so the
scripts auto-resolve the transcript dir from `cwd`; override with `--project-dir`.

**Output is CSV** on stdout (header row, one row per agent/role, then a final
`TOTAL` / `TEAM TOTAL` row). Redirect to a file or pipe into a sheet:
`python3 parse_agent_usage.py --role development-planner > planner.csv`. The total
row's `span_seconds` is the true run window — per-row spans overlap, so don't sum
them.

> Shell note: if your zsh profile prints `setValueForKeyFakeAssocArray: _encode`
> lines, that's your startup profile, not these scripts — ignore it.

---

## `parse_team_usage.py` — one Agent Team mission, per role

Original script. Takes a **required team name** and reports per **role** for that
one mission (TeamCreate → TeamDelete). Matches only the new spawn format
``You're <Name>, <role>, on team `<team>` `` and **excludes the lead**
(orchestrator) on purpose — its tokens aren't cleanly bounded to the mission.

```bash
python3 parse_team_usage.py <team-name>                  # CSV to stdout
python3 parse_team_usage.py <team-name> > mission.csv     # save it
python3 parse_team_usage.py <team-name> --project-dir DIR
```

Use this for the canonical **"how much did this one team mission cost, per role"**
report. CSV columns: `name, role, turns, input, cache_write, cache_read, output,
mission, span_seconds`. The `TEAM TOTAL` row's `span_seconds` is the mission
wall-clock (create → delete).

---

## `parse_agent_usage.py` — every agent, auto-discovered

Sibling, broader. Scans **all** transcripts, classifies each, and reports per
agent. Needs no team name. Catches what the team script misses:

| | `parse_team_usage.py` | `parse_agent_usage.py` |
|---|---|---|
| Scope | one team (name required) | **all** agents, auto-discovered |
| Identity formats | new `on team \`...\`` only | new **+** old roll-call (`You are X, the …`) |
| Lead / orchestrator | skipped | included, `kind=lead` |
| Solo chats / `/skill` runs | ignored | included, labeled by opening prompt/command |
| Filters | — | `--team --role --name --kind --top --grep --latest` + `TARGET`s |

Classification per file:
- **teammate** — exactly one teammate identity (new or old roll-call format)
- **lead** — many quoted teammate identities (the orchestrator session)
- **solo** — no team identity (a direct chat or a `/skill` run), labeled by its
  opening `/command` or first prompt line

### Monitoring a single agent run (not a team)

For optimizing one agent you just ran, target it directly instead of scanning
everything — the CSV then has just that run's row (plus the TOTAL):

```bash
# the most-recently-active transcript — "the agent I just ran"
python3 parse_agent_usage.py --latest

# a specific transcript: path, filename, or 8-char id-prefix
python3 parse_agent_usage.py b720e21e
python3 parse_agent_usage.py ~/.claude/projects/<dir>/<id>.jsonl

# pin the run that mentions a ticket (regex over raw text), newest first
python3 parse_agent_usage.py --grep FM-9 --latest

# one role / one agent
python3 parse_agent_usage.py --role development-planner
```

Both scripts emit the same columns.

> **Subagents spawned via the Agent tool** (e.g. `@"development-planner (agent)"`)
> do **not** always get their own transcript file — in that case their tokens
> live inside the **parent chat session**, so `--latest` reports that whole
> session, not the subagent alone. For a clean per-role Mission number, run the
> agent as a **team teammate** (it gets its own file). Agents that *do* write
> their own file (team teammates, and solo `/skill` runs) report exactly.

### Flags

| Flag | Effect |
|---|---|
| `TARGET ...` | summarize these transcripts directly (path / filename / id-prefix); skips discovery |
| `--latest [N]` | the N most-recently-active transcripts (default 1) — "the agent I just ran" |
| `--grep PAT` | only transcripts whose raw text matches PAT (regex, ci) — e.g. `--grep FM-9` |
| `--team NAME` | only that team (substring, case-insensitive) |
| `--role ROLE` | only that role, e.g. `development-planner` (substring, ci) |
| `--name NAME` | only that agent name, e.g. `George` (substring, ci) |
| `--kind KIND` | `teammate` \| `lead` \| `solo` |
| `--top N` | only the N biggest agents by Mission tokens |
| `--project-dir DIR` | override the transcript dir |

All filters compose.

### Examples

```bash
# Every agent across all transcripts, biggest Mission first
python3 parse_agent_usage.py

# One team's members AND its lead
python3 parse_agent_usage.py --team fm8-pipeline

# Teammates only (matches parse_team_usage.py's scope — excludes lead)
python3 parse_agent_usage.py --team fm8-pipeline --kind teammate

# A single role / a single agent
python3 parse_agent_usage.py --role development-planner
python3 parse_agent_usage.py --name George --team fm8-pipeline

# Top 15, saved to a file
python3 parse_agent_usage.py --top 15 > top15.csv
```

---

## Reading the columns (both scripts)

- **mission** = `input + cache_write + output` — the genuinely *new* tokens that
  session. This is the number to compare across agents.
- **cache_read** = context re-sent every turn. Shown for transparency, **not**
  part of mission (it's already-counted context, and dominates raw totals).
- **span_seconds** = transcript wall-clock span *including idle*. Per-row spans
  overlap across agents, so **do not sum them** — the `TOTAL` / `TEAM TOTAL`
  row's `span_seconds` is the true run window.
