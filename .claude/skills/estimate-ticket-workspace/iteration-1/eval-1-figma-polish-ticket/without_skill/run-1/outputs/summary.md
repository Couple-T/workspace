# FM-24 Sizing — Summary

**Result: Effort level = Large · 8 story points total (Developer 5, QA 3).**

## What was done

1. Read FM-24 via `scripts/tracker/get-ticket-details.sh` (+ comments: none). It is a Polish ticket: full visual rebuild of Add Pet Step 2 (PetType) against Figma 108:25, with 9 audited deltas and 11 acceptance criteria. The ticket already carried Effort level "Large".
2. Calibrated against recently Done tickets on this board (`find-tickets.sh` + per-ticket details):
   - **Small** — FM-12, FM-14, FM-33, FM-35, FM-39: single-file mechanical fixes.
   - **Medium** — FM-7 (domain foundation), FM-8 (data layer), FM-10 (review screen + validation + commit): one bounded layer or one screen + logic.
   - **Large** — FM-9: four wizard data steps with autosave (multi-surface UI).
3. Judged FM-24 between FM-10 and FM-9: one screen, but a near-total rebuild — new 2x3 grid with disabled "Soon" tiles, new tile/selected treatment, seafoam hero zone with illustration assets (designer-coordination dependency), overlapping content-card composition with small/large-device overflow risk, behavior-preservation constraints, and widget-test refresh. **Large confirmed; Dev 5 pts.**
4. QA sized at **3 pts**: 11 ACs of manual visual parity, a selectable/disabled interaction matrix, the Next-gate and Back-preservation checks, two device-size passes, plus regression on Sex/Neuter selectors.

## Outputs (test-harness read-only constraints honored)

- `upsert-dry-run.txt` — `upsert-ticket-details.sh FM-24 --effort Large --dry-run` command + output (PATCH body setting "Effort level" select to "Large"). No live write performed.
- `estimation-comment.md` — the dev/QA point-split comment with calibration table and reasoning that would have been posted via `add-ticket-comment.sh` (not called, per constraint).

## Key reasoning in one line

Large is the right bucket because FM-24's scope (hero zone + grid + states + asset dependency + layout risk) clearly exceeds the board's Medium exemplar FM-10 and approaches its only Large exemplar FM-9, while QA effort is above-average for a polish ticket due to pixel-parity ACs across two device sizes.
