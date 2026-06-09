export const meta = {
  name: 'dev-cycle',
  description: 'Full development cycle for one ticket — MULTI-REPO. Scopes which repos a ticket touches, runs each through plan→build→pre-merge gates→PR/MR→review in dependency WAVES, then merges upstream→downstream, runs the E2E integration gate against the merged app build, distributes, and summarizes. Provider-agnostic: VCS via scripts/vcs/ (github/gitlab), tracker via scripts/tracker/ (notion/jira). Pass the ticket number as args, e.g. "FM-12". A single-repo ticket collapses to a one-repo flow.',
  whenToUse: 'Run one <KEY> ticket end to end across every repo it touches — through per-repo merge, cross-repo integration, and distribution — with a single command.',
  phases: [
    { title: 'Scope', detail: 'cto: classify which repos the ticket touches + dependency order + whether an integration gate applies', model: 'opus' },
    { title: 'Kickoff', detail: 'per repo: development-planner runs /ticket-kickoff (app code) · qa-planner designs the BDD + Appium plan (e2e) → branch + in-progress + plan', model: 'opus' },
    { title: 'Build', detail: 'per repo, in dependency waves (∥ within a wave): the build role implements (developer TDD / qa-runner POM). No pre-PR gate — guardian/perf review on the OPEN PR/MR (Review). The e2e repo iterates SCOPED (`npm test -- <spec>`) then runs the ticket scope — its BDD + regression specs — before the PR/MR.', model: 'sonnet/opus' },
    { title: 'Open PR', detail: 'build role opens the PR/MR right AFTER build, BEFORE review, via scripts/vcs/open-pr.sh, so every reviewer comments on the open PR/MR. Open only, never merge.', model: 'sonnet' },
    { title: 'Review', detail: 'on the OPEN PR/MR: code-reviewer (standards+spec) + guardian (quality gate) + performance ALL review, commenting via scripts/vcs/pr-comment.sh, FREEZE-once-passed; dev fixes the combined batch; scoped re-review; round cap. SKIPPED for the e2e repo (no reviewers).', model: 'sonnet[1m]' },
    { title: 'Merge', detail: 'if vcs.auto_merge is on: each repo squash-merged UPSTREAM→DOWNSTREAM via scripts/vcs/merge-pr.sh so the web PR/MR is marked Merged, not Closed; each SHA recorded — by the code-reviewer (code repos) or the qa-runner (e2e, no reviewer). If auto-merge is off (global or per-repo) the reviewed PR/MR is left OPEN for a human and the run stops here.', model: 'sonnet[1m]' },
    { title: 'Integration', detail: 'qa-runner: run THIS ticket\'s scope against the MERGED app build — the ticket\'s BDD spec(s) + the ticket\'s regression scope (the dev\'s "⚠️ Regression request" recap), SCOPED via `npm test -- <specs>`, NOT the full suite. Single-case isolate to triage a red — the cross-repo join gate (skipped if no integration needed)', model: 'sonnet' },
    { title: 'Distribute', detail: 'per-repo: app → its configured distribution target (e.g. Firebase App Distribution)', model: 'sonnet' },
    { title: 'Summary', detail: 'documentor writes the run-summary + per-repo/role token table (summarize-workflow-performance)', model: 'haiku' },
  ],
}

// ──────────────────────────────────────────────────────────────────────────
// CONFIG  —  EDIT THIS BLOCK PER ORG.  Workflow scripts have NO filesystem access,
// so this is the workflow's own copy of workspace.config.yaml — keep the two in sync
// (tracker.ticket_prefix, tracker.statuses, branch_model, and the repo registry).
//
// TICKET_PREFIX — the ticket id prefix (drives the <PREFIX>-\d+ regex).
// STATUS        — canonical phase → the org's REAL status name (see issue-tracker.md);
//                 used wherever the workflow moves a ticket.
// REPOS         — one entry per repo the orchestration spans:
//   path        — dir relative to the workspace launch root
//   kind        — flutter-app | appium-e2e | generic (selects role behaviour)
//   base        — branch a ticket targets: { feature, fix }
//   plan/build/review — agentTypes. review:null ⇒ no code review (e2e repo); its PR/MR
//                 is merged by the build role (qa-runner) instead of a code-reviewer.
//   guard/perf  — whether the guardian (quality-gate) / performance gate applies.
//   green       — the "keep it green" check phrase used in build/fix prompts.
//   guardianFocus — repo-specific guardian checklist.
//   testSuite   — true for the repo that PROVIDES the cross-repo integration suite.
//   distribute  — 'firebase' | 'custom' | null  (how a merged build ships).
//   autoMerge   — OPTIONAL per-repo override of AUTO_MERGE (below). Omit to inherit.
// AUTO_MERGE — mirror of workspace.config.yaml `vcs.auto_merge`. true ⇒ the Merge phase
//   squash-merges automatically after review. false ⇒ the run opens + reviews the PR/MR
//   then STOPS, leaving it OPEN for a human (Integration / Distribute / close are skipped).
// (The examples below are GENERIC — replace ids/paths/kinds with your repos.)
// ──────────────────────────────────────────────────────────────────────────
const TICKET_PREFIX = 'FM'
const AUTO_MERGE = true // mirror of workspace.config.yaml vcs.auto_merge; per-repo override via REPOS[id].autoMerge
const STATUS = {
  not_started: 'Not started', in_progress: 'In progress',
  ready_to_test: 'Ready to test', testing: 'Testing', done: 'Done',
}
const REPOS = {
  'app': {
    path: 'app', kind: 'flutter-app',
    base: { feature: 'develop', fix: 'main' },
    plan: 'development-planner',
    build: 'developer', review: 'code-reviewer',
    guard: true, perf: true,
    green: 'lint + unit tests (via scripts/dev.sh)',
    guardianFocus: 'no hardcoded secrets/keys in source, dependency health, data-protection for personal data stored locally, least-privilege platform permissions, keeping sensitive data out of logs, safe deep-link handling',
    distribute: 'firebase',
  },
  'e2e': {
    path: 'e2e', kind: 'appium-e2e',
    base: { feature: 'main', fix: 'main' },
    plan: 'qa-planner',
    build: 'qa-runner', review: null, // QA repo: no code review — qa-runner merges its own PR/MR
    guard: false, perf: false,        // QA repo: no guardian/perf gate either
    green: 'the ticket BDD + regression specs (scoped `npm test -- <specs>`, POM) green on iOS + Android — the full-suite run is on-demand',
    testSuite: true,
    distribute: null,
  },
  // 'backend': {  // example — a service repo
  //   path: 'backend', kind: 'generic', base: { feature: 'develop', fix: 'main' },
  //   build: 'developer', review: 'code-reviewer', guard: true, perf: true,
  //   green: '<unit + integration tests>', guardianFocus: 'authz, secrets, input validation, event-schema compat, PII at rest/in transit', distribute: 'custom',
  //   autoMerge: false, // optional — leave THIS repo's PR/MR open for a human even when AUTO_MERGE is on
  // },
}

