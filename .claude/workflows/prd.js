export const meta = {
  name: 'prd',
  description: 'PRD / design+ticketing workflow: embrace a BRD → CPO feature briefs → design UI-bearing features in Figma (planner → graphic assets → designer) → Product Owner writes self-contained tickets into the issue tracker. Pass a brd work-key ("phase-2"), a doc-space URL, or a docs/brd/<key>.md path.',
  whenToUse: 'Turn an approved BRD into production-ready designs + a ready-for-dev backlog of tickets (each a PRD, with its Figma frame linked when UI-bearing).',
  phases: [
    { title: 'Intake', detail: 'CPO: read the BRD(if exists) → prioritized feature briefs, each flagged UI-bearing or not', model: 'opus' },
    { title: 'Design', detail: 'CONDITIONAL — skipped entirely when no feature is UI-bearing (non-UI mission → zero designers). Else per UI-bearing feature: ux-ui-planner plan → graphic-designer assets → ux-ui-designer Figma frames (all features in parallel)', model: 'opus/sonnet' },
    { title: 'Ticketing', detail: 'Product Owner writes one self-contained FM ticket per feature onto the Notion board, linking the Figma frame', model: 'sonnet[1m]' },
    { title: 'Summary', detail: 'documentor writes the run-summary + per-role token/time table (summarize-workflow-performance)', model: 'haiku' },
  ],
}

// ──────────────────────────────────────────────────────────────────────────
// Input — auto-detect: brd work-key | doc-space/Figma URL | docs/brd/<key>.md path
// ──────────────────────────────────────────────────────────────────────────
const rawIn = (typeof args === 'string'
  ? args
  : (args?.brd || args?.input || args?.workKey || args?.phase || args?.url || args?.path || ''))?.trim()
if (!rawIn) throw new Error('prd needs a BRD ref: a work-key ("phase-2"), a doc-space URL, or a docs/brd/<key>.md path')

const isUrl = /^https?:\/\//i.test(rawIn)
const isPath = !isUrl && (/\.md$/i.test(rawIn) || rawIn.includes('/'))
const phaseMatch = rawIn.match(/phase\s*-?\s*(\d+)/i)
const workKey = phaseMatch ? `phase-${phaseMatch[1]}`
  : isPath ? (rawIn.split('/').pop().replace(/\.md$/i, '') || 'brd')
  : isUrl ? 'brd-import'
  : (rawIn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'brd')
const brdRef = isUrl ? `the doc-space URL ${rawIn} — fetch it`
  : isPath ? `the repo file ${rawIn} — Read it`
  : phaseMatch ? `roadmap ${workKey}: Read docs/brd/${workKey}.md (and/or its page in the team doc space, if any)`
  : `"${rawIn}": resolve as a BRD work-key — Read docs/brd/${workKey}.md (or the team doc space's BRD page)`

const tag = (role, phase, sub) => `[prd ${workKey} role=${role} phase=${phase}${sub ? ` sub=${sub}` : ''}]`

// Round cap — hard ceiling of 3 for any review↔revise loop (mirrors dev-cycle's
// MAX_GATE_ROUNDS). This linear pipeline has no loop wired yet; the constant
// bounds a future one to ≤3 (override LOWER via args.maxRounds — never higher).
const MAX_ROUNDS = Math.min(3, (typeof args === 'object' && args?.maxRounds) || 3)

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────
const BRIEFS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['features'],
  properties: {
    features: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['name', 'ui_bearing', 'brief'],
      properties: {
        name: { type: 'string' },
        ui_bearing: { type: 'boolean' },
        brief: { type: 'string' },
        user_value: { type: 'string' },
        acceptance_intent: { type: 'array', items: { type: 'string' } },
        priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        effort: { type: 'string', enum: ['Small', 'Medium', 'Large'] },
        dependencies: { type: 'array', items: { type: 'string' } },
      } } },
    notes: { type: 'string' },
  },
}
const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['plan_path'],
  properties: {
    plan_path: { type: 'string' }, flow: { type: 'string' },
    screens: { type: 'array', items: { type: 'string' } },
    asset_requests: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { name: { type: 'string' }, spec: { type: 'string' } } } },
    states_summary: { type: 'string' },
  },
}
const ASSETS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['assets'],
  properties: {
    assets: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { name: { type: 'string' }, figma_location: { type: 'string' } } } },
    note: { type: 'string' },
  },
}
const FIGMA_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['dev_ready'],
  properties: {
    dev_ready: { type: 'boolean' }, figma_file_url: { type: ['string', 'null'] },
    figma_frames: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: { screen: { type: 'string' }, url: { type: 'string' } } } },
    note: { type: 'string' },
  },
}
const TICKETS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['tickets'],
  properties: {
    board_url: { type: 'string' }, coverage_note: { type: 'string' },
    tickets: { type: 'array', items: {
      type: 'object', additionalProperties: false,
      required: ['task_name', 'url'],
      properties: {
        task_name: { type: 'string' }, url: { type: 'string' },
        ui_bearing: { type: 'boolean' }, figma_link: { type: ['string', 'null'] },
        priority: { type: 'string' }, effort: { type: 'string' },
      } } },
  },
}
const SUMMARY_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary_path'],
  properties: { summary_path: { type: 'string' }, note: { type: 'string' } },
}

