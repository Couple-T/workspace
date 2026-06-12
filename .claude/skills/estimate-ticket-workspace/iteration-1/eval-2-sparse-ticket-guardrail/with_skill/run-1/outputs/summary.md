# Estimate FM-29 — result

```
ticket:      FM-29
dev_points:  Small–Medium (leaning Medium)
qa_points:   Medium
effort_set:  Medium (dry-run only — live board, write simulated; see upsert-dry-run.txt)
confidence:  high
comparables: FM-10, FM-35, FM-9
note:        Re-estimated from Small to Medium — pre-set value contradicts the board's
             Small comparables (FM-34/FM-35 single-mechanism changes); FM-29's
             nav-stack clearing, wizard reset, post-commit guard and 8 AC + 6 edge
             cases on two platforms sit at the FM-10 (Medium) bar.
```

## Reasoning (brief)

**Spec quality.** FM-29 is NOT sparse — it has 8 verifiable acceptance criteria, 6 edge
cases, a Figma ground-truth frame, dependencies and an explicit scope fence. Estimable
as-is; no /clarifying-ticket needed.

**Calibration set (6 Done tickets, spread of sizes, board scale = select Small/Medium/Large):**

| Ref | Effort | What it looked like |
|-----|--------|---------------------|
| FM-9 | Large | 4 wizard data steps, autosave/draft lifecycle, camera+gallery, chips |
| FM-10 | Medium | Review screen + edit-back + validation use case + draft-to-active commit + success overlay; QA C1-C8 on iOS+Android |
| FM-7 | Medium | Whole pure-domain layer (entities, enums, repos, Failure taxonomy) |
| FM-19 | Medium | Isar at-rest encryption + keystore key mgmt + migration + ADR |
| FM-34 | Small | Mechanical refactor: route 21 widgets through AppTheme styles, zero new logic |
| FM-35 | Small | Wire one callback + add notifier method, 2 tests |

**Bar derived:** on this board a Small is a single-mechanism change (one wiring, one
mechanical refactor); a Medium is one full screen/layer with real logic or risk; a Large
is a multi-screen flow with lifecycle + platform integrations.

**Target vs bar.** Dev: one new screen on established wizard patterns, but the effort
drivers are navigation semantics (pop entire wizard stack, fresh-draft reset on "Add
another pet", post-commit gate with safe redirect, system-back handling) plus a dashboard
route stub — codegraph skim confirmed the wizard scaffolding exists but no Flutter
dashboard/home screen does. That is clearly above FM-35/FM-34 Small, below FM-9 Large;
torn between Small and Medium -> take the higher. QA: 14 checks across both platforms +
regression around the FM-28 commit handoff is FM-10's Medium-grade suite. Total: **Medium**.

**Re-estimation.** Ticket arrived pre-set to Small; per the skill, changed (not silently)
because the old value clearly contradicts the comparables, and the move is recorded in
the estimation comment.

## Harness compliance (read-only run)

- Effort write: executed with --dry-run only -> outputs/upsert-dry-run.txt
- Comment: NOT posted; exact text saved to outputs/estimation-comment.md
- All other tracker calls were reads (get-ticket-details / get-ticket-comments / find-tickets).
