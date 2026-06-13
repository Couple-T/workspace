# Business Requirements Document: App Launcher Logo

**Directive:** Give feeed-me a distinctive, branded app launcher icon replacing default Flutter mark on iOS and Android.

**Product:** feeed-me (Flutter mobile app, offline-first pet-health platform)  
**Owner:** CPO, UX/UI Design  
**Status:** BRD phase  
**Date:** 2026-06-13

---

## Overview & Context

Launcher icon = single most-seen brand asset across every user touchpoint:
- Home screen
- App switcher
- Store search results (origins ~65% of installs)
- Push notification badges
- Device settings → App Info

Current state: **Default Flutter launcher mark** on both iOS and Android. Assets verified:
- `pubspec.yaml` — no `flutter_launcher_icons` dev-dependency
- `ios/Runner/Assets.xcassets/AppIcon.appiconset/` — stock Flutter art
- `android/app/src/main/res/mipmap-*/ic_launcher.png` — stock Flutter art
- No adaptive icon config (`mipmap-anydpi-v26`)
- No Android 13+ monochrome layers

Competitive context: Funded pet-care incumbents (Vetster "Pet App of the Year 2024" [4.9★], PetDesk [4.9★ / 350k+ iOS ratings]) ship professional, polished marks. Default icon signals unfinished → install drop.

**Why now:** Launcher icon is a low-cost, high-leverage brand foundation atom:
- Author once (1024×1024 master) → regenerate into full iOS + Android coverage via tooling
- Pairs with splash-screen BRD as coherent brand system (Foundational Polish wave)
- Reusable downstream: push notifications, marketing, brand guidelines
- Market size & urgency: Pet-care app market ~USD 1.5–3.2B (2024/25) → ~USD 6–7B (2033); icon quality directly ties to install conversion (+20–25% uplift with optimization)

---

## Business Goals

1. **Eliminate default Flutter mark everywhere** — no surface (iOS, Android, store listing) ships generic logo
2. **Author one 1024×1024 master mark** derived from existing `brand_logo.png` + seafoam palette; single bold key element readable at 60px
3. **Generate full platform coverage** from single source via `flutter_launcher_icons`:
   - iOS: standard + iOS 18 dark + tinted/transparent variants
   - Android: adaptive (foreground + background layers, safe-zone) + Android 13+ monochrome/themed
