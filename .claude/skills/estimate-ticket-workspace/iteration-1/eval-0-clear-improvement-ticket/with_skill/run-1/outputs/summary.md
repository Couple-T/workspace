# FM-49 estimation — result

```
ticket:      FM-49
dev_points:  Small
qa_points:   Small
effort_set:  Small (existing value confirmed, not changed; dry-run only per test-harness constraint)
confidence:  high
comparables: FM-31, FM-30, FM-39
note:        Ticket already carried Effort level "Small" (set at clarification); calibration confirms it, so per the re-estimation rule the value was kept and confirmed rather than overwritten.
```

## Reasoning (brief)

**Target.** FM-49 "Cap pet avatar image decode size to display resolution" — add
`cacheWidth`/`cacheHeight` to a single `Image.file()` call at
`review_pet_card.dart:101-106`. Clear AC (4), explicit edge cases, exact file/line
pointers. Spec is fully sizable; no /clarifying-ticket needed.

**Calibration set (8 Done tickets with effort, spread of sizes).** Board scale is a
select: Small / Medium / Large.

| Ref | Effort | What it looked like |
|---|---|---|
| FM-21 | Small | Extract static TextStyles in one file (perf polish) |
| FM-23 | Small | Granular Riverpod selectors in 3 step files |
| FM-30 | Small | Add `@Index` + build_runner regen (one-line perf hardening) |
| FM-31 | Small | Cache `_summaryLine()` + fonts in ReviewPetCard (same file as FM-49) |
| FM-35 | Small | Wire `onRetry` through notifier + unit/widget tests |
| FM-39 | Small | Replace no-op AnimatedContainer with a real 150ms tween |
| FM-37 | Medium | Centralize ~50 GoogleFonts call sites across 21 files, golden-pinned |
| FM-9  | Large | Entire multi-step wizard with autosave + draft lifecycle |

Bar derived: **Small** = localized single/few-file polish with behavior-preserving AC;
**Medium** = multi-file sweep or a full screen; **Large** = a whole flow with
persistence.

**Match.** FM-49 is one parameter added to one widget call in one file — squarely with
FM-31 (same file, same non-blocking perf-polish class, and FM-49's originating ticket),
FM-30 (one-line perf guard, verify-only QA), and FM-39 (single-widget perf fix). Dev:
Small. QA: Small — one manual DevTools memory verification, a visual density check, and
two cheap edge cases on a single screen; nothing close to FM-37's app-wide regression
surface. Total: **Small**, high confidence.

**Re-estimation rule applied.** Effort was already "Small"; comparables agree, so the
value is confirmed, not overwritten.

## Harness compliance (read-only run)

- `upsert-ticket-details.sh FM-49 --effort "Small" --dry-run` executed; command + output
  saved to `outputs/upsert-dry-run.txt` (PATCH payload validated against the live select
  option "Small").
- `add-ticket-comment.sh` NOT called; the exact comment text that would have been posted
  is in `outputs/estimation-comment.md`.
