# Business Requirements Document: Splash Screen

**Feature:** Modern Native Splash (Android 12+ SplashScreen API + iOS launch)  
**Product:** feeed-me (Flutter offline-first pet-healthcare app)  
**Status:** Define phase complete · Ready for implementation  
**Owner:** CPO, UX/UI Designer, CTO  
**Last Updated:** 2026-06-13

---

## Overview & Context

Splash screen = low-cost, high-leverage first-impression + brand-recall touchpoint. feeed-me competes in ~USD 2.7–3B (2025) pet-care/health-app market growing ~7–17% CAGR. Scope narrow, tactical: not revenue driver itself. Every user sees it on every cold start (100% reach).

### Market Position
- **Market size:** ~USD 2.7–3B pet-care/health-app (2025), ~7–17% CAGR.
- **User behavior:** ~25% abandon after one session; first 30 seconds shape impression.
- **Opportunity:** Own the first frame. Only screen 100% of users see on every cold start — cheapest place to build brand recall before any feature touched.

### Key Insight
Offline-first Flutter app does REAL init work on cold start (DB/cache hydration, Firebase init, secure-key resolve). Splash masks genuine work → app feels fast, professional, native. Modern Android 12+ SplashScreen API (via flutter_native_splash) eliminates legacy double-splash tech debt from day one.

---

## Business Goals & Success Metrics

### Goals (CEO Vision)
1. **Brand the launch:** feeed-me logo/mark on brand-color background, visually continuous with in-app language (derive from existing `assets/images/brand_logo.png` + palette).
2. **Mask real cold-start, never fake it:** Splash covers genuine offline-first init (DB/cache hydration, migrations). Dismisses instant init completes. No mandatory-minimum timer, no artificial delay.
3. **Keep it sub-1.5s:** Total splash visible duration ≤1.5s on normal cold start. Longer = ~12% drop-off cliff.
4. **One cross-platform identity:** Single `flutter_native_splash` config yields unified Android + iOS launch frame.
5. **Adopt the modern API:** Implement via Android 12+ SplashScreen API (configured for new API in flutter_native_splash), not legacy custom Activity. Zero double-splash, no added launch latency.
6. **Foundational + low-risk:** Clean, reusable splash config. Future loading/success states can echo for consistent brand recall.

### Success Metrics
- **Done & Valuable (P0):** On cold start, Android 12+ shows OS SplashScreen-API frame (not legacy custom Activity), iOS shows equivalent launch frame. Exactly ONE splash (no flash/double-splash). No measurable added launch latency vs no-splash baseline.
- **Done & Valuable (P0):** Splash gates ONLY on real main() init chain, dismisses on completion. NO minimum-duration timer / NO artificial delay in code. Total visible splash duration ≤1.5s on representative device.
- **Done & Valuable (P1):** feeed-me logo/mark renders crisp at 2.0x + 3.0x density on brand-color background, correctly safe-area inset. Transition into PetListScreen reads continuous, not a cut.
- **Done & Valuable (P2):** Side-by-side Android + iOS launch frames visually equivalent (logo size, positioning, background, safe-area).

---

## Scope

### In Scope
1. **Static branded native splash:** feeed-me logo/mark on brand-color background.
2. **flutter_native_splash setup in feeedme-app:**
   - Config block (pubspec.yaml) generates Android 12+ / iOS assets.
   - No custom Activity (modern SplashScreen API only).
   - Correct density assets (2.0x, 3.0x).
3. **Mask-not-fake behavior:** Splash gates on real init chain (main() sequential await), dismisses on completion. No artificial timer.
4. **Brand-fidelity frame:** Logo + background consistent with in-app visual language.
5. **Cross-platform parity check:** Android + iOS launch frames equivalent.

### Out of Scope
- Custom interactive splash animation or transitions (P3 defer, only if v1 metrics justify).
- Loading progress indicators (beyond the splash itself).
- Backend integration (app-only, no server work).
- A/B testing or splash variants per user segment.

---

## Market & Competitive Insight