// ──────────────────────────────────────────────────────────────────────────
// Inputs
// ──────────────────────────────────────────────────────────────────────────
const rawArg = (typeof args === 'string' ? args : args?.ticket) || ''
// Tolerate stray flags/words in the arg string (e.g. "FM-10 --dry-run"): pull out
// the <PREFIX>-<n> token so the ticket never becomes "FM-10 --dry-run".
const TICKET_RE = new RegExp(`${TICKET_PREFIX}-\\d+`, 'i')
const ticket = (rawArg.match(TICKET_RE)?.[0] || rawArg).trim()
if (!ticket) throw new Error(`dev-cycle needs a ticket number, e.g. args: "${TICKET_PREFIX}-12"`)
const opt = typeof args === 'object' && args ? args : {}
const MAX_GATE_ROUNDS = opt.maxGateRounds || 3     // build↔gates loops, per repo
const MAX_REVIEW_ROUNDS = opt.maxReviewRounds || 3 // review↔fix loops, per repo
// DRY RUN — stop after the per-repo Build & gates phase: NO cross-repo Merge,
// Integration, or Distribute (no real squash-merge to the base branch, no distribution).
// Lets a run confirm build/gate behaviour safely. Set via "--dry-run" in the arg
// string or opt.dryRun.
const dryRun = /--dry-run\b/i.test(rawArg) || opt.dryRun === true

// Machine-readable marker prefixed on EVERY agent prompt so
// summarize-workflow-performance can attribute each transcript to a repo+role.
// Format the parser keys off: [dev-cycle FM-9 repo=app role=developer phase=build round=2]
const tag = (repo, role, phase, round) =>
  `[dev-cycle ${ticket} repo=${repo} role=${role} phase=${phase}${round ? ` round=${round}` : ''}]`

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────
const SCOPE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['ticket', 'type', 'repos'],
  properties: {
    ticket: { type: 'string' }, title: { type: 'string' },
    type: { type: 'string', enum: ['feature', 'bug', 'polish'] },
    tracker_reachable: { type: 'boolean' }, // false → scope could NOT read the live ticket via the adapter (writes won't persist this run)
    repos: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        required: ['repo'],
        properties: {
          repo: { type: 'string' },                                  // must be a key of REPOS
          depends_on: { type: 'array', items: { type: 'string' } },  // other repo ids it needs merged/built first
          summary: { type: 'string' },                               // what this repo must change for the ticket
        },
      },
    },
    integration: {
      type: 'object', additionalProperties: false,
      properties: {
        needed: { type: 'boolean' }, suite: { type: 'string' }, notes: { type: 'string' },
      },
    },
  },
}
const REPO_PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['repo', 'base_branch', 'work_branch', 'plan_path', 'summary'],
  properties: {
    repo: { type: 'string' }, title: { type: 'string' },
    type: { type: 'string', enum: ['feature', 'bug', 'polish'] },
    base_branch: { type: 'string' }, work_branch: { type: 'string' },
    figma_url: { type: ['string', 'null'] }, plan_path: { type: 'string' },
    summary: { type: 'string' }, acceptance: { type: 'array', items: { type: 'string' } },
  },
}
const DEV_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['work_branch', 'summary'],
  properties: {
    work_branch: { type: 'string' }, handoff_path: { type: 'string' },
    summary: { type: 'string' }, commits: { type: 'number' },
    fixed: { type: 'array', items: { type: 'string' } },
  },
}
// Guardian & performance share one gate shape: blocking findings stop the merge,
// non-blocking ones are filed as Improvement tickets and do NOT block.
const GATE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['passed'],
  properties: {
    passed: { type: 'boolean' }, conclusion: { type: 'string' },
    blocking: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string' }, scope: { type: 'string' },
          severity: { type: 'string' }, evidence: { type: 'string' },
        },
      },
    },
    improvements_filed: { type: 'array', items: { type: 'string' } },
  },
}
const PR_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['pr_url'],
  properties: { pr_url: { type: 'string' }, pr_number: { type: ['number', 'string'] } },
}
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['approved'],
  properties: {
    approved: { type: 'boolean' }, conclusion: { type: 'string' },
    comments: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          file_line: { type: 'string' }, issue: { type: 'string' }, severity: { type: 'string' },
        },
      },
    },
  },
}
const MERGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['merged'],
  properties: {
    merged: { type: 'boolean' }, base: { type: 'string' },
    sha: { type: 'string' }, note: { type: 'string' },
  },
}
const INTEGRATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['passed'],
  properties: {
    passed: { type: 'boolean' }, conclusion: { type: 'string' },
    failures: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: {
          case: { type: 'string' }, platform: { type: 'string' }, evidence: { type: 'string' },
        },
      },
    },
  },
}
const DIST_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['distributed'],
  properties: {
    distributed: { type: 'boolean' }, release_link: { type: ['string', 'null'] },
    build: { type: 'string' }, note: { type: 'string' },
  },
}
const CLOSE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['closed'],
  properties: {
    closed: { type: 'boolean' }, // true ONLY after Status → Done actually persisted
    note: { type: 'string' },
  },
}
const SUMMARY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary_path'],
  properties: {
    summary_path: { type: 'string' }, run_total_output: { type: ['number', 'string', 'null'] },
    token_table_appended: { type: 'boolean' }, // true ONLY if the parser ran and its table was appended (⑤)
    note: { type: 'string' },
  },
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
// Coarse per-phase output-token attribution (the faithful per-repo/role table
// comes from /summarize-workflow-performance afterward). spent() is shared.
const spend = []
let mark = budget.spent()
let trackerReachable = true // set by the scope stage; false → tracker writes (status/comments/improvement tickets) won't persist this run
const tick = (label) => { const now = budget.spent(); spend.push({ label, out: now - mark }); mark = now }

