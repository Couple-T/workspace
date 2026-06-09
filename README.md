# Workspace template — multi-repo agent orchestration

A reusable, provider-agnostic copy of the multi-repo "product team" orchestration: a
flat team of Claude agents (CEO → CPO/CTO → planners → developer/QA → reviewers →
guardian/perf → documentor) that takes a ticket end-to-end across every repo it touches
— plan → build → pre-merge gates → PR/MR → review → merge → cross-repo integration →
distribute — driven by the `dev-cycle` workflow.

Everything organization-specific is swappable:

| Axis | Choices | Where configured |
|---|---|---|
| **VCS** | `github` (`gh`) · `gitlab` (`glab`) | `scripts/vcs/` adapter + `vcs.provider` |
| **Auto-merge** | `true` · `false` (+ per-repo override) | `vcs.auto_merge` + `products[].repos[].auto_merge` |
| **Plan approval** | auto · human-approve before build | `planning.auto_approve` (+ `--approve-plan`) |
| **Plan → HTML** | `true` · `false` | `planning.to_html` (write-interactive-docs) |
| **Tracker** | `notion` · `jira` (both shell, curl+jq) | `scripts/tracker/` adapter + `tracker.*` |
| **Quality gate** | `sonarqube` · `none` | `quality_gate.provider` + per-repo `guard` |
| **Distribution** | `firebase` · `none` · `custom` | per-repo `distribute` |
| **Repos / identity** | yours (just the URLs) | `workspace.config.yaml` `products[].repos[]` (`mani.d/` is generated) |

Adapters keep a **stable CLI surface** — skills/agents/workflows call them, never a
provider tool directly. To add a provider (Linear, Bitbucket, …), drop one new file
under `scripts/<axis>/` implementing the interface; nothing else changes.

## Layout

```
workspace.config.example.yaml   # the ONE config you fill in (org, providers, products+repo URLs)
CLAUDE.md                       # workspace instructions (templated)
mani.yaml + mani.d/<product>.yaml # repo registry — GENERATED from the config by aiworks
docs/agents/issue-tracker.md    # how agents read/write tickets
.claude/{agents,skills,workflows,hooks,settings.json}
scripts/vcs/      # github | gitlab PR/MR adapter
scripts/tracker/  # notion | jira ticket adapter
.superset/        # workspace setup/teardown (mani sync + .env seeding)
```

## Instantiate for a new org

1. **Copy** this directory to a new workspace repo (or use it as one).
2. **Config** — `cp workspace.config.example.yaml workspace.config.yaml` and fill it in:
   org name/product, `vcs.provider` + `vcs.auto_merge`, `tracker.provider` + `ticket_prefix`
   + `statuses`, `branch_model`, `quality_gate`, `planning` (`auto_approve` / `to_html`), and
   your repos — just add each repo's **URL** (+ `kind`) under `products[].repos[]`. That
   `products:` block is all you declare; `mani.d/` is generated from it.
3. **Tracker creds** — `cp scripts/tracker/.env.example scripts/tracker/.env`, set
   `TRACKER_PROVIDER` and that provider's block. Fill in
   `docs/agents/issue-tracker.md` (ids, status names).
4. **VCS** — `gh auth login` or `glab auth login`. Provider auto-detects from the
   `origin` remote; override with `scripts/vcs/.env` if needed.
5. **Onboard the repos** — `scripts/aiworks sync` reads `products[].repos[]` and sets each
   repo up end-to-end (generates `mani.d/<product>.yaml`, clones via mani, builds the codegraph
   index, installs skill packs, seeds hooks, scaffolds `CLAUDE.md` + `scripts/dev.sh`). It's
   idempotent — re-run any time; already-onboarded repos just SKIP. Then `mani list projects`
   to confirm.
6. **Workflow CONFIG block** — nothing to hand-edit. `.claude/workflows/dev-cycle.js` carries a
   `── CONFIG ──` mirror (the `REPOS` registry, `TICKET_PREFIX`, `AUTO_MERGE`, `AUTO_APPROVE_PLAN`,
   `PLAN_TO_HTML`, status names) only because Workflow scripts can't read the filesystem at
   runtime. `scripts/aiworks sync` — and every `add` / `remove` — **regenerates that block from
   `workspace.config.yaml` automatically**; run `scripts/aiworks config` yourself after any other
   hand-edit to the config. (The same FS-mirror idea applies to `prd.js` / `brd.js`.)