### Competitive Landscape
- **Pawprint:** Owner-facing medical records + vaccination/vet-visit tracking, clinic integration. Freemium.
- **11pets:** Owner-facing vaccination/hygiene/health-appointment tracker + vet reminders. Free + Pro tier.
- **Remewdy:** Pet medication tracker. Free tier (one pet, full med tracking + reminders) + $99.99 Lifetime purchase.
- **PetDesk:** Vet-clinic-partnership app (clinic-branded, appointment/reminder). B2B2C distribution.
- **PetPace:** Hardware sensor collar + companion app (health monitoring). Device-led monetization.
- **Dogo:** Training/behavior app. Free + paid subscription. Indirect competitor in onboarding/first-impression UX.

### Differentiation
None of the above own an on-brand, trust-signaling splash on modern native APIs. feeed-me's splash = **first-mover edge in perceived polish + brand identity at cold-start**, cheap insurance against perception of incomplete ports (iOS vs Android). Reinforce "Your pet's health, your way" tone before user touches any feature.

---

## Feature Set with User Value & Priority

### Feature 1: Modern Native Splash (Android 12+ SplashScreen API + iOS launch)

**User Value:** Every user — 100% on every cold start — sees clean branded first frame with zero double-splash flicker + zero added launch latency. Feels instant, professional, native to each OS.

**Priority:** P0

**Unit Economics:** Near-zero cost lever. Single `flutter_native_splash` config generates Android + iOS assets. No custom Activity to maintain. Avoids legacy double-splash tech debt = saved future eng hours. Buys brand recall at ~0 marginal cost.

**Acceptance Criteria:**
- On cold start, Android 12+ shows OS SplashScreen-API frame (not legacy custom Activity).
- iOS shows equivalent launch frame.
- Exactly ONE splash visible (no flash/double-splash).
- No measurable added launch latency vs no-splash baseline.

---

### Feature 2: Mask-Not-Fake Dismiss-on-Init

**User Value:** App feels instantly fast. Splash overlays genuine offline-first startup work (Firebase init, secure-key resolve, Isar DB open/hydration). Vanishes instant init completes — never artificial wait, never fake loader.

**Priority:** P0

**Unit Economics:** Retention lever. Staying clear of ~12% startup drop-off cliff protects DAU at most fragile moment (cold launch). Honest masking (no min-timer) = no self-inflicted churn. Cost: wiring only, no new infra.

**Acceptance Criteria:**
- Splash gates ONLY on real main() init chain.
- Dismisses on init completion.
- NO minimum-duration timer / NO artificial delay in code.
- Total visible splash duration ≤1.5s on normal cold start on representative device.

---

### Feature 3: Brand-Fidelity Frame

**User Value:** Users get calm, trustworthy, unmistakably feeed-me moment. Logo on brand-color background, visually continuous with in-app language so no jarring cut into first screen (PetListScreen).

**Priority:** P1

**Unit Economics:** Brand-recall lever. Consistent day-1 impression compounds into trust + organic word-of-mouth at zero ad spend. Correct density assets prevent blurry-logo support tickets. Cost: one logo export + config.