4. **Lock shared brand identity** with splash-screen BRD — resolve brand-background decision (#FEFEFE scaffold vs #96C1C7 seafoam) once, reuse both
5. **Capture coherent BRD seed** for CPO → design → ticketing → ready-for-dev backlog in feeedme-app

---

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Platform parity | 100% default icon eliminated iOS + Android | No surface ships generic mark |
| 60px legibility | Key element reads clearly at thumbnail | Protects ~65%-of-installs store-search surface |
| Generation idempotency | `dart run flutter_launcher_icons` regenerates all assets | Collapses manual exports → single command |
| Store listing coverage | Play 512×512 + App Store 1024 slots use branded mark | Verified in play.google.com + App Store Connect |
| Device verification | Real iOS + Android device home screen + switcher | Visual smoke test on production hardware |

---

## Scope

### In Scope (P0–P1)

- **Master design** (1024×1024 PNG): extract dachshund-head element from existing brand_logo.png, simplify for 60px legibility, apply seafoam palette, single bold key element
- **Platform generation** (iOS + Android): `flutter_launcher_icons` config block in `pubspec.yaml` to emit all icon densities + variants from single master
- **iOS coverage**: standard sizes + iOS 18 dark (transparent bg) + iOS 18 tinted (grayscale) variants
- **Android coverage**: all density mipmap folders (ldpi–xxxhdpi) + adaptive icon (foreground+background safe-zone) + Android 13+ monochrome
- **Brand decision lock**: resolve #FEFEFE vs #96C1C7 for both launcher icon + splash screen (single decision, both items consume)
- **Store listing slots** (manual, out-of-repo): Play Console 512×512 full-bleed upload + App Store Connect 1024 square art (release team owns)

### Out of Scope (P2+, deferred)

- Store A/B validation loop (Google Play Store Listing Experiments, App Store Connect Product Page Optimization) — post-ship growth activity
- Animated icons, custom adaptive-icon animations
- Marketing asset pack (social, ad creative) — brand guidelines only
- Web/desktop variants
- App bundle metadata (shortcuts, widget icons) — launcher icon only

### Not In Scope

- Backend changes, runtime app logic, feature code
- App identity/namespace changes (bundle ID `com.feeedme.feeedme` unchanged)
- Brand strategy review — existing brand_logo.png + seafoam palette are canonical

---

## Market & Competitive Insight

### Market Size & Growth

Pet-care mobile app market:
- **2024/25**: USD 1.5–3.2B (estimates vary by scope: apps-only vs services+apps)
- **2033 projection**: USD 6–7B (CAGR ~8–18%)
- **Key drivers**: telehealth, insurance alternatives, medication/vaccination tracking, wellness monitoring
- **Install origins**: ~65% originate from store search / home screen, where icon is often the *only* visible ad before tap

### Competitive Benchmarks

| Competitor | Launch Mark | Rating | Category |
|------------|------------|--------|----------|
| **Vetster** | Branded fox/vet mark | 4.9★ (iOS) | Video consultation marketplace; "Pet App of the Year 2024" |
| **PetDesk** | Branded mark (clinic integration) | 4.9★ (350k+ iOS), 4.7★ (27k+ Android) | Clinic management + pet records; strong trust signal |
| **Pawp** | Branded paw + emergency fund mark | 4.8★ | 24/7 virtual vet + insurance alternative |
| **Pumpkin** | Branded pumpkin mark | 4.6★ | Pet insurance + wellness |
| **feeed-me (current)** | **Default Flutter logo** | Pre-release | Health records + smart advisory; *trust gap vs incumbents* |

**Insight:** Funded competitors all ship distinctive, professional marks. Default Flutter logo creates immediate "unfinished / untrusted" signal vs 4.9★ baseline. Icon quality directly protects install conversion.

### Icon Optimization Data

- **Conversion uplift**: Well-optimized launcher icons lift installs ~20–25% (industry aggregate)
- **Store search dominance**: ~65% of downloads originate from store search where icon is often the *only* visual element
- **Legibility sweet spot**: Simple, bold-contrast icons convert ~2× better than complex/detailed ones at 60px

---

## Feature Set

### Feature 1: Branded Launcher Icon — Platform Parity

**User Value**  
Every pet parent sees a real feeed-me mark on home screen, app switcher, and store search instead of generic Flutter logo → first trust signal before app opens.

**Priority:** P0

**Unit Economics**  
- Conversion lever at near-zero marginal cost
- ~65% of installs originate from store search / home-screen tap where icon *is* the ad
- Replaces single biggest "looks unfinished" install-drop signal vs Vetster/PetDesk (4.9★ benchmark)
- One config block → all surfaces generated → no per-platform asset labor

**Acceptance Criteria**  
- ✓ grep of feeedme-app shows zero default-Flutter launcher art remaining
- ✓ iOS `AppIcon.appiconset/` + Android `mipmap-*/ic_launcher.png` both render feeed-me mark
- ✓ Play 512×512 + App Store 1024 listing slots carry branded mark
- ✓ Verified on real iOS + Android device: home screen + app switcher + store preview ship branded mark

### Feature 2: 1024×1024 Master Mark — Single Bold Key Element, 60px-Legible

**User Value**  
Mark a pet parent recognizes instantly at thumbnail size in crowded store-search result or full home screen → clear, calm, unmistakably feeed-me, never blurry shrunk logo.

**Priority:** P0

**Unit Economics**  
- Highest-leverage atom in whole brand system
- `brand_logo.png` is wide horizontal lockup (dachshund line-art + "Feeed ME" wordmark) → illegible at 60px
- Wordmark must drop; dachshund-head extracted as standalone mark
- Single master feeds icon, splash, push, marketing downstream → author-once, reuse-everywhere

**Acceptance Criteria**  
- ✓ One 1024×1024 PNG master derived from `assets/images/brand_logo.png` + seafoam palette
- ✓ Built around single bold key element (dog-head mark, NOT full wordmark lockup)
- ✓ When downscaled to 60px, key element reads clearly with no mush/clipping
- ✓ Tone reads trustworthy/professional against pet-healthcare polish bar (4.9★ competitors)
- ✓ Joint sign-off: CPO + UX/UI

### Feature 3: Generated Platform Coverage via `flutter_launcher_icons`

**User Value**  
Users on any device generation get crisp correctly-sized icon → no pixelation on high-DPI phones, no wrong-shape clipping in launcher.

**Priority:** P0

**Unit Economics**  
- Tooling lever: `flutter_launcher_icons` dev-dep + one `pubspec.yaml` config block
- Generates full iOS set + all Android density mipmaps from single master
- Collapses dozens of manual exports into one regenerable command
- Eliminates blurry-icon support tickets + asset drift between platforms at ~0 marginal eng cost

**Acceptance Criteria**  
- ✓ `flutter_launcher_icons` added as `dev_dependency` in feeedme-app `pubspec.yaml`
- ✓ Config block in `pubspec.yaml` specifies master 1024×1024 path + output settings
- ✓ `dart run flutter_launcher_icons` regenerates full iOS set (all sizes + weights) + all Android mipmaps
- ✓ Output committed to version control (iOS + Android generated art)
- ✓ Regen is idempotent; no hand-edits to generated files in Git history

### Feature 4: Modern Adaptive & Themed Variants (P1)

**User Value**  
Android 13+ device with system theme toggles: icon auto-adapts (monochrome with accent). iOS 18 dark mode: transparent variant with correct contrast. Feels native.

**Priority:** P1

**Unit Economics**  
- `flutter_launcher_icons` v0.14.0+ handles all in single config block:
  - `adaptive_icon_foreground/background` → Android adaptive
  - `adaptive_icon_monochrome` → Android 13+ themed
  - `image_path_ios_dark_transparent` → iOS 18 dark
  - `image_path_ios_tinted_grayscale` → iOS 18 tinted
- Design delivers dedicated transparent single-color monochrome foreground layer (not master reused)
- No runtime eng; config-driven

**Acceptance Criteria**  
- ✓ `pubspec.yaml` config includes all P1 variant keys
- ✓ Dedicated monochrome foreground layer designed (transparent single color)
- ✓ iOS dark variant renders correctly in Settings → App Info dark mode
- ✓ Android 13+ device with themed icons: icon monochrome variant visible + correct
- ✓ No solid black blob/circle on Android 13+ (issue #600 mitigation: transparent foreground)

---

## Technical Feasibility

**Feasible:** ✓ Yes. All 4 features land in feeedme-app ONLY — no backend, no runtime app-bundle deps.

### Verified Repo State

- ✓ `ios/Runner/Assets.xcassets/AppIcon.appiconset/` — stock Flutter art (can be overwritten)
- ✓ `android/app/src/main/res/mipmap-*/ic_launcher.png` — stock Flutter art (can be overwritten)
- ✓ No existing adaptive icon config (`mipmap-anydpi-v26/`) — will be generated
- ✓ `android/app/src/main/AndroidManifest.xml` — `android:icon=@mipmap/ic_launcher` (standard, no special config)
- ✓ `assets/images/brand_logo.png` — 1890×1890 RGBA horizontal lockup (dachshund-head line-art LEFT + "Feeed ME" wordmark RIGHT)
- ✓ Wordmark illegible at 60px → dachshund-head must be extracted as standalone mark
- ✓ Flutter 3.44.1 stable (supports all launcher_icons features)

### Implementation Plan

**Phase 1: Design (Design-led; not eng)**
- CPO + UX/UI extract dachshund-head from brand_logo.png
- Simplify for 60px legibility
- Apply seafoam palette
- Single bold key element (no detail mush)
- Deliver: 1024×1024 master PNG
- **Gate:** CPO + UX/UI joint sign-off (60px downscale legibility + professional tone)

**Phase 2: Generation Config (Blocked on Phase 1 master)**
- Add `flutter_launcher_icons` as `dev_dependency` in `pubspec.yaml`
- Config block: master path, iOS sizes, Android densities, adaptive layers, P1 variants
- `dart run flutter_launcher_icons` → outputs full iOS set + all Android mipmap densities
- Commit all generated art
- Idempotent regen via command

**Phase 3: Platform Parity (Regen output)**
- iOS: `AppIcon.appiconset/` overwritten with generated set
- Android: all `mipmap-*/ic_launcher.png` + new `mipmap-anydpi-v26/ic_launcher_foreground.xml` (adaptive)
- Verified on real iOS + Android device home screen + app switcher

**Phase 4: Store Listing (Release-owned, out-of-repo)**
- Google Play Console: upload 512×512 full-bleed branded mark
- App Store Connect: upload 1024 square art branded mark
- Manual console uploads (not code)

### Technology Choices

- **Master authoring:** Design tool (Figma) — UX/UI exports PNG
- **Generation tool:** `flutter_launcher_icons` pub.dev (v0.14.0+ for modern variants)
- **Config format:** YAML in `pubspec.yaml` (Flutter convention)
- **Variant generation:** Automated via `flutter_launcher_icons` (transparent layers, density scaling, monochrome)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Android 13+ monochrome renders as solid black blob/circle (`flutter_launcher_icons` issue #600) when foreground isn't transparent single-layer | **HIGH** | Design delivers dedicated transparent single-color monochrome foreground layer (NOT master reused); verify on real Android 13+ device with themed icons enabled |
| 60px legibility miss — dachshund-head extracted but still too detailed/mushy at thumbnail | **MEDIUM** | Design acceptance gate: downscale master to 60px before sign-off; CPO+UX/UI joint sign-off already required |
| Idempotency/clobber drift — generator overwrites native icon files; later hand-edits diverge from master | **MEDIUM** | Master + config = sole source of truth; codify in ADR-0010 "never hand-edit generated icon files"; enforce in PR review |
| Android adaptive safe-zone clipping — launcher masks foreground to ~66% center; mark edge clipped | **LOW** | Author master with safe-zone padding (inner 66% = key element); `flutter_launcher_icons` handles masking math |
| iOS asset naming collision — existing custom icons from prior branding attempt | **LOW** | Audit `ios/Runner/Assets.xcassets/` before regen; delete any conflicting sets (unlikely given current stock state) |
| `dart run` doesn't trigger plugin version resolution | **LOW** | Explicit `pubspec.yaml` dev-dep + `dart pub get` run before codegen; GitHub Actions (CI) + local build verify |

---

## Open Questions

1. **Brand-background decision** (resolves both launcher + splash):
   - Scaffold background: #FEFEFE (near-white) or #96C1C7 (seafoam)?
   - Both items await decision → clear with CPO + Design before Phase 1

2. **Monochrome foreground design complexity**:
   - Can dedicated monochrome layer be a simplified mark (e.g., solid dog-head silhouette)?
   - Or must it match full master (icon + background)?
   - Clarify with Design if Phase 1 master needs separate monochrome variant

3. **Store listing upload cadence**:
   - Pre-release or post-launch?
   - Release team owns; flag when Phase 3 complete

---

## Roadmap & Sequencing

### Wave: Foundational Polish (this BRD)

Pairs with splash-screen BRD as coherent brand system. Both resolve shared identity decisions once.

**Sequence:**
1. **BRD approval** — CPO + CTO sign-off (this doc)
2. **Design phase** — UX/UI + CPO author 1024 master + P1 variants (blocked on brand-background decision)
3. **Eng phase** — Add `flutter_launcher_icons` config + regen (blocked on Phase 2 master)
4. **Verification** — Real device home screen + store listing spot-check
5. **Release** — Distribute via standard feeedme-app build pipeline

### Post-Launch (P2, deferred)

- Google Play Store Listing Experiments: A/B test branded icon vs competitor icons (free native tool)
- App Store Connect Product Page Optimization: monitor icon impact on conversion
- Brand guidelines: document mark + seafoam palette for downstream use (push, marketing, web)

---

## Dependencies & Blockers

- ✓ No backend changes
- ✓ No app-bundle config changes
- ⚠️ **Brand-background decision** (blocks Phase 1) — CPO clarification needed
- ⚠️ **Design sign-off on 60px legibility** (gates Phase 2) — UX/UI evaluation
- ⚠️ **Android 13+ device for testing** (gates acceptance) — QA requirement

---

## Approvals & Sign-Off

| Role | Sign-Off | Status |
|------|----------|--------|
| CPO (Product Owner) | Business intent + brand decision | Pending |
| UX/UI Designer | 1024 master + 60px legibility | Pending |
| CTO (Feasibility) | Technical approach | ✓ Confirmed |

---

## References

- **Research:** Market data, competitor icon benchmarks, icon-conversion studies
- **Strategy (CEO brief):** Vision, goals, Foundational Polish wave context
- **Product (CPO brief):** Feature prioritization, unit economics, acceptance criteria
- **Feasibility (CTO):** Technical approach, tooling, risk mitigation
- **Related BRDs:** Splash Screen (shared brand-background decision)