// agent() THROWS when a subagent never returns StructuredOutput (after the engine's
// retries/nudges) — an uncaught throw aborts the ENTIRE run. safeAgent swallows that to
// null so the caller can degrade gracefully (re-loop, or halt THIS repo with a clean
// status) instead of killing the whole run. Generalizes the build-agent null-guard to
// every fix/review/merge/etc. agent() call. (Finding ⑥, 2026-06-07.)
const safeAgent = async (prompt, opts) => {
  try { return await agent(prompt, opts) }
  catch (e) {
    log(`⚠️ agent did not converge${opts?.label ? ` (${opts.label})` : ''} — treated as null: ${String(e?.message || e).slice(0, 140)}`)
    return null
  }
}

// Topologically sort the scoped repo plans into dependency WAVES. Repos in the
// same wave have no interdependency and run in parallel; waves run in sequence.
// Edges referencing out-of-scope repos are ignored. A cycle/unmet-dep is not
// fatal: the remaining repos are emitted as one final wave so the run proceeds.
function toWaves(plans) {
  const ids = new Set(plans.map((p) => p.repo))
  const deps = {}
  plans.forEach((p) => { deps[p.repo] = (p.depends_on || []).filter((d) => ids.has(d) && d !== p.repo) })
  const done = new Set(); const out = []
  while (done.size < plans.length) {
    const wave = plans.filter((p) => !done.has(p.repo) && deps[p.repo].every((d) => done.has(d))).map((p) => p.repo)
    if (!wave.length) { out.push(plans.filter((p) => !done.has(p.repo)).map((p) => p.repo)); break }
    wave.forEach((r) => done.add(r)); out.push(wave)
  }
  return out
}

// Required closing step — runs the per-repo/role usage parser over the run's
// transcripts and writes the run-summary file. This agent's prompt intentionally
// OMITS the [dev-cycle …] marker so the parser does NOT count the recorder itself.
async function writeSummary(runStatus, runResult) {
  phase('Summary')
  const s = await safeAgent(
    `Run-recorder for the development-cycle workflow on ${ticket} (final status: ${runStatus}). You HAVE the Write tool + a narrow Bash perm for the usage parser — actually PRODUCE the file, do not just describe it.
1. Compose a short narrative: repos touched, per-repo gate/review rounds, merge order + SHAs, integration-gate result, PR/MR + distribution links — from this run result: ${JSON.stringify(runResult).slice(0, 3000)}.
${trackerReachable ? '' : '2. ⚠️ The tracker was UNREACHABLE this run — put a prominent note at the TOP that ticket Status moves, comments, and /clarifying-ticket improvement tickets did NOT persist (best-effort only).\n'}3. WRITE that narrative to agent_logs/${ticket}-DEV-CYCLE-SUMMARY.md with the Write tool (the agent_logs dir exists).
4. As the LAST step, RUN:  python3 .claude/skills/summarize-workflow-performance/scripts/parse_workflow_usage.py ${ticket}  — then Write the file AGAIN as the narrative PLUS the parser's Markdown output appended VERBATIM under a "## Token & time usage" heading. If the parser exits non-zero (no transcripts), write that fact under the heading — never a placeholder.
Return summary_path (the file you actually wrote + confirmed exists via Read), token_table_appended:true ONLY if you ran the parser and appended its real table, and a one-line note.`,
    { agentType: 'documentor', phase: 'Summary', label: `summary:${ticket}`, schema: SUMMARY_SCHEMA },
  )
  tick('summary')
  if (s && s.token_table_appended === false) log('⚠️ Summary file written but the token/time table was NOT appended (parser empty/failed) — run parse_workflow_usage.py manually.')
  log(`Run summary: ${s?.summary_path ?? '(summary agent did not converge)'}`)
  return s ?? { summary_path: null, token_table_appended: false, note: 'summary agent did not converge' }
}

