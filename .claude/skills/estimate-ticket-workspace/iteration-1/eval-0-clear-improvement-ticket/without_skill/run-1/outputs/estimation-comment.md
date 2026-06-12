## Estimate — FM-49: Cap pet avatar image decode size to display resolution

**Effort level: Small — 2 points total (Developer: 1, QA: 1)**

### Developer: 1 point
- Single-file, single-call-site change: add `cacheWidth` (and optionally `cacheHeight`) to the `Image.file()` call at `review_pet_card.dart:101-106`, derived from the ~288px display size / layout constraints.
- No state, persistence, or architecture impact; edge cases (smaller-than-cacheWidth images, hi-dpi scaling, null path) are handled by Flutter or by the existing null-guard.
- Same shape and size as recently Done Small polish tickets: FM-33/FM-31 (capture `_summaryLine()` once in the same `ReviewPetCard`), FM-21 (cache GoogleFonts TextStyles), FM-30 (add one `@Index` + build_runner).

### QA: 1 point
- Verification is more than a glance, but still small:
  - Flutter DevTools Memory check that per-card decode drops ~16MB → ~0.33MB (the headline acceptance criterion).
  - Visual regression of avatars across screen densities (retina/hi-dpi) and with images smaller than `cacheWidth`.
- No new user flows, no automation suite changes expected — comparable to the verification load on FM-33/FM-31.

### Why not bigger/smaller
- Not 0/½ for QA: the memory-drop acceptance criterion requires a profiled before/after, not just a visual diff.
- Not Medium: one widget, one parameter, well-understood Flutter behavior, and the ticket already pins the exact lines and expected numbers (triage: ready-for-agent).

Comparables (Done, Effort = Small): FM-33, FM-31, FM-30, FM-21, FM-39.