7. **De-brand pass** — replace the `{{ORG_NAME}}` / `{{PRODUCT_DESCRIPTION}}` placeholders
   in `CLAUDE.md`. The agents and workflows are already provider-agnostic; the
   **stack-specific** skills still carry example product/domain copy and tooling for the
   reference stack (Flutter app + Appium e2e) — adapt these to your stack/product:
   `.claude/skills/{coding-feature,coding-automate,plan-appium-automate}` and the
   `coding-feature/*.md` references. (Provider wiring — VCS/tracker — needs no further edits.)

### Manage repos — `aiworks`

`scripts/aiworks` is the workspace CLI. **`workspace.config.yaml` `products[].repos[]` is the
source of truth** — declare a repo's URL there and aiworks does the rest:

```sh
scripts/aiworks sync                          # onboard EVERY repo declared in the config
scripts/aiworks sync feeed-me --dry-run       # preview just one product (run nothing)
# or onboard one repo imperatively (it also writes the entry into the config):
scripts/aiworks add    --url git@github.com:your-org/feeedme-api.git --product backend --lang go --kind generic
scripts/aiworks remove feeedme-api            # deregister (keeps the clone)
scripts/aiworks remove feeedme-api --purge    # also delete the clone (refuses if dirty/unpushed)
scripts/aiworks config                        # regen the dev-cycle.js CONFIG from the config
```

**`aiworks config`** regenerates the `── CONFIG ──` mirror in `.claude/workflows/dev-cycle.js`
straight from `workspace.config.yaml` (Workflow scripts can't read the FS at runtime, so the
workflow needs an in-source copy). `sync` / `add` / `remove` all run it for you at the end —
call it directly only after hand-editing a non-repo field (ticket prefix, statuses, flags).

**`aiworks sync [<product>]`** is the fast path: it reads `products[].repos[]` from
`workspace.config.yaml` (optionally one product) and runs the full per-repo toolchain for each,
reading `url`/`kind`/`lang`/`distribute`/`path` straight from the config so you never retype
them. Since the toolchain is idempotent, repos already set up just report SKIP — so it's safe
to re-run after adding a URL. `-n`/`--dry-run` previews the per-repo commands without running.

**`aiworks add`** onboards ONE repo from flags (the imperative path) and also writes its entry
into the config. The **clone dir + mani key + the repo's `products[].repos[]` entry are the
repo name from the URL** (e.g. `feeedme-api/`). **`--product`** is its group under `products:`
(and the `mani.d/<product>.yaml` file — repos of one product share both; default = the repo
name), **`--kind`** drives the role/gate defaults, **`--lang`**/**`--distribute`**/**`--path`**
fill the optional fields (lang auto-detected from the repo anatomy if omitted).