// ──────────────────────────────────────────────────────────────────────────
// PER-REPO PIPELINE  —  build ↔ gates ↔ PR ↔ review for ONE repo, up to
// "approved, ready to merge". This is the OLD single-repo flow, parameterized by
// the repo descriptor. Does NOT merge (merge is the ordered, cross-repo phase).
// Returns { repo, status:'ready'|'build-unresolved'|'pr-unresolved'|'review-unresolved', ... }.
// NOTE: never calls phase() — multiple of these run in parallel within a wave, so
// every agent() sets opts.phase explicitly to avoid racing the global phase state.
// ──────────────────────────────────────────────────────────────────────────
async function runRepoPipeline(rp, desc) {
  const R = rp.repo
  const inRepo = `Work in the ${R} repo (cwd ${desc.path}/).`

  // BUILD — initial implementation from the plan. Code repos: developer (TDD).
  // The appium e2e repo: qa-runner branches, implements POM, iterates SCOPED, then
  // runs the ticket scope (BDD + regression specs) before handoff (full-suite run is
  // on-demand, not here) — and never opens/merges the PR here.
  const buildPrompt = desc.kind === 'appium-e2e'
    ? `${tag(R, desc.build, 'build', 0)} Build the E2E automation for ${ticket} in the ${R} repo from the plan at ${rp.plan_path} (behaviour reference: agent_logs/${ticket}-testcases.md). ${inRepo}
1. BRANCH ONLY — /self-control-gitflow start ${ticket} → create ${rp.work_branch} off ${rp.base_branch}. Do NOT finish/merge (the workflow opens + merges the PR later, in order).
2. IMPLEMENT — strictly POM via /coding-automate ${ticket} (Page Objects in pages/, specs in tests/). Commit each slice conventionally (Refs ${ticket}).
3. ITERATE SCOPED, not full — while building/fixing one feature run only its spec(s) on the SAME command: \`npm test -- <spec-token…>\`. Do NOT run the whole suite on every change.
4. BOUNDED TRIAGE on a break — re-run the broken case ONCE (\`PLATFORM=<failing-platform> npm test -- <spec-token>\` + ONE \`npm run why\`), classify it, then ACT and MOVE ON — do not keep digging:
   • automation/selector/flake → fix the spec/Page Object and re-run that one case until green.
   • genuine APP/feature bug → log it to agent_logs/${ticket}-bugs.md and comment it ON THE TICKET (scripts/tracker/add-ticket-comment.sh) with platform + repro, then move on. You are in the ${R} repo ONLY — NEVER read, reason about, or edit the app repo's source; root-causing app behaviour is the developer's job at the Integration gate, not yours.
   • a brand-new feature spec red only because the app change is not merged yet is EXPECTED — note it and move on; it validates at the Integration gate against the merged build, not here.
5. SCOPED RUN before handoff — once your automation is correct, run THIS ticket's scope ONCE on iOS AND Android: \`npm test -- <spec-token…>\` covering (a) the ticket's own BDD spec(s) you built + (b) the ticket's regression spec(s) from the "**Regressions**" block at the bottom of agent_logs/${ticket}-testcases.md (the dev's "⚠️ Regression request" — the SOLE source of regression scope; if that block is absent there is NO regression scope, so run just the ticket's BDD spec(s)). Do NOT run the whole suite (\`npm test\` with no args): the full-suite run is ON-DEMAND only (the user triggers a full run separately), not part of this flow. ${desc.green} is the target — but a scoped red caused ONLY by reported app bugs or expected pre-merge reds is a VALID handoff state; record it, do not chase it.
6. RETURN CONTRACT (mandatory) — /handoff, set Status → ${STATUS.testing} (via /update-ticket), then END by calling StructuredOutput with the DEV_SCHEMA result: work_branch=${rp.work_branch}, a one-line summary of the suite state (green, or red + the bug ids you reported), commit count, and in "fixed" the spec/Page Object files you touched. A red-but-reported suite is SUCCESS for this phase — never withhold the structured result to investigate further, and never exceed the step-4 triage budget.`
    : `${tag(R, desc.build, 'build', 0)} Implement ${ticket} in the ${R} repo on branch ${rp.work_branch} from the plan at ${rp.plan_path}. ${inRepo} Run /karpathy-guidelines, then build it slice-by-slice with /tdd, commit each slice conventionally (Refs ${ticket}), keep ${desc.green}. When the Definition of Done is met, /handoff and set Status → ${STATUS.ready_to_test} (via /update-ticket).`
  let dev = await safeAgent(
    buildPrompt,
    { agentType: desc.build, phase: 'Build', label: `build:${ticket}:${R}`, schema: DEV_SCHEMA },
  )
  // A null build means the agent never produced a structured handoff — for the appium
  // e2e repo this is the "runaway" failure (qa-runner kept root-causing a red instead of
  // reporting + returning). Don't throw on dev.summary and abort the wave with a confusing
  // error; return a clean diagnostic status and stop this repo here.
  if (!dev) {
    log(`⚠️ [${R}] build did not converge to a structured handoff (likely ran away triaging a red) — left In progress; downstream skipped.`)
    return { repo: R, status: 'build-unresolved', plan: rp }
  }
  log(`[${R}] initial build: ${dev.summary?.slice(0, 70) ?? 'done'}`)
  tick(`${R}:build`)

  // OPEN PR — open the PR/MR right after build so EVERY reviewer comments on the OPEN
  // PR/MR via the VCS adapter. Code repos via /open-pr; the e2e repo via the adapter
  // directly. Open ONLY — never merge (the ordered cross-repo Merge phase merges).
  const openPrPrompt = desc.kind === 'appium-e2e'
    ? `${tag(R, desc.build, 'open-pr')} The ticket scope (BDD + regression specs) for ${ticket} is green in ${R}. ${inRepo} Ensure git status is clean, then open the PR/MR with the VCS adapter (it pushes ${rp.work_branch} for you): \`scripts/vcs/open-pr.sh --base ${rp.base_branch} --head ${rp.work_branch} --title "${ticket}: ${rp.title ?? '<Task name>'}" --body "<what was automated + the scoped (ticket BDD + regression) green evidence>"\`. Do NOT merge it — the workflow squash-merges in dependency order. Return the PR/MR URL (pr_url) + number (the adapter prints \`number=<n>\`).`
    : `${tag(R, desc.build, 'open-pr')} ${ticket} is built in ${R} — open the PR/MR now so the reviewers (code-reviewer + guardian + performance) can review it on the host. ${inRepo} Ensure git status is clean (commit any stray artifact), then run /open-pr ${ticket} to open the PR/MR for ${rp.work_branch} → ${rp.base_branch}, titled "${ticket}: ${rp.title ?? '<Task name>'}". Do NOT merge it. Return the PR/MR URL + number.`
  const pr = await safeAgent(
    openPrPrompt,
    { agentType: desc.build, phase: 'Open PR', label: `open-pr:${ticket}:${R}`, schema: PR_SCHEMA },
  )
  if (!pr) {
    log(`⚠️ [${R}] open-PR did not converge — left for human review.`)
    return { repo: R, status: 'pr-unresolved', plan: rp }
  }
  log(`[${R}] opened PR: ${pr.pr_url}`)
  tick(`${R}:open-pr`)

  // REVIEW — code-reviewer + guardian + performance ALL review the OPEN PR/MR, each
  // commenting via the VCS adapter (never the tracker). FREEZE-once-passed: a reviewer
  // that verdicts passed/approved is frozen and NOT re-reviewed in later rounds — only
  // the still-open reviewers re-run. The developer fixes the combined batch on the
  // PR/MR; later rounds re-review only the changed scope; round-capped. A crashed
  // reviewer is INCONCLUSIVE (re-runs, never a silent pass). The e2e repo has no
  // reviewers → it is ready as soon as the PR/MR is open.
  const reviewers = [
    desc.review && { key: 'review', role: desc.review, schema: REVIEW_SCHEMA, passed: (r) => r?.approved === true, open: (r) => r?.comments?.length || 0 },
    desc.guard && { key: 'guard', role: 'guardian-engineer', schema: GATE_SCHEMA, passed: (r) => r?.passed === true, open: (r) => r?.blocking?.length || 0 },
    desc.perf && { key: 'perf', role: 'performance-engineer', schema: GATE_SCHEMA, passed: (r) => r?.passed === true, open: (r) => r?.blocking?.length || 0 },
  ].filter(Boolean)
  if (!reviewers.length) {
    log(`[${R}] no reviewers (QA repo) — ready to merge.`)
    return { repo: R, status: 'ready', plan: rp, pr, reviewRound: 0, verdict: {}, build: { summary: dev.summary, fixed: Array.isArray(dev.fixed) ? dev.fixed : [] } }
  }

  const verdict = {}, done = {}
  let reviewRound = 0, fixPasses = 0, lastFixed = []
  while (reviewRound < MAX_REVIEW_ROUNDS) {
    reviewRound++
    const isRetest = fixPasses > 0
    const changed = lastFixed.length ? ` Changed areas from the last fix pass: ${lastFixed.join('; ')}.` : ''
    const scopeNote = isRetest
      ? `Scoped re-review (round ${reviewRound}): review ONLY the files/areas changed in the last fix pass,${changed} confirm the previously-flagged items are resolved, and check those changes introduced nothing new.`
      : `Full review (round ${reviewRound}): review the whole change set and report every must-fix item together in one batch.`
    const onPr = `the OPEN PR/MR ${pr.pr_url} (number ${pr.pr_number ?? '?'}; ${rp.work_branch} → ${rp.base_branch}). ${inRepo} ${scopeNote} Post each must-fix as a comment ON THE PR/MR at the specific file:line via \`scripts/vcs/pr-comment.sh ${pr.pr_number ?? '<number>'} --path <file> --line <n> --body "<comment>"\` — NEVER on the tracker.`
    const promptFor = (rv) =>
      rv.key === 'review'
        ? `${tag(R, rv.role, 'review', reviewRound)} Review ${onPr} Run /review (standards + spec) against the target. Return approved:true ONLY when every must-fix comment is resolved and the diff meets the bar; otherwise approved:false with the open comments.`
        : rv.key === 'guard'
          ? `${tag(R, rv.role, 'review', reviewRound)} Quality-gate (static-analysis) review of ${ticket} in ${R} on ${onPr} Run the workspace's configured quality-gate tool (workspace.config.yaml: quality_gate.provider — SonarQube via the mcp__sonarqube tools by default: quality-gate status + issues + security hotspots; if the provider is 'none', skip the scan and pass). You summarize the scanner's output, not author a security review. For each BLOCKING issue/hotspot post a PR/MR comment (rule + file:line + remediation) and list it under "blocking"; as a light secondary pass sanity-check this repo's sensitive spots against the scanner output: ${desc.guardianFocus}. Lower-severity findings are YOURS to file: for EACH one you report, create the Improvement ticket YOURSELF by invoking /clarifying-ticket (Mode A — pass the finding + "source ${ticket}"), and put the REAL <KEY> it returns (with the title) into improvements_filed — NEVER a placeholder like "<PREFIX>-pending". /clarifying-ticket DEDUPS against the board first (scripts/tracker/find-tickets.sh): if the finding (same scope + root cause) is already tracked it returns that EXISTING <KEY> — record that one instead and NEVER file a second ticket for it; also don't re-file findings you already filed earlier in this same run. Whoever reports the topic owns the ticket; do not defer it to a human. If the tracker is unreachable, note that in the entry instead of a fake number. Filing is non-blocking — it must never hold up this gate. passed:true only when the quality gate is green (or the provider is 'none'). Return the structured gate result.`
          : `${tag(R, rv.role, 'review', reviewRound)} Performance review of ${ticket} in ${R} on ${onPr} Profile the changed flows with this repo's profiling tooling (e.g. for a Flutter app every profiling command goes through scripts/perf.sh, never raw flutter/dart: perf.sh build --profile, perf.sh run --profile + perf.sh devtools); measure jank, startup, memory, rebuild storms, unbounded lists, costly/unindexed queries; mandatory animations stay 60fps. For each CRITICAL regression post a PR/MR comment WITH the measurement as evidence and list it under "blocking". Non-blocking optimizations are YOURS to file: for EACH one you report, create the Improvement ticket YOURSELF by invoking /clarifying-ticket (Mode A — pass the finding + "source ${ticket}"), and put the REAL <KEY> it returns (with the title) into improvements_filed — NEVER a placeholder like "<PREFIX>-pending". /clarifying-ticket DEDUPS against the board first (scripts/tracker/find-tickets.sh): if the finding (same scope + root cause) is already tracked it returns that EXISTING <KEY> — record that one instead and NEVER file a second ticket for it; also don't re-file findings you already filed earlier in this same run. Whoever reports the topic owns the ticket; do not defer it to a human. If the tracker is unreachable, note that in the entry instead of a fake number. Filing is non-blocking — it must never hold up this gate. passed:true only with zero blocking regressions. Return the structured gate result.`

    const openReviewers = reviewers.filter((rv) => !done[rv.key])
    reviewers.filter((rv) => done[rv.key]).forEach((rv) => log(`[${R}] review round ${reviewRound}: ${rv.key} already PASSED — frozen, not re-reviewed.`))
    const results = await parallel(openReviewers.map((rv) => () => agent(promptFor(rv), { agentType: rv.role, phase: 'Review', label: `${rv.key}:${ticket}:${R}#${reviewRound}`, schema: rv.schema })))
    results.forEach((r, i) => { verdict[openReviewers[i].key] = r })
    openReviewers.forEach((rv) => { if (rv.passed(verdict[rv.key])) done[rv.key] = true })

    const crashed = openReviewers.filter((rv) => verdict[rv.key] == null).map((rv) => rv.key)
    const openFindings = openReviewers.reduce((n, rv) => n + (done[rv.key] || verdict[rv.key] == null ? 0 : rv.open(verdict[rv.key])), 0)
    log(`[${R}] review round ${reviewRound}${isRetest ? ' (scoped)' : ' (full)'}: ${reviewers.map((rv) => `${rv.key} ${done[rv.key] ? 'PASS' : crashed.includes(rv.key) ? 'ERRORED' : `${rv.open(verdict[rv.key])} open`}`).join(', ')}`)
    tick(`${R}:review#${reviewRound}`)

    // Converge ONLY when EVERY reviewer has an explicit pass/approve (freeze-once-passed).
    if (reviewers.every((rv) => done[rv.key])) break
    if (reviewRound >= MAX_REVIEW_ROUNDS) {
      const why = crashed.length ? `${crashed.join('+')} reviewer ERRORED (inconclusive)` : 'open findings'
      log(`⚠️ [${R}] hit MAX_REVIEW_ROUNDS (${MAX_REVIEW_ROUNDS}) with ${why} — NOT merge-ready; PR left open for human review.`)
      return { repo: R, status: 'review-unresolved', plan: rp, pr, reviewRound, verdict, crashed }
    }
    // A crashed reviewer with no findings to fix → skip the dev pass, just re-run it next round.
    if (openFindings === 0) {
      log(`[${R}] no findings to fix — re-running inconclusive reviewer(s) next round: ${crashed.join(', ') || 'none'}.`)
      continue
    }

    // Developer fixes the WHOLE combined batch (every open reviewer's PR comments) in ONE pass, pushing to the PR.
    const fix = await safeAgent(
      `${tag(R, desc.build, 'pr-fix', reviewRound)} PR/MR review-fix batch for ${ticket} in ${R} (round ${reviewRound}) on ${rp.work_branch}, PR/MR ${pr.pr_url} (number ${pr.pr_number ?? '?'}). ${inRepo} Read ALL open review comments on the PR/MR (code-reviewer + guardian + performance) via \`scripts/vcs/pr-comments.sh ${pr.pr_number ?? '<number>'}\`. Fix the WHOLE batch in this single pass: reproduce with a failing test first where applicable (/tdd), fix to green, commit (fix(…) Refs ${ticket}), and push (git push). Reply on each resolved comment via \`scripts/vcs/pr-comment.sh ${pr.pr_number ?? '<number>'} --body "<reply>"\` so the reviewers can re-check. Keep ${desc.green}. In the returned "fixed" array, list the files/areas you changed — reviewers re-review ONLY that scope next round.`,
      { agentType: desc.build, phase: 'Review', label: `pr-fix:${ticket}:${R}#${reviewRound}`, schema: DEV_SCHEMA },
    )
    if (fix) fixPasses++
    lastFixed = Array.isArray(fix?.fixed) ? fix.fixed : []
    log(`[${R}] review-fix round ${reviewRound}: ${fix?.summary?.slice(0, 60) ?? 'done'}${lastFixed.length ? ` (scope: ${lastFixed.length})` : ''}`)
    tick(`${R}:pr-fix#${reviewRound}`)
  }

  return { repo: R, status: 'ready', plan: rp, pr, reviewRound, verdict, build: { summary: dev.summary, fixed: Array.isArray(dev.fixed) ? dev.fixed : [] } }
}

