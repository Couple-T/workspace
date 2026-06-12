# FM-49 Estimation Summary

## Result
- **Effort level: Small**
- **Total: 2 points — Developer: 1 point, QA: 1 point**

## Ticket
FM-49 — "Cap pet avatar image decode size to display resolution" (Polish, Priority Medium, Status Not started).
Add `cacheWidth`/`cacheHeight` to the `Image.file()` call at `review_pet_card.dart:101-106` so Flutter decodes at the ~288px display size (~0.33MB) instead of full ~2000px resolution (~16MB RGBA).

## Reasoning
- **Developer (1 pt):** One parameter on one widget call site in one file; edge cases (small images, hi-dpi, null path) handled by Flutter / existing guard; ticket is already triaged "ready-for-agent" with exact lines and expected numbers.
- **QA (1 pt):** Not free — acceptance criteria require a Flutter DevTools memory before/after (~16MB → ~0.33MB per card) plus visual regression of avatars across densities and small-image cases. No new flows or automation changes.
- **Calibration:** Matched against recently Done tickets on this board, all sized Small: FM-33 and FM-31 (one-local-variable fix in the same ReviewPetCard), FM-21 (cache TextStyles), FM-30 (add one `@Index` + build_runner), FM-39 (swap AnimatedContainer for TweenAnimationBuilder). FM-49 sits squarely in that tier; it does not approach Medium-scale work like FM-37 (~50 call sites across 21 files).

## Board mechanics
The tracker (Notion) sizes tickets with an "Effort level" select (`NOTION_PROP_EFFORT="Effort level"`), not a numeric points field, so:
- The effort property write is `--effort "Small"` (FM-49 already carried a provisional Small from clarification; this confirms it as the estimate).
- The Developer/QA point split is delivered as a ticket comment.

## Actions (read-only harness constraints honored)
- `upsert-ticket-details.sh FM-49 --effort "Small" --dry-run` executed; command + output saved to `upsert-dry-run.txt`. No live write occurred.
- The comment that would have been posted via `add-ticket-comment.sh` is saved to `estimation-comment.md` instead; `add-ticket-comment.sh` was never called.
