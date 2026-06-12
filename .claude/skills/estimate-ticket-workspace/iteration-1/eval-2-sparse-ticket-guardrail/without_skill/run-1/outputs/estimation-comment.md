Estimation — calibrated against 8 Done tickets
Dev points: Medium (low end) — one new screen on the established wizard pattern, but with three non-trivial nav behaviors (pop entire wizard stack, fresh-wizard restart with new draft, post-commit gate w/ safe redirect) plus Figma-matched decorative layout and fallback-avatar handling.
QA points:  Medium — 8 verifiable AC + 6 edge cases (back-button, deep-link/state-loss guard, double-tap, asset failure, long name, no photo) executed on Android AND iOS; nav-stack assertions are fiddly to automate.
Total: Medium  (board scale: Small / Medium / Large)
Comparables: FM-10 (Medium) — same feature area; review screen + validation/commit use case + basic success confirmation, slightly bigger than this ticket; FM-9 (Large) — four wizard data screens w/ autosave + camera/gallery, clearly bigger; FM-35 (Small) — wire one callback through the notifier, representative of the board's Small bar, clearly smaller than a full screen.
Assumptions: dashboard/home route exists or is acceptably stubbed (per Dependencies); Deco-Cat / halo / ellipse assets are already exported; commit logic fully owned by Step 6 (FM-28) and out of scope here.
Confidence: medium

Re-estimated from Small to Medium — every Done Small on this board is a single-file tweak (callback wiring, theme-style routing, index/config changes: FM-35, FM-34, FM-30, FM-12), while FM-29 is a full screen with 8 AC, 6 edge cases and cross-screen navigation guarantees, which lines up with the board's smaller Mediums (FM-10, FM-37) rather than its Smalls.