// ──────────────────────────────────────────────────────────────────────────
// DISPATCHER
// ──────────────────────────────────────────────────────────────────────────

// 1. SCOPE — which repos does this ticket touch, and in what dependency order?
phase('Scope')
const scope = await safeAgent(
  `${tag('all', 'cto', 'scope')} You are the scoping stage for ${ticket}. Read the ticket via the tracker adapter (\`scripts/tracker/get-ticket-details.sh ${ticket}\`, + \`get-ticket-comments.sh\`) and decide which of the workspace's repos it requires changes in: ${Object.keys(REPOS).join(', ')} (only these are registered). For each touched repo return { repo, depends_on (other touched repo ids that must be built/merged first — typically a backend → app → e2e order), summary (what that repo must change) }. Set integration.needed:true when the change should be validated end-to-end by the E2E suite against the app build. Most tickets touch ONLY the app repo — if so, return just that one repo. Also set tracker_reachable: true ONLY if the adapter actually returned the live ticket this call — set it false if the tracker was unreachable and you proceeded from inline/contextual info (the run then loudly flags that Status moves, comments, and improvement tickets did NOT persist). Return the structured scope.`,
  { agentType: 'cto', phase: 'Scope', label: `scope:${ticket}`, schema: SCOPE_SCHEMA },
)
if (!scope) throw new Error(`dev-cycle: scope stage did not converge for ${ticket}`)
trackerReachable = scope.tracker_reachable !== false
if (!trackerReachable) log('⚠️ TRACKER UNREACHABLE — ticket Status moves, comments, and /clarifying-ticket improvement tickets will NOT persist this run; all ticket-tracking is best-effort. Flagged in the run result + summary.')
const scoped = (scope.repos || []).filter((r) => REPOS[r.repo])
if (!scoped.length) throw new Error(`Scope returned no known repos for ${ticket} (got: ${JSON.stringify(scope.repos)})`)
log(`Scope ${ticket} (${scope.type}): ${scoped.map((r) => r.repo).join(', ')}${scope.integration?.needed ? ' + integration gate' : ''}`)
tick('scope')

