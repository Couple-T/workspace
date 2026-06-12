Estimation — calibrated against 8 Done tickets
Dev points: Small — one localized change: add cacheWidth (logical px ≈ 288 or derived from layout constraints) to the Image.file() call at review_pet_card.dart:101-106; an established Flutter parameter, no new pattern, no data/migration risk.
QA points:  Small — one manual DevTools Memory verification (~16MB → ~0.33MB per card), visual check of avatars across screen densities, and the small-image / null-path edge cases; single screen, no cross-feature regression surface.
Total: Small  (board scale: Small / Medium / Large)
Comparables: FM-31 (Small) — same file (review_pet_card.dart), same class of non-blocking perf polish, and FM-49's originating ticket; FM-30 (Small) — one-line perf hardening (add @Index + regen) with a verify-only test burden; FM-39 (Small) — single-widget perf/UX fix with a behavior-preserving AC set. By contrast, Medium on this board means a multi-file sweep (FM-37: ~50 sites / 21 files), which FM-49 is not.
Assumptions: display width ~288 logical px is confirmed at implementation time from actual layout constraints; the DevTools memory check is a manual verification step, not an automated test.
Confidence: high

Existing effort value "Small" confirmed — comparables support it; no re-estimation needed.
