# CLAUDE.md — {{ORG_NAME}} Organization workspace

**Multi-repo workspace.** Nested repos are independent clones (own git history, remote, `CLAUDE.md`) — read a repo's own `CLAUDE.md` first, and confirm which repo you are in with `git rev-parse --show-toplevel` before any git op. Repos live under `products[].repos[]` in `workspace.config.yaml`; `mani list projects` · `mani exec --all '<cmd>'` · `mani run <task>` · `mani sync` clones missing ones.

⚠️ **Never read `.env` / `.env.*`** (any adapter's `scripts/*/.env`, or anything matched by the blanket `.env*` gitignore rule) — **except `.env.example`** templates. No `Read`, no `cat`/`grep`/`sed`/`head`/`tail`/`hcat` (nor any renamed reading verb), and no `bash -x`/`set -x` around code that sources one. Prove a var is set with `grep -q '^VAR=.\+' .env` — exit code only, never echo the value. Enforced by `pretool-env-guard.sh` at the root **and in every repo**.

## Configuration (read these first)

- `workspace.config.yaml` — source of truth, `@`-imported below. Keys in `workspace.config.example.yaml`, overrides in `.local.yaml`, ⚠️ comments in neither — the rule beside it.
- `CONTEXT.md` — glossary · `docs/adr/` — shape of the workspace (`0001`–`0015`).
- `docs/agents/cursor.md` — under **Cursor**, use the GENERATED mirror (`aiworks cursor`): author on the Claude side, never hand-edit `.cursor/`, open the `.code-workspace` **file**.
- `docs/agents/language.md` · `caveman.md` · `ponytail.md` · `voice.md` · `stagehand.md` — always-on conventions (summarized below).
- `docs/agents/issue-tracker.md` — tickets: adapter, status names, id format.
- `docs/agents/human-review.md` — a `Human:` review comment is blocking; a `Human:` **reply on an agent's own must-fix CLEARS it** — approve and advance.
- `docs/agents/loadtest-gate.md` — green load suite is only **half** a verdict (`suite_kind: load` must also beat base vs noise floor). **Every** test-suite gate **never fails open**: no receipt + result comment ⇒ *not run*.
- `docs/agents/pii-provenance.md` — egress masks PII only from sanctioned PRODUCTION reads (keyed hash); local/staging untouched.
- `docs/agents/submodules.md` · `plan-artifacts.md` · `worktree-gc.md` · `workflow-resume.md` · `doctor.md` — submodule ban · one plan/repo never committed · bare `gc` REPORTS · config frozen for a run · `aiworks doctor` (+ `--fix`).
- `docs/agents/figma.md` · `image-generation.md` · `diagram-generation.md` — gated (`enabled`, default OFF) · `headroom.md` — `hcat`, not `Read`/`cat`, for big data files.
- `scripts/k8s/README.md` — READ-ONLY k8s triage (`k8s_triage` MCP, `view`-only). ⚠️ `Bash(kubectl *)`/`Bash(gcloud *)` denied — ask for `!kubectl`.
- **Test env:** automated runs → **local**; staging is QA opt-in (`CYPRESS_ENV=staging`). Never hardcode. **Known false-reds:** per-repo `known_false_reds:` in config; also stale test DB, submodule drift, dual-formatter on generated files. Re-run scoped vs base. Estimating → fetch story points first (`/estimate-ticket`).

## Provider adapters

`scripts/vcs/` · `scripts/tracker/` · `scripts/notify/` · `scripts/observability/`. **Always use adapters — never call `gh`/`glab`/Notion/Jira/Slack/SigNoz API directly.** ⚠️ **Run a WRITER bare** — never in a pipe, `&&`, `;`, `$( )` or heredoc. Allow rules match the WHOLE command; compounds fall through and are denied **silently**. Readers and `--dry-run` may be piped. Enforced by `pretool-adapter-pipe-guard.sh`.

## Language, compression and code

Injected mechanically — this section is only what injections omit. If the language directive is missing, read the config; under `th`, **any `.md` you author is still English**. ⚠️ **Compression is OUTPUT: the first brief that spawns an agent is INPUT and goes in FULL** — that message is the agent's whole world; after that, caveman is style not content, so follow-up NEW facts stay complete. **Ponytail** = YAGNI for code (reuse, stdlib/native first) — stops at the repo's test suite, ticket AC, and adapters (`ponytail.md`).

## Speaking and showing

Per-person, off by default — what you put in a **reply**:

- **`VOICE[group]: <one line>`** — every finished turn. Groups `green` · `red` · `ship` · `needs-you` · `incident`. Say the **result**, never that you finished.
- **`SAY[group]: <one line>`** — mid-turn at `chattiness: max` only, with a tool call still to come; never tags a step you are about to take.
- **`SHOW: <target>`** — URL, `<repo>!<iid>`, ticket key, or repo-relative path — never a hand-built PR/MR URL. `~` focus phrase lands ON the thing.

## Notifications

**Ticket work — auto-post, never ask** when a workflow's code-review or ship step completes (PR/MR carries `tracker.ticket_prefix` in title or branch).

**Workspace/framework work — ASK first** (no ticket key). Report in chat and ask. Retract with `send.sh --delete <permalink>` if it mattered.

## DO NOT

Hook-enforced: **comments** in `workspace.config[.local].yaml` (`.claude/rules/workspace-config.md`) · create/edit/commit **inside a git submodule checkout** (`.claude/rules/submodules.md` — reading / `git -C <sub> checkout <ref>` fine) · `codegraph` without an **absolute** `-p $CLAUDE_PROJECT_DIR/<repo>` (`pretool-codegraph-guard.sh`; subcommand `query`).

## Product

{{PRODUCT_DESCRIPTION}}

**Stack:** <frontend / app stack> · <e2e testing stack>. Every repo's role, stack and green criterion is under `products:` in @workspace.config.yaml (cloned via generated `mani.d/<product>.yaml`).
