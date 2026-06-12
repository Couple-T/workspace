## Estimation — FM-24 · Fix PetType (Step 2) to match Figma 108:25

**Effort level: Large** (confirms the value already on the ticket)
**Story points: 8 total — Developer 5 · QA 3**

### Calibration (recently Done tickets on this board)

| Effort | Done comparables | Shape of work |
|---|---|---|
| Small (~1–2 pts) | FM-12 (iOS target bump), FM-14 (async file ops), FM-33 (cache `_summaryLine`), FM-35 (wire `onRetry`), FM-39 (CTA tween fix) | Single file, narrow mechanical change |
| Medium (~3 pts) | FM-7 (domain foundation), FM-8 (data layer), FM-10 (review screen + validation + commit) | One bounded layer or one screen plus its logic |
| Large (~5 pts) | FM-9 (4 wizard data steps with autosave) | Multi-surface UI work across several components |

### Developer — 5 points

FM-24 is a single screen, but it is a near-total visual rebuild, not a tweak:

- 9 audited deltas (D1–D9): copy, 2×3 species grid with 4 disabled "Soon" tiles, new tile treatment (~46px circular illustrations, Soon chip, corner-dot + seafoam selected state), seafoam hero zone (blobs + bird-on-branch + 2×2 portrait cluster), and a white content card overlapping the hero (~y270).
- New layout composition must hold on iPhone SE through large devices inside `WizardScaffold` — overflow risk is the main technical hazard.
- Asset dependency: hero-scale (~80px) and tile-scale (~46px) circular species art may need designer re-export — coordination overhead beyond pure coding.
- Constraint discipline: keep `setSpecies` / `canAdvancePetType` / progress-bar behavior untouched, do not expand `PetSpecies`, and avoid regressing the compact `SegmentedTileSelector` used by Sex/Neuter on other steps.
- Existing widget tests must be refreshed (title/subtitle snapshots).

Heavier than FM-10 (Medium, one screen + use case), lighter than nothing on this board — closest peer is FM-9 (Large). 5 points.

### QA — 3 points

- 11 acceptance criteria, mostly pixel/content parity against Figma 108:25 — visual verification is manual-heavy.
- Interaction matrix: Dog/Cat selectable and drive `setSpecies`; Bird/Fish/Rodent/Other must be non-selectable and never advance; Next gate stays disabled until a valid pick; Back preserves selection; pip 2 active.
- Two device-size passes (small SE + large) for the hero/card overlap layout.
- Regression sweep on the other wizard steps (Sex/Neuter `SegmentedTileSelector` untouched).

More QA surface than a typical Medium feature's happy path, but one screen only. 3 points.

### Risks priced in

- Designer turnaround on hero/tile art re-exports (D5/D8) is the most likely schedule slip.
- Hero + overlapping-card composition inside `WizardScaffold` on small heights.

*Estimated 2026-06-12 against FM-7/8/9/10/12/14/33/35/39 as comparables.*