**Acceptance Criteria:**
- feeed-me logo/mark renders crisp at 2.0x + 3.0x density.
- Brand-color background derived from existing palette (decision pending: #FEFEFE scaffold-continuity vs seafoam #96C1C7).
- Correctly safe-area inset.
- Transition into PetListScreen reads as continuous, not a cut.

---

### Feature 4: Cross-Platform Parity Check

**User Value:** Android + iOS users get equivalent first impression. Brand looks like one identity, not two half-built ports.

**Priority:** P2

**Unit Economics:** Quality-moat lever. Single-identity launch frame reinforces premium, coherent brand at no extra asset cost (same config drives both). Cheap insurance against platform drift.

**Acceptance Criteria:**
- Side-by-side Android + iOS launch frames visually equivalent.
- Logo size, positioning, background, safe-area consistent across platforms.

---

## Technical Feasibility & Risks

### Approach (CTO Assessment)
✅ **FEASIBLE.** App-only, no backend.

**Init chain in lib/main.dart already sequential-await:**
```
WidgetsBinding 
  → Firebase.initializeApp 
  → keyService.getOrCreateKey [ADR-0009 secure storage] 
  → getApplicationDocumentsDirectory 
  → IsarDatabaseOpener.open 
  → runApp
```
Completes BEFORE first Flutter frame = genuine work splash masks.

**Implementation:**
1. Add `flutter_native_splash` dev_dep.
2. One config block gens Android12 SplashScreen-API + legacy + iOS LaunchScreen assets. NO custom Activity (kills double-splash debt).
3. Mask-not-fake by construction: native splash stays until first frame; existing async chain gates that frame on REAL init → dismisses on real completion.
4. NO FlutterNativeSplash min-timer, NO `Future.delayed` → meets "no artificial delay" AC.
5. Brand frame: export brand_logo.png at 2.0x/3.0x; set bg color + color_dark/image_dark (values-night/ already exists, app_theme is light-only).
6. CTO recommends bg #FEFEFE (= scaffoldBackgroundColor) for continuous transition into PetListScreen vs seafoam #96C1C7 hard cut.
7. flutter_native_splash drives BOTH platforms from one config → parity (P2) near-free.

### Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Fail-closed init (keyService.getOrCreateKey / Isar open) uncaught → native splash stuck then crash. Breaks "100% every cold start sees clean frame" AC. | Medium | Wrap main() init in try/catch; on failure runApp error screen (dismisses splash gracefully). Splash scope MUST include failure-path UX, not only happy path. |
| No min-timer + fast init on high-end device → splash visible <300ms could read as flicker. | Medium | Accept the flash; do NOT add min-timer (violates no-artificial-delay AC). Honest masking. Document trade in ADR. |
| Android 12 SplashScreen API masks icon to circle + adds own window/animation → logo may clip/letterbox vs legacy splash. | Low | Design logo within Android-12 icon safe zone; P2 parity check catches divergence; document intentional differences. |
| flutter_native_splash regenerates native files (styles.xml, LaunchScreen.storyboard, launch_background drawable) → overwrites current hand-tuned Flutter-default scaffolding. | Low | Commit before generation; review diffs; version-control all assets. No manual tweaks after generation (regenerate instead). |

### Cross-Repo Impact
- **feeedme-app:** Single repo affected. Config + assets only, no Dart code changes (wiring = main() try/catch pattern already established).
- **feeedme-appium:** No impact (E2E suite will see splash on app launch; snapshot testing may need baseline update if splash changes).

---

## Open Questions

1. **Background color finalization:** #FEFEFE (scaffold continuity) or #96C1C7 (seafoam brand accent)?
   - CTO recommends #FEFEFE for seamless transition into PetListScreen.
   - Pending CPO + UX/UI Designer decision.

2. **Logo animation (P3):** Optional subtle <2s animation post-v1?
   - Only if v1 metrics + clear no-delay implementation justify.
   - Deferred pending initial release feedback.

3. **Failure-path UX (error screen fallback):**
   - Design scope = happy path (splash + init → PetListScreen).
   - Error screen layout TBD in failure-handling ticket.

---

## Roadmap Fit

**Phase:** Foundational Polish (v1.0 or pre-v1.0 polish wave).

**Rationale:**
- Zero-cost brand + perceived-speed lever → high RoI for day-1 impression.
- Eliminates legacy double-splash tech debt from day one (modern Android 12+ API).
- Unblocks future loading/success state designs (reusable splash config).
- Low risk: config-driven, no custom Activity, no new runtime behavior beyond native platform behavior.

**Success = Ship:** Splash lands in main branch, signed off P0 ACs (modern API, mask-not-fake, sub-1.5s), brand-fidelity assets in place, v1 release ready.

---

## Summary

**What:** Modern, branded native splash (feeed-me logo on brand-color background) for offline-first Flutter app cold-start.

**Why:** Own the first frame 100% of users see on cold start. Mask genuine init work. Build brand recall + trust at near-zero cost.

**How:** flutter_native_splash config (Android 12+ SplashScreen API + iOS) + brand assets + init wiring (try/catch).

**Success:** Modern API, mask-not-fake behavior (no timer, ≤1.5s), brand-fidelity frame, cross-platform parity.

**Risk:** Fail-closed init + flicker on fast devices. Mitigated: error-screen fallback + honest design (no min-timer).

**Timeline:** Dependent on asset finalization + Android 12 icon safe-zone design review.