const spend = []
let mark = budget.spent()
const tick = (label) => { const now = budget.spent(); spend.push({ label, out: now - mark }); mark = now }

// ──────────────────────────────────────────────────────────────────────────
// 1. INTAKE  (CPO: BRD → prioritized feature briefs, UI-bearing flagged)
// ──────────────────────────────────────────────────────────────────────────
phase('Intake')
const briefs = await agent(
  `${tag('cpo', 'intake')} As CPO, read the BRD (${brdRef}) and break it into a prioritized set of feature briefs for ${workKey}. For EACH feature give: name, whether it is UI-bearing — true ONLY if the feature adds or changes screens/flows/widgets the user actually sees and taps; false for pure logic/data/infra (e.g. business/advisory engines, repositories & persistence, DTOs/serialization, data migrations, background services). When uncertain, mark it FALSE — designers (planner→assets→Figma) are spawned ONLY for genuinely UI-bearing features, so a non-UI mission must pull in NO designers at all; over-flagging burns a full design chain. Then a short brief, user value, acceptance intent (verifiable, not yet ticket ACs), Priority (High/Medium/Low), Effort (Small/Medium/Large), and dependencies on other features. Keep features small enough to become one ticket each. Use the product's own vocabulary from the BRD / workspace.config.yaml / CLAUDE.md.`,
  { agentType: 'cpo', phase: 'Intake', label: `intake:${workKey}`, schema: BRIEFS_SCHEMA },
)
const features = briefs.features || []
const uiFeatures = features.filter((f) => f.ui_bearing)
log(`Intake: ${features.length} features (${uiFeatures.length} UI-bearing → design; ${features.length - uiFeatures.length} spec-only)`)
tick('intake')

// ──────────────────────────────────────────────────────────────────────────
// 2. DESIGN  (CONDITIONAL — skipped ENTIRELY for non-UI missions)
//    If intake found no UI-bearing features (pure logic/data/infra/advisory
//    work), NO designer agents are spawned: the whole phase is short-circuited
//    — not even a `phase('Design')` group — and the run goes straight to
//    Ticketing. Otherwise it's a barrier: design ALL UI-bearing features (each
//    chain: planner → [graphic assets] → Figma designer, features concurrent),
//    then ticket.
// ──────────────────────────────────────────────────────────────────────────
let designs = []
if (uiFeatures.length === 0) {
  log(`Design: SKIPPED — 0/${features.length} features are UI-bearing; no designers spawned (spec-only mission → straight to Ticketing)`)
} else {
  phase('Design')
  designs = (await parallel(uiFeatures.map((f) => async () => {
    const slug = (f.name || 'screen').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
    // 2a. Plan (Mia) — flow, per-screen states, motion intent, asset request list.
    const plan = await agent(
      `${tag('ux-ui-planner', 'design', slug)} Design-plan the UI-bearing feature "${f.name}" (${workKey}). Brief: ${JSON.stringify(f).slice(0, 1500)}. Read the design system (read-only), map the flow, enumerate every per-screen state (loading/empty/error/success + feature-specific), name motion intent, select real design-system tokens/components, and produce the asset request list. Write the plan to agent_logs/Mia_ux-ui-planner/${workKey}-${slug}-design-plan.md and return it.`,
      { agentType: 'ux-ui-planner', phase: 'Design', label: `plan:${slug}`, schema: PLAN_SCHEMA },
    )
    // 2b. Assets (Fiona) — only if the plan requested any.
    let assets = null
    if (plan.asset_requests && plan.asset_requests.length) {
      assets = await agent(
        `${tag('graphic-designer', 'design', slug)} Generate the assets requested by the design plan for "${f.name}" (${workKey}) and lay them into the Figma Assets page (6-col grid, transparent, species+number snake_case, @1x/2x/3x), under the budget rules. Requests: ${JSON.stringify(plan.asset_requests).slice(0, 1800)}. Return where each asset lives.`,
        { agentType: 'graphic-designer', phase: 'Design', label: `assets:${slug}`, schema: ASSETS_SCHEMA },
      )
    }
    // 2c. Build (Jane) — production Figma frames from the plan, using the assets.
    const figma = await agent(
      `${tag('ux-ui-designer', 'design', slug)} Build the production-ready Figma frames for "${f.name}" (${workKey}) from Mia's plan at ${plan.plan_path} — all screens and states, design-system tokens only, motion intent noted. Assets available: ${assets ? JSON.stringify(assets.assets).slice(0, 1200) : 'none requested'}. Return the frame URLs + the file URL; dev_ready=true only when every state is covered and dev-ready.`,
      { agentType: 'ux-ui-designer', phase: 'Design', label: `figma:${slug}`, schema: FIGMA_SCHEMA },
    )
    return { feature: f.name, plan, assets, figma }
  }))).filter(Boolean)
  log(`Design: ${designs.length}/${uiFeatures.length} UI features have Figma frames`)
}
tick('design')