// 2. KICKOFF — per touched repo (parallel). Code repos: development-planner runs
//    /ticket-kickoff (branch + In progress + plan). The appium e2e repo: qa-planner
//    designs the BDD + Appium plan and does NOT branch (qa-runner branches at build).
phase('Kickoff')
const branchKind = scope.type === 'bug' ? 'fix' : 'feature' // polish rides the feature flow
const plans = (await parallel(scoped.map((r) => () => {
  const desc = REPOS[r.repo]
  const planner = desc.plan
  const baseBranch = desc.base[branchKind]
  const workBranch = `${branchKind}/${ticket}`
  const slice = r.summary || 'see ticket'
  const prompt = desc.kind === 'appium-e2e'
    ? `${tag(r.repo, planner, 'kickoff')} Kickoff ${ticket} for the ${r.repo} repo (cwd ${desc.path}/) — the E2E TEST repo. Run your planning chain: /plan-testcases ${ticket} (user-voice BDD Given/When/Then for this ticket), /update-ticket (publish the plan + Status → ${STATUS.testing}), then /plan-appium-automate ${ticket} (map it to this repo's Page Object Model — Page Objects/specs to add or reuse, selectors, automatable vs manual). Do NOT create a git branch — the qa-runner branches at build time. Return the structured repo plan with repo=${r.repo}, type=${scope.type}, base_branch=${baseBranch}, work_branch=${workBranch} (the branch the runner will create), plan_path=agent_logs/${ticket}-appium-plan.md, and the acceptance/summary for this slice (${slice}).`
    : `${tag(r.repo, planner, 'kickoff')} Kickoff ${ticket} for the ${r.repo} repo (cwd ${desc.path}/). Run /ticket-kickoff ${ticket} to fetch + classify the ticket, move it to ${STATUS.in_progress}, and create the work branch IN THIS REPO (base: ${desc.base.feature} for features, ${desc.base.fix} for fixes). Comprehend the ticket for this repo's slice (${slice}), verify the design screen if any, and write the implementation plan to agent_logs/development-planner/${ticket}-${r.repo}-plan.md (git-ignored). Return the structured repo plan.`
  return agent(prompt, { agentType: planner, phase: 'Kickoff', label: `kickoff:${ticket}:${r.repo}`, schema: REPO_PLAN_SCHEMA })
}))).filter(Boolean)
// carry the dependency edges from scope onto the plans
plans.forEach((p) => { p.depends_on = (scoped.find((s) => s.repo === p.repo)?.depends_on) || [] })
const waveList = toWaves(plans)
log(`Plan ${ticket}: ${plans.map((p) => `${p.repo}@${p.work_branch}→${p.base_branch}`).join(', ')}`)
log(`Waves: ${waveList.map((w) => `[${w.join(', ')}]`).join(' → ')}`)
tick('kickoff')

