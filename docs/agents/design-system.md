# FeeedMe visual system — mood: **cozy**

The single source of truth for the FeeedMe **visual language** (mood, color, type,
copy). Every design role reads this **before** choosing any style, color, font, or
copy — `cpo`, `ux-ui-planner`, `graphic-designer`, `ux-ui-designer`, and the read-side
roles verifying a screen. `docs/agents/figma.md` is its sibling: that one governs Figma
*mechanics* (the `design.enabled` switch, the canonical file, per-role read/write); this
one governs how the product *looks and reads*.

## The leading word: `cozy`

FeeedMe feels **cozy** — warm, soft, calm, friendly, and **generously filled**. A cozy
room is never clinical and never bare. Check every screen against it: *is this cozy, or
is it empty and cold?* Cozy is the opposite of the old "Bold & Vibrant" direction — no
loud color-shouting, no stark whitespace.

## Rules (each checkable)

1. **No empty white.** No section renders as bare white or an empty void. Every surface
   is a warm tinted fill, a seafoam/sand color-block, or carries content or an
   illustration. An empty state ALWAYS carries an illustration + copy on a warm panel —
   never a blank card. *Check: scan each frame for any large `#FFFFFF`/void region → fill it.*
2. **Warm palette (bind, never hardcode).** Surfaces are warm, not white/grey:
   - canvas/background → **warm cream** (~`#F3EEE6`), never `#FFFFFF` or cool grey.
   - card/surface/elevated → **warm off-white/cream** (~`#FBF7F1`), never pure `#FFFFFF`.
   - fill/zone large areas with **seafoam-tint** (~`#E7F1F0`) or **sand-tint** (~`#F2E7D6`);
     use full **seafoam `#96C1C7`** or warm sand as hero/zoning color-blocks.
   - text/primary → **warm near-black** (~`#2A241E`), never pure black.
   Values live in the Figma variable collection (Seafoam/Marigold/Porcelain/Sand/Powder/
   Sienna scales) — bind to the semantic tokens; the collection is the build source of truth.
3. **Font: Mitr** (Google Fonts — rounded, friendly, calm; full Thai + Latin). Replaces
   Prompt. Weights: Regular 400 body, Medium 500 labels/buttons, SemiBold 600 titles,
   Bold 700 headlines.
4. **Light mode only — for now.** Do NOT build dark-mode variants (dark is deferred; the
   token collection keeps a Dark mode, but design/build light only until this line changes).
5. **Thai-first copy.** All primary copy is **Thai**. Use **English only for borrowed /
   loan words** where a Thai+English mix reads clearer to Thai users — product/brand terms
   and common tech loanwords (e.g. *Log*, *Vaccine*, *FeeedMe*). Never machine-translate;
   Thai copy is native-reviewed (see the Documentor).
6. **Reuse before you draw.** An approved screen is the mood anchor — match it, don't
   rebuild it. The **approved Add Pet Wizard** (Figma canvas `90:14`) is the canonical
   style reference (seafoam curved-top header, warm card, rounded pill buttons, chips,
   real cartoon pets from the Assets library, 390px). Feature "add a pet" flows LINK to
   it; never redraw its steps. Before designing any screen, check `90:14` and existing
   feature pages for an approved equivalent first.

## Craft cues (carry the mood)

- Soft **seafoam curved-top headers** (organic bottom edge), not hard rectangles.
- **Rounded** everything: 20–24dp cards, 16dp buttons, 999dp pill CTAs/chips.
- **Real warm cartoon pet illustrations** from the Figma Assets library (canvas `28:3`) —
  never emoji, never stock. Generate new art only when the library lacks it (see
  `docs/agents/image-generation.md`); keep the same warm flat-vector style.
- Depth via soft shadow, not borders. Generous spacing, but fill the space warmly.

## Pointers
- Figma mechanics (switch, canonical file, per-role read/write): `docs/agents/figma.md`.
- Asset generation: `docs/agents/image-generation.md`.
- Product design tokens + rationale (app repo): `feeedme-app/ROADMAP.md` (Design System).