// Map feature name → primary Figma frame URL for the Product Owner to link.
const figmaByFeature = {}
for (const d of designs) {
  const first = d.figma?.figma_frames?.[0]?.url || d.figma?.figma_file_url || null
  if (first) figmaByFeature[d.feature] = first
}

// ──────────────────────────────────────────────────────────────────────────
// 3. TICKETING  (Product Owner writes ALL FM tickets onto the Notion board —
//    one self-contained PRD per feature, Figma linked for UI-bearing ones.)
// ──────────────────────────────────────────────────────────────────────────
phase('Ticketing')
const tickets = await agent(
  `${tag('product-owner', 'ticketing')} As Product Owner, create one self-contained ticket per feature for ${workKey} in the issue tracker — via /clarifying-ticket (which uses the tracker adapter; see docs/agents/issue-tracker.md) and /to-prd. For each ticket: clear goal + user value, verifiable acceptance criteria, scope boundaries + edge cases, Priority and Effort from the brief, a "feature" type, and the org's not-started status (see issue-tracker.md; never set read-only id fields). For UI-bearing features, link the backing Figma frame in the ticket body/spec. Sequence tickets by dependency so the pipeline picks them up in order, and confirm full coverage (every feature → a ticket).
  Feature briefs: ${JSON.stringify(features).slice(0, 4000)}.
  Figma frame per feature: ${JSON.stringify(figmaByFeature).slice(0, 2000)}.
  Return every created ticket (task_name + ticket URL + figma_link) and the board URL.`,
  { agentType: 'product-owner', phase: 'Ticketing', label: `tickets:${workKey}`, schema: TICKETS_SCHEMA },
)
log(`Ticketing: ${tickets.tickets?.length ?? 0} tickets created on the board`)
tick('ticketing')

// ──────────────────────────────────────────────────────────────────────────
// 4. SUMMARY  (required closing step — run-summary + per-role token/time table)
// ──────────────────────────────────────────────────────────────────────────
phase('Summary')
const summary = await agent(
  `Run-recorder for the PRD/design+ticketing workflow on work-key ${workKey}. Write the run-summary to agent_logs/${workKey}-PRD-SUMMARY.md (git-ignored): a short narrative — features intaken, UI features designed (with Figma links), and the FM tickets created (names + URLs) — from this result: ${JSON.stringify({ features: features.map((f) => f.name), designs: designs.map((d) => d.feature), tickets: tickets.tickets }).slice(0, 3500)}. Then, as the LAST step, run:\n  python3 .claude/skills/summarize-workflow-performance/scripts/parse_workflow_usage.py ${workKey} --workflow prd\nand append its Markdown output VERBATIM under a "## Token & time usage" heading. Return the summary_path.`,
  { agentType: 'documentor', phase: 'Summary', label: `summary:${workKey}`, schema: SUMMARY_SCHEMA },
)
tick('summary')
log(`Run summary: ${summary.summary_path}`)

return {
  workKey, brdRef: rawIn, status: 'tickets-ready', maxRounds: MAX_ROUNDS,
  featureCount: features.length, uiDesigned: designs.length,
  tickets: tickets.tickets, board_url: tickets.board_url,
  briefs, designs, summary, spend,
}