// 3. BUILD → OPEN PR → REVIEW — per repo, in dependency waves (∥ within a wave).
// Reviewers (code-reviewer + guardian + performance) all review the OPEN PR.
phase('Build')
const repoResults = {}
let aborted = null
for (const wave of waveList) {
  if (aborted) break
  const res = await parallel(wave.map((id) => () => runRepoPipeline(plans.find((p) => p.repo === id), REPOS[id])))
  res.forEach((r, i) => { if (r) repoResults[wave[i]] = r })
  const failed = wave.filter((id) => !repoResults[id] || repoResults[id].status !== 'ready')
  if (failed.length) {
    aborted = failed
    log(`⚠️ ${failed.join(', ')} did not reach 'ready' — stopping; downstream waves skipped.`)
  }
}
if (aborted) {
  const summary = await writeSummary('repo-unresolved', { ticket, aborted, repoResults })
  return { ticket, status: 'repo-unresolved', aborted, repoResults, summary, spend }
}

// DRY RUN stop — every scoped repo reached 'ready'. Stop BEFORE the cross-repo Merge
// so nothing irreversible happens (no squash-merge, no integration gate, no distribution).
if (dryRun) {
  log(`🧪 DRY RUN — all scoped repos reached 'ready'; stopping before Merge/Integration/Distribute (no real merge, no distribution). Per-repo: ${waveList.flat().map((id) => `${id}=${repoResults[id]?.status}`).join(', ')}.`)
  const summary = await writeSummary('dry-run', { ticket, repos: waveList.flat(), repoResults })
  return { ticket, status: 'dry-run', dryRun: true, repoResults, summary, spend }
}

// 4. MERGE — ordered upstream → downstream (sequential), record each SHA.
// Gated by auto-merge (workspace.config.yaml vcs.auto_merge, per-repo override via
// REPOS[id].autoMerge): when a repo opts OUT, its reviewed PR/MR is left OPEN for a
// human and the run stops here (downstream merges + Integration + Distribute + close
// all depend on this merge), exactly like a dry-run but with real, reviewed PRs.
phase('Merge')
const mergeOrder = waveList.flat()
const merges = {}
for (const id of mergeOrder) {
  const rr = repoResults[id], desc = REPOS[id], rp = rr.plan
  if ((desc.autoMerge ?? AUTO_MERGE) === false) {
    merges[id] = { merged: false, base: rp.base_branch, note: 'auto-merge disabled — PR/MR left open for a human', pr: rr.pr?.pr_url }
    log(`⏸️ [${id}] auto-merge disabled — PR/MR left OPEN for human merge: ${rr.pr?.pr_url ?? '(see run)'}. Stopping before downstream merge/integration/distribute.`)
    const summary = await writeSummary('merge-skipped', { ticket, mergeOrder, repoResults, merges })
    return { ticket, status: 'merge-skipped', haltedAt: id, repoResults, merges, summary, spend }
  }
  const merger = desc.review || desc.build // QA repo (no reviewer): the qa-runner merges its own PR
  const mergePreamble = desc.review
    ? `You approved the PR/MR for ${ticket} in ${id} (${rr.pr.pr_url}). The squash-merge is YOUR exclusive gate.`
    : `The ticket scope (BDD + regression specs) for ${ticket} is green and its PR/MR is open in ${id} (${rr.pr.pr_url}). It is now your turn in the dependency order to squash-merge it.`
  const m = await safeAgent(
    `${tag(id, merger, 'merge')} ${mergePreamble} Work in the ${id} repo (cwd ${desc.path}/). Squash-merge PR/MR number ${rr.pr?.pr_number ?? '(see ' + rr.pr?.pr_url + ')'} into ${rp.base_branch} THROUGH THE HOST (via the VCS adapter) so the web PR/MR is marked **Merged** — do NOT run a local "git merge --squash" + push: that advances the base but leaves the PR/MR showing **Closed**, the exact bug we avoid. Run:
\`scripts/vcs/merge-pr.sh ${rr.pr?.pr_number ?? '<number>'} --subject "${ticket}: ${rp.title ?? '<Task name>'}"\` — this squash-merges server-side, advances ${rp.base_branch}, marks the PR/MR Merged, and prints \`state=\` + \`merge_sha=\`.
VERIFY the printed \`state=MERGED\` before reporting (re-check with \`scripts/vcs/pr-view.sh ${rr.pr?.pr_number ?? '<number>'}\` if unsure). Return merged:true ONLY when state is MERGED (not Closed), base=${rp.base_branch}, and sha = the printed merge_sha on ${rp.base_branch}.`,
    { agentType: merger, phase: 'Merge', label: `merge:${ticket}:${id}`, schema: MERGE_SCHEMA },
  )
  merges[id] = m
  log(`[${id}] merged → ${rp.base_branch}${m?.sha ? ` (${m.sha.slice(0, 8)})` : ''}`)
  tick(`${id}:merge`)
  if (!m?.merged) {
    log(`⚠️ [${id}] merge did not complete — stopping before integration/distribution.`)
    const summary = await writeSummary('merge-failed', { ticket, mergeOrder, repoResults, merges })
    return { ticket, status: 'merge-failed', failedAt: id, repoResults, merges, summary, spend }
  }
}

