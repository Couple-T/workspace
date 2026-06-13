# FM-24 estimate — result

```
ticket:      FM-24
dev_points:  Large
qa_points:   Medium
effort_set:  Large (confirmed existing value; dry-run only — live write suppressed by test harness)
confidence:  high
comparables: FM-9, FM-10, FM-37
note:        Re-estimation case — FM-24 already carried Effort level = Large; the
             calibration confirmed it, so the value was kept (no silent overwrite,
             no change). Comment text saved to estimation-comment.md instead of
             being posted (read-only harness constraint).
```

## Reasoning (brief)

**Board scale observed:** select property "Effort level" with values Small / Medium / Large
(21 Done tickets carry one; only FM-9 is Large). No numeric points exist on this board.

**Calibration bar derived from Done tickets:**
- **Small** (FM-23, FM-34): localized, mechanical change following an established pattern —
  1–3 files, light regression-only QA.
- **Medium** (FM-7, FM-10, FM-37): one cohesive layer or one screen + use case
  (FM-10 shipped with an 8-scenario dual-platform QA suite), or a wide-but-mechanical
  refactor (FM-37, ~50 sites / 21 files).
- **Large** (FM-9): multi-step wizard UI with novel interaction patterns + autosave/draft
  lifecycle, heavy dual-platform QA.

**FM-24 against the bar:** 11 acceptance criteria covering a full visual rebuild of the
PetType step — new hero zone with decorative art + portrait cluster, overlapping rounded
content card, 2x3 grid with 4 disabled "Soon" tiles, new selected-tile treatment, exact
copy parity, and overflow-safe layout SE->large — plus a designer asset-re-export
dependency. A code skim (codegraph, your-app) confirmed the current screen is minimal
(73-line step + shared 94-line SegmentedTileSelector reused by Sex/Neuter steps, which
must not regress), so almost everything in the design is net-new bespoke UI. Dev sits at
the Medium/Large boundary (above FM-10, below FM-9's four steps); the skill's tie-break
("take the higher") plus the asset dependency lands Dev at **Large**. QA is **Medium**:
~6-8 BDD scenarios x 2 platforms with mostly visual/manual parity checks plus wizard and
selector regression — comparable to FM-10's suite. Overall property: **Large**, which
matches the value already on the ticket, so it was confirmed rather than changed.

**Harness compliance:** upsert run with --dry-run only (output in upsert-dry-run.txt);
no comment posted — intended text in estimation-comment.md.
