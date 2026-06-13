---
name: prd
description: Run the PRD pipeline (BRD → CPO briefs → in-session Figma design → tickets) as a main-agent-orchestrated hybrid so the Figma frames are actually built. Use this instead of a raw Workflow(prd) call whenever UI-bearing features need real Figma frames. Pass a BRD ref — a work-key ("phase-2"), a doc-space URL, or a docs/brd/<key>.md path.
---

# /prd — orchestrated PRD pipeline (with working Figma writes)

## Why this skill exists (read first)

The `prd` workflow's design phase builds Figma frames. But the only Figma MCP
connected here is the **claude.ai OAuth remote** (`mcp.figma.com`,
`mcp__claude_ai_Figma__*`), and **an interactively-OAuth'd MCP server is
unauthenticated inside the headless workflow runtime** → every Figma call from a
workflow `agent()` returns **403** → "No Figma frames". This is a platform
boundary, not a config: `mcp.figma.com` has no PAT/token mode, so it cannot be
made to authenticate inside `Workflow(...)`.

**The fix is structural:** the OAuth session is valid in the *main* session and
in any sub-agent spawned from it with the **Agent tool** (verified — an in-session
sub-agent's `whoami` returns the user identity). So this skill keeps the
non-Figma phases as headless workflows but runs the **design chain in-session**,
where Figma reads *and* writes work.

```
INTAKE      → Workflow(prd, {stage:'intake'})            headless, no Figma
DESIGN      → Agent(ux-ui-planner / graphic-designer /   in-session, OAuth Figma VALID
              ux-ui-designer) per UI feature              → real frames
TICKETING   → Workflow(prd, {stage:'ticketing', ...})    headless, links URL strings
+ SUMMARY
```

## Process

### 0. Preflight — confirm Figma is connected
Run `claude mcp list` (Bash) and confirm a Figma server is **✔ Connected**
(`claude.ai Figma` → `mcp__claude_ai_Figma__*`, or the plugin → `mcp__plugin_figma_figma__*`).
- If connected: proceed.
- If **not** connected: tell the user to authenticate Figma (`/mcp` → connect
  Figma), or offer to run a **specs-only** pass (skip step 2's frame build; the
  designers still produce build-ready markdown specs, tickets link those instead
  of frames). Do not silently 403.

### 1. INTAKE (headless workflow)
```
Workflow({ name: 'prd', args: { brd: '<the BRD ref the user passed>', stage: 'intake' } })
```
Returns `{ features, uiFeatures, briefs, workKey }`. Keep `features` verbatim — you
pass it back in step 3. If `uiFeatures` is empty, skip step 2 entirely (spec-only
mission) and go to step 3 with an empty `figmaByFeature`.

### 2. DESIGN (in-session — this is where you take control)
For **each** feature in `uiFeatures`, run the design chain with the **Agent tool**
(NOT a workflow). Run different features **concurrently** — issue the planner calls
for all features in one message — but keep each feature's own chain sequential
(plan → [assets] → frames). Pass `workKey` and the feature brief into each prompt.

1. **Plan** — `Agent(subagent_type: 'ux-ui-planner')`: design-plan the feature
   (reads the design system via Figma, writes the plan md, returns `plan_path` +
   `asset_requests`). Mirror the prompt the workflow used (see `prd.js` step 2a).
2. **Assets** — only if the plan returned `asset_requests`:
   `Agent(subagent_type: 'graphic-designer')` to generate them into the Figma
   Assets page. (prd.js step 2b.)
3. **Build frames** — `Agent(subagent_type: 'ux-ui-designer')`: build the
   production Figma frames from the plan, using the assets. It calls
   `use_figma`/`create_new_file` etc. — which now succeed because you are
   in-session. Require it to return `figma_frames[].url` + `figma_file_url` and
   `dev_ready`. (prd.js step 2c.)

Collect two structures as features complete:
- `figmaByFeature` — `{ "<feature name>": "<primary frame or file URL>" }`
- `designed` — `[ { feature: "<name>", figma_url: "<url>" } ]` (for the summary)

If a feature's frame build fails or returns no URL, record it with a `null`/note
and keep going — don't abort the whole run.

### 3. TICKETING + SUMMARY (headless workflow)
```
Workflow({ name: 'prd', args: {
  brd: '<same BRD ref>', stage: 'ticketing',
  features: <the features array from step 1>,
  figmaByFeature: <map from step 2>,
  designed: <list from step 2>,
} })
```
The Product Owner writes one self-contained ticket per feature and links the Figma
frame for UI-bearing ones (it only handles the URL *strings* — no Figma MCP call,
so it's headless-safe). The documentor writes the run summary.

### 4. Report
Summarize to the user: features intaken, frames built (with URLs), tickets created
(names + URLs + board URL), and any feature that fell back to specs-only or failed
to get a frame. Surface failures honestly — don't imply frames exist if a build
returned `dev_ready:false` or no URL.

## Notes
- Pass `args` as a real JSON object to Workflow, not a stringified one.
- Concurrency: the per-feature design chains are independent — batch them. The
  serial cost is one chain (plan→assets→frames), not the sum across features.
- This skill is the ONLY supported way to get real frames today. A raw
  `Workflow(prd)` (stage `all`) still runs end-to-end but its design phase will
  403 on Figma and produce no frames — use it only for spec/non-UI missions or
  if a token-auth/local Figma MCP has been wired into the workflow runtime.