// 5. INTEGRATION GATE — the E2E suite against the MERGED app build (the join check).
let integration = null
const testSuiteRepo = mergeOrder.find((id) => REPOS[id].testSuite)
// Run it when integration is needed, an e2e-suite repo is in scope, and at least one
// non-e2e (app/service) repo was merged for the suite to run against.
if (scope.integration?.needed && testSuiteRepo && mergeOrder.some((id) => !REPOS[id].testSuite)) {
  phase('Integration')
  const testSuiteFixed = repoResults[testSuiteRepo]?.build?.fixed || []
  const specHint = testSuiteFixed.length
    ? ` The ${testSuiteRepo} build for this ticket touched these spec/Page-Object files — use them to pin the ticket's own spec scope: ${testSuiteFixed.join(', ')}.`
    : ''
  integration = await safeAgent(
    `${tag(testSuiteRepo, 'qa-runner', 'integration')} CROSS-REPO INTEGRATION gate for ${ticket} — SCOPED to THIS ticket, NOT the full suite. All repos are now squash-merged (${mergeOrder.map((id) => `${id}@${REPOS[id].base.feature}`).join(', ')}). Work in the ${testSuiteRepo} repo (cwd ${REPOS[testSuiteRepo].path}/). Build the MERGED app repo, then run the Appium E2E suite against it on iOS AND Android — but run ONLY this ticket's scope:
1. SCOPE = (a) the ticket's own BDD spec(s) automated for ${ticket} + (b) the ticket's regression spec(s). Derive (a) from the BDD→spec map in agent_logs/${ticket}-appium-plan.md${specHint} Derive (b) from the "**Regressions**" block at the bottom of agent_logs/${ticket}-testcases.md (the dev's "⚠️ Regression request" recap — the SOLE source of regression scope; if that block is absent there is NO regression scope, so run just the ticket's BDD spec(s)).
2. RUN SCOPED — \`npm test -- <spec-token…>\` covering exactly the ticket BDD + regression spec(s) on iOS AND Android. Do NOT run \`npm test\` with no args: the FULL-suite regression run is now ON-DEMAND (the user triggers the qa-runner for a full run separately) and is NOT part of this gate.
On a red: SINGLE-CASE triage — re-run just the broken case to rule out flake: \`PLATFORM=<failing-platform> npm test -- <spec-token>\` (+ \`npm run why\`). If it reproduces as a genuine APP/feature bug, report it as-is — comment a reproducible report ON THE TICKET (scripts/tracker/add-ticket-comment.sh) with platform + evidence, list it in failures, and fail the gate (you do NOT fix app code here, and the suite is already merged — only re-run to triage).
Return passed:true only if the scoped run (ticket BDD + regression spec(s)) is green; otherwise passed:false with the failures.`,
    { agentType: 'qa-runner', phase: 'Integration', label: `integration:${ticket}`, schema: INTEGRATION_SCHEMA },
  )
  log(`Integration gate (scoped: ticket BDD + regression): ${integration?.passed ? 'PASS' : `${integration?.failures?.length ?? '?'} failure(s)`}`)
  tick('integration')
  if (!integration?.passed) {
    log('⚠️ Integration gate failed — stopping before distribution. Merged, but the repos do not work together for this ticket; left for human review.')
    const summary = await writeSummary('integration-failed', { ticket, mergeOrder, merges, integration })
    return { ticket, status: 'integration-failed', mergeOrder, merges, integration, summary, spend }
  }
}

// 6. DISTRIBUTE — per-repo, per descriptor. distribute: 'firebase' | 'custom' | null/'none'.
phase('Distribute')
const dists = {}
for (const id of mergeOrder) {
  const desc = REPOS[id]
  if (desc.distribute && desc.distribute !== 'none') {
    const how = desc.distribute === 'firebase'
      ? 'distribute it to Firebase App Distribution for the tester group (firebase CLI "firebase appdistribution:distribute …" or the Firebase MCP)'
      : `distribute it via this repo's configured target ("${desc.distribute}" — see the repo's docs/scripts)`
    dists[id] = await safeAgent(
      `${tag(id, desc.build, 'distribute')} ${ticket} is squash-merged into ${repoResults[id].plan.base_branch}${merges[id]?.sha ? ` (${merges[id].sha})` : ''}. Work in the ${id} repo (cwd ${desc.path}/). Build a release artifact and ${how}. Return distributed + the release link.`,
      { agentType: desc.build, phase: 'Distribute', label: `distribute:${ticket}:${id}`, schema: DIST_SCHEMA },
    )
    log(`[${id}] distributed: ${dists[id]?.release_link ?? '(see note)'}`)
    tick(`${id}:distribute`)
  }
}

// 6b. CLOSE — ownership: the build role (developer) that shipped the app moves the
// ticket to Done now that it's merged + distributed — NOT a human after the run.
// Gated on a reachable tracker (else the write won't persist this run) and on an
// actually-distributed app build.
let close = null
const closeId = mergeOrder.find((id) => REPOS[id].distribute && REPOS[id].distribute !== 'none' && dists[id]?.distributed)
if (trackerReachable && closeId) {
  const cdesc = REPOS[closeId]
  const csha = merges[closeId]?.sha
  const clink = dists[closeId]?.release_link
  const cpr = repoResults[closeId].pr?.pr_url
  close = await safeAgent(
    `${tag(closeId, cdesc.build, 'close')} ${ticket} is squash-merged into ${repoResults[closeId].plan.base_branch}${csha ? ` (${csha})` : ''} and distributed${clink ? ` (${clink})` : ''}. You shipped it, so you CLOSE it: invoke /update-ticket ${ticket} to move Status → ${STATUS.done}, then post a one-line closing comment citing PR/MR ${cpr ?? '(see run)'}${csha ? `, merge ${csha}` : ''}${clink ? `, ${clink}` : ''}. Return { closed:true } ONLY after the ${STATUS.done} write actually persisted.`,
    { agentType: cdesc.build, phase: 'Distribute', label: `close:${ticket}:${closeId}`, schema: CLOSE_SCHEMA },
  )
  log(`[${closeId}] ticket → ${STATUS.done}: ${close?.closed ? 'closed' : 'NOT confirmed (left for manual close)'}`)
  tick(`${closeId}:close`)
} else if (!trackerReachable) {
  log('⚠️ Tracker unreachable — ticket NOT moved to Done (write would not persist); left for manual close.')
} else {
  log('No distributed app build — ticket Done-transition skipped; left for manual close.')
}

// 7. SUMMARY — required closing step.
const summary = await writeSummary('shipped', {
  ticket, repos: mergeOrder,
  per_repo: mergeOrder.map((id) => ({
    repo: id, base: repoResults[id].plan.base_branch, work: repoResults[id].plan.work_branch,
    reviewRounds: repoResults[id].reviewRound,
    pr: repoResults[id].pr?.pr_url, sha: merges[id]?.sha, distribution: dists[id]?.release_link,
  })),
  integration: integration ? { passed: integration.passed } : null,
})

return {
  ticket, status: 'shipped',
  repos: mergeOrder, repoResults, merges,
  integration, distribution: dists, closed: close?.closed === true, summary, trackerReachable,
  spend, // per-phase output-token deltas; the per-repo/role table lives in summary.summary_path
}