Both write the repo under `products[].repos[]` in **`workspace.config.yaml`** (creating that
file from the example if missing; the entry stays minimal — `url` + `kind` + any optional
overrides) and generate its **`mani.d/<product>.yaml`** entry + `mani.yaml` `import:`, clone it
(`mani sync`), git-ignore it in the workspace `.gitignore` (and `agent_logs/` inside the repo),
build the codegraph index, and install the agent skill packs **at project scope** (karpathy
plugin **installed _and_ enabled** via `--scope project` — `install` alone only caches it, so it
also runs `plugin enable` to write `enabledPlugins` into the repo's `settings.json`, adding the
`karpathy-skills` marketplace first if needed; mattpocock skills installed one `--skill` per
call). Then, best-effort via `claude -p` (with live docker-style "glance" logs capped to a
rolling 5-line window, a per-step token report, and a per-step `--claude-timeout` so a hung step
can't stall the run): scaffolds a **CLAUDE.md** from the repo's anatomy (kept ≤60 lines, overflow into
`.claude/rules/<topic>.md` with frontmatter; if a CLAUDE.md already exists it asks
*regenerate / combine / skip*), runs the `/setup-matt-pocock-skills` skill, seeds a
**hardcoded, sonar-free hook + permission baseline** (`.claude/hooks` copied from the
workspace's own `.claude/hooks`; `settings.json` written from a built-in baseline and
jq-merged so existing plugin enablement is preserved), scaffolds a **`scripts/dev.sh`** shaped
by the repo's own toolchain, and runs the skill generator. It's idempotent — anything already
done/installed is skipped and reported; any missing tool (mani/codegraph/claude/npx/jq) is
skipped with a printed summary + manual follow-ups. **At the end it regenerates the
`dev-cycle.js` CONFIG block from `workspace.config.yaml`** (the `aiworks config` step) — the
workflow can't read the FS at runtime, so it keeps that in-source mirror, and you paste nothing.

**`aiworks remove <repo>`** is the inverse: it deregisters the repo from
`workspace.config.yaml` `products[].repos[]` (matched by the repo name in its URL; an emptied
product block is left for you to delete), from `mani.d/<product>.yaml` (deleting the file + its
`mani.yaml` import if that was the product's last repo), and from the workspace `.gitignore` —
leaving the clone in place unless you pass `--purge` (which refuses on a dirty/unpushed tree
unless `--force`). It then **regenerates the `dev-cycle.js` CONFIG block from
`workspace.config.yaml`** too, so the removed repo drops out of the workflow mirror automatically.
(Both commands have their own `-h`: `aiworks add -h`, `aiworks remove -h`.)

## Run it

```
/dev-cycle FM-12              # one ticket, end to end across every repo it touches
/dev-cycle FM-12 --dry-run    # stop before any merge/integration/distribute
/dev-cycle FM-12 --approve-plan  # proceed past the plan-approval gate (when planning.auto_approve is off)
```

## Verify the wiring (no destructive ops)

```sh
# tracker (after .env): reads should print plain text; writes preview with --dry-run
scripts/tracker/get-ticket-details.sh <KEY>
scripts/tracker/find-tickets.sh --query "<keyword>" --open            # dedup search
scripts/tracker/upsert-ticket-details.sh <KEY> --status "<your in-progress name>" --dry-run
scripts/tracker/upsert-ticket-details.sh new --title "TEST" --body-file spec.md --dry-run  # spec → body

# vcs: provider auto-detect + dry-run the commands
scripts/vcs/default-branch.sh
scripts/vcs/open-pr.sh --title "TEST" --dry-run

# workflows parse, adapters lint
node --check .claude/workflows/dev-cycle.js
bash -n scripts/vcs/*.sh scripts/tracker/*.sh
```

## Notes

- The `dev-cycle` collapses to the single-repo flow when a ticket touches one repo.
- **Auto-merge** (`vcs.auto_merge`, default `true`) controls whether the reviewed PR/MR is
  squash-merged automatically. Set it `false` (or override one repo with
  `products[].repos[].auto_merge: false`) to have the run open the PR/MR and run every reviewer,
  then STOP and leave it open for a human to merge — integration/distribute/close are skipped.
  `aiworks config` (run by add/remove/sync) mirrors the value into the `dev-cycle.js` CONFIG
  `AUTO_MERGE` constant for you. (`--dry-run` stops one
  step earlier — before the PR/MR is even merged-or-left; auto-merge off still merges nothing but
  *does* open + review the PR/MR.)
- **Plan approval** (`planning.auto_approve`, default `true`) gates the *planning* step the
  way auto-merge gates the *merge* step. Set it `false` to have the run produce the plan(s),
  then STOP for a human to review + approve before any build — re-run with `--approve-plan` to
  proceed. **Plan → HTML** (`planning.to_html`, default `false`): when on, each plan is also
  rendered to a self-contained interactive HTML (via write-interactive-docs) next to its
  markdown — useful for sharing the plan when approval is required. `aiworks config` mirrors both
  into the `dev-cycle.js` CONFIG (`AUTO_APPROVE_PLAN`, `PLAN_TO_HTML`) automatically.
- Quality-gate (SonarQube) and distribution (Firebase) are the reference impls; set
  `quality_gate.provider: none` and per-repo `distribute: none` to skip them.
- `scripts/tracker/README.md` and `scripts/vcs/README.md` document each adapter and how
  to add a provider.
