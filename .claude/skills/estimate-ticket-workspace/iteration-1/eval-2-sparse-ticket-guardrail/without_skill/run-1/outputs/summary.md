# FM-29 Estimation Summary

```
ticket:      FM-29
dev_points:  Medium (low end)
qa_points:   Medium
effort_set:  Medium (DRY-RUN ONLY — not written; see upsert-dry-run.txt)
confidence:  medium
comparables: FM-10 (Medium), FM-9 (Large), FM-35 (Small)
note:        Re-estimated from Small to Medium — existing value contradicted the board's comparables.
```

## Reasoning

**Target:** FM-29 "Add Pet · Success / Confirmation Screen" — final screen of the Add Pet
wizard. Well-specified spec: Figma frame 327-8 ground truth, 8 verifiable AC, 6 edge cases.
No missing-AC guardrail triggered; the ticket is fully estimable.

**Calibration (board scale = Small / Medium / Large, Notion select):** read 8 Done
references with effort set:

| Ref | Effort | What it was |
|-----|--------|-------------|
| FM-9 | Large | 4 wizard data screens, autosave, draft creation, camera/gallery photo |
| FM-10 | Medium | Review screen + validation use case + draft-to-active commit + basic success confirmation |
| FM-7 | Medium | Full domain foundation (entities, enums, repos, failures) |
| FM-37 | Medium | Central AppTextStyles cache refactor (cross-cutting) |
| FM-35 | Small | Wire one onRetry callback through the notifier |
| FM-34 | Small | Route wizard widgets through AppTheme text styles |
| FM-12 | Small | iOS deployment-target config bump |
| FM-30/31/32/33/39 | Small | One-file perf tweaks (indexes, caches) |

**The bar on this board:** Small = a single-file/localized tweak; Medium = a full screen
with logic OR a whole layer; Large = multi-screen + device integration.

**FM-29 vs the bar:** one new screen (no business logic — commit owned by Step 6 / FM-28),
but with Figma-matched decorative layout, dynamic data binding, and three navigation
behaviors (pop entire wizard stack, fresh-wizard restart with a NEW draft, post-commit
gate with safe redirect), plus 6 edge cases verified on Android AND iOS. That clearly
exceeds every Done Small (all one-file tweaks) and sits at the low end of Medium — just
below FM-10 and far below FM-9. Tie-break rule (torn -> take the higher) also lands Medium.

**Re-estimation:** ticket carried Effort = Small (pre-set, no estimation comment on the
ticket). Small clearly contradicts the comparables, so the estimate moves Small -> Medium,
recorded in the estimation comment.

## Read-only constraint compliance

- `upsert-ticket-details.sh FM-29 --effort "Medium"` run with `--dry-run` only;
  command + output saved to `upsert-dry-run.txt`. "Medium" matches an existing select
  option, so the write would be accepted.
- `add-ticket-comment.sh` not called; the comment text that would have been posted
  is in `estimation-comment.md`.
- Only read operations (`find-tickets.sh`, `get-ticket-details.sh`,
  `get-ticket-comments.sh`) touched the live board.
