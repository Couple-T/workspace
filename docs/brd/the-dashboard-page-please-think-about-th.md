# BRD: Dashboard Page (Single Home, No Separate Landing)

**Directive:** "The dashboard page — should it be the same page as the landing page?"

**Decision:** ONE home = dashboard. No separate landing. Same page.

---

## 1. Overview & Business Context

**feeed-me** = offline-first Flutter pet-healthcare app. Core user job: "Is my pet's care on track right now?" (vaccines, meds, vet visits, health logs). Top pain points: fragmentation across people/places, missed reminders.

**Market:** Pet-care ~USD 2.7–3.2B (2025), growing 7–18% CAGR. Pet-healthcare segment = ~46% of market in 2026. Healthcare is center of gravity, not side feature.

**Competitors:**
- Direct: 11pets (multi-pet health/grooming/vaccination tracking, freemium + Premium ~€69/$75 for 24h vet support), Pawprint (iOS/Android medical tracker: vaccines, meds, allergies, vet/groomer visits, weight, activity, photo diary), Zovee/Veterian/PetPress (centralized profiles + automated reminders).
- Indirect (B2B): PetDesk (vet-clinic engagement, 7M+ pet owners, telehealth, records, loyalty).
- Indirect (device-led): Pawtrack/Petbiz (GPS collars + companion app).

---

## 2. Business Goals & Success Metrics

### Goals

1. **Settle directive:** ONE home = dashboard. Zero separate marketing landing page. Rationale: offline-first + no backend = zero marketing-funnel role; static landing only adds tap + re-abandonment trap.

2. **Differentiate by STATE, not page.** Empty state (onboarding surface, zero pets) → Populated state (today/this-week summary, pets exist). Same screen. Rationale: forcing returning users through new-user content drives drop-off (77% of installs gone within 3 days).

3. **Empty state = onboarding surface.** Exactly ONE first action: "Add your pet." Not blank canvas. Rationale: one forced action (no choice paralysis) maximizes first-record creation; that record = clean seed Phase-3 intelligence engine trains on.

4. **Populated dashboard answers core job at glance.** Per-pet next actions (vaccines, meds, vet visits, today's health log) in clear priority order. No drilling. Rationale: fastest-growing market slice, largest DAU driver.

5. **Replace PetListScreen as home.** Demote flat pet list to secondary view reachable from dashboard. Rationale: second "home" candidate reintroduces landing-vs-dashboard ambiguity this BRD exists to kill.

6. **Architect for Phase-2 docking.** Nutritional Gap ring + document-expiry alerts dock in later without rebuild.

### Success Metrics

- **First-run activation:** >=60% of first-time users complete Add-your-pet in first session (measured via Firebase Analytics — `empty_state_shown` / `pet_added` events).
- **Cold-start funnel:** splash → dashboard = single home. PetListScreen no longer home route. Exactly one home surface.
- **DAU/retention:** Dashboard is primary engagement loop. Daily glance habit enables contextual commerce (Phase 2) without hard-sell.
- **Zero re-abandonment trap:** Returning users never see new-user content on re-open.

---

## 3. Scope

### In Scope

- **Single-Home Dashboard Shell (F1):** Replaces PetListScreen as nav root. Cold start → splash → dashboard.
- **Warm Empty State (F2):** Zero-pet surface. One primary "Add your pet" CTA (reuses AddPetWizard route). Warm copy, not blank.
- **Populated Dashboard (F3):** Per-pet next-action items. Today/this-week summary. Glanceable (what + when) + tappable to detail. **Top 3 items per pet** (sorted by urgency) + "see all" to expand. Action types without a backing entity render **labeled empty slots** (e.g., "Vaccinations — add first record"), not hidden.
- **Care-Status Verdict + Priority Sort (F4):** At-glance "on track" vs "needs attn" judgment + item ordering by urgency.
- **Navigation:** Back-from-wizard returns to dashboard, not stub.
- **Analytics:** Firebase Analytics events (`empty_state_shown`, `pet_added`) to measure first-run activation.

### Out of Scope

- **Splash screen:** Brief assumes splash → dashboard. Splash design not in current scope.
- **Full scheduling entities:** Vaccine/med/vet-visit action types have NO backing entity in code today (only Pet + WeightRecord exist). V1 renders backed signals only (weight-due, age/species-derived, profile-completeness, reserved affordances). Full next-actions needs separate ticket for scheduling entities before production.
- **Phase-2 features:** Nutritional Gap ring, document-expiry alerts = future docking points, not v1.
- **Web landing funnel:** Offline-first + no backend = no logged-out web funnel. Marketing landing not needed.
- **Reminders / notifications:** Push/local reminders for upcoming actions = **separate feature** (after scheduling entities land). Dashboard is **pull-only** in v1 — user sees next actions only when they open the app.

---

## 4. Feature Set: User Value, Priority, Unit Economics

### F1: Single-Home Dashboard Shell

**User Value:**  
User opens app post-splash + lands on ONE home that does real work — answers "is my pet's care on track?" on sight. No marketing landing, no extra tap, no second "home" to get lost between. Kills tap-tax + re-abandonment trap.

**Priority:** P0 (core nav restructure)

**Unit Economics:**  
Core DAU/retention lever. Removing landing-vs-dashboard ambiguity cuts re-abandonment funnel (77% installs gone in 3 days). Cost: one screen swap as nav root (PetListScreen already owns route); reuses existing AddPetWizard push. Near-zero marginal infra (offline, no backend).

**Acceptance Intent:**  
Cold start → splash → dashboard = single home/nav root. PetListScreen no longer home route. No separate landing screen anywhere. Exactly one home surface. Back-from-wizard returns to dashboard, not stub.

---

### F2: Warm Empty State — Onboarding Surface, One First Action

**User Value:**  
First-time user (zero pets) sees warm, guiding surface — not blank canvas — with exactly ONE meaningful action: "Add your pet." Converts first-run intent into first data record that unlocks whole app.

**Priority:** P0 (first-run activation gate)

**Unit Economics:**  
First-run activation lever — conversion gate for every downstream phase. One forced action (no choice paralysis) maximizes first-record creation; that record = clean seed Phase-3 intelligence engine trains on. Cost: reuse AddPetWizard route + empty-state layout.

**Acceptance Intent:**  
When pet count = 0, dashboard renders onboarding empty state. Single primary "Add your pet" CTA (reuses AddPetWizard). Warm/guiding copy, not blank screen. >=60% of first-time users who reach it complete Add-your-pet in first session, measured via Firebase Analytics.

---

### F3: Populated Dashboard — Today/This-Week Per-Pet Next Actions

**User Value:**  
Returning user with pets sees glanceable today/this-week summary of each pet's next actions (vaccines, meds, vet visits, today's health log) — core job: "what does my pet need now?" answered without drilling.

**Priority:** P0 (primary DAU driver)

**Unit Economics:**  
Primary DAU driver + conversion-loop substrate. Daily glance habit = later pivots into contextual commerce (Phase 2) without hard-sell. Owns largest, fastest-growing slice (pet-healthcare ~46% share 2026). Cost gated by entity availability — V1 may render profile/weight-derived signals + reserved affordances if scheduling entities not in scope.

**Acceptance Intent:**  
When pet count >=1, dashboard shows per-pet next-action items (action types with backing data source in scope) ordered by urgency. **Top 3 items per pet shown by default**, with "see all" to expand the rest. Action types without a backing entity render a **labeled empty slot** ("Vaccinations — add first record"), not hidden. Each item glanceable (what + when) + tappable to detail. Renders correctly offline from local Isar data.

---

### F4: Care-Status Verdict + Priority Sort

**User Value:**  
At-a-glance answer — "on track" vs "needs attn" judgment on each pet. Urgent items bubble to top. User knows which pet needs action first.

**Priority:** P1 (unlocks F3 UX cohesion)

**Unit Economics:**  
Fold over next-action items (F3) to compute verdict. Reduces cognitive load (user doesn't scan all items). Sort/filter by urgency/status. Cost: pure-domain derivation (no infra). Gates F3 polish.

**Acceptance Intent:**  
Each pet card shows care-status badge/color ("on track" / "check soon" / "urgent"). Next-action items sorted by deadline/urgency. User gets answer without reading list.

---

## 5. Technical Feasibility & Risks

**Approach:**  
Dashboard == landing: ONE home surface. Offline-first health app → no marketing landing. Nav root = MaterialApp.home: PetListScreen (lib/main.dart, hardcoded, no router) → swap to DashboardScreen = ~1 line. PetListScreen = pure stub already owning AddPetWizard push route, so dashboard inherits that contract clean.

Build new feature dir: `lib/features/dashboard/{domain,data,presentation}` (feature-first clean arch, matches existing).

DashboardScreen branches on active-pet count (ADR-0004 active-only):
- count==0 → warm empty state + single Add-your-pet CTA (reuses AddPetWizard route)
- count>=1 → per-pet next-action list

Next-action items from pure-domain derivation layer (Health Adviser, specced in CONTEXT.md + ADR-0004 but NOT yet implemented) over local Isar data, returning `Result<T,Failure>`.

Care-status verdict (F4 P1) = sort/fold over those items.

**Key Scope Reshape:**  
F3 next-action types (vaccine/med/vet-visit) have NO backing entity in code today (only Pet + WeightRecord exist) → V1 renders ONLY backed signals: weight-due, age/species-derived, profile-completeness, plus reserved affordances for unmodeled action types. Full next-actions needs new health_record scheduling entities (separate ticket) before production.

No splash screen exists today (brief assumes splash → dashboard) → splash out of current scope.

**Handoff Doc (CTO):**  
[/var/folders/w6/tt2hvxks7rg7s4_dzwyxvd380000gn/T/cto-handoff-dashboard-feasibility.md]

### Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| F3 Populated next-actions promises vaccine/med/vet-visit items but NO scheduling entity exists in code (lib/features/health_record has only WeightRecord). Building full F3 silently expands scope into new entities + Isar schema/migration. | High | Descope F3 v1 to backed signals only (weight-due, age/species-derived, profile, reserved affordances). PO records constraint on ticket: "action types limited to in-scope data sources." File separate ticket for scheduling entities before full F3. |
| Health Adviser (next-action/verdict derivation) specced in CONTEXT.md + ADR-0004 but NOT implemented — only AddPetWeightService exists. F3/F4 depend on building this domain layer from zero. | Medium | Sequence: build pure-domain Health Adviser derivation (no UI dep) first, returning `Result<T,Failure>`; F3/F4 presentation consume it. Unit-testable in isolation, no infra. |
| feeedme-appium UiAutomator2 a11y tree freezes on root route. E2E asserts on wizard/success screens unreliable (red ≠ app bug) — needs Flutter Driver. | Medium | Dashboard cold-start E2E = no splash/wizard render E2E today. Appium can only test "app already has pet" branch. File separate acceptance test ticket. Bypass Appium for cold-start; use Flutter Driver or manual verification for now. |
| Phase-1 Core Utility bet ties to Phase-2 Nutritional Gap ring + Phase-3 intelligence docking. Scope creep during impl → delays Phase-2 readiness. | Medium | Fix feature scope freeze: F1–F4 deliver ONE home + empty state + backed signals only. Scheduling entities + Health Adviser full impl = Phase-3 prep, separate ticket. Ticket constraint: "v1 scoped to Isar Pet + WeightRecord data only." |

---

## 6. Resolved Decisions

_(All open questions resolved by stakeholder, 2026-06-14.)_

1. **Splash screen ownership:** ✅ **Already ticketed separately.** Out of scope for this BRD. Brief assumes splash → dashboard.

2. **Reserved affordances:** ✅ **Show the empty slots.** For action types without a backing entity (vaccine, med, vet-visit, health-log), v1 renders a labeled empty slot ("Vaccinations — add first record"), not hidden. Doubles as a nudge to seed Phase-3 data.

3. **Per-pet card density:** ✅ **Top N — top 3 items per pet** (sorted by urgency) + "see all" to expand. Keeps the at-a-glance promise with multiple pets.

4. **Notification/reminder bridge:** ✅ **Separate feature.** Reminders (local/push for upcoming actions) are NOT in this scope — deferred to a separate ticket after scheduling entities land. Dashboard is pull-only in v1.

5. **Analytics instrumentation:** ✅ **Firebase Analytics.** First-run activation measured via Firebase Analytics events (`empty_state_shown`, `pet_added`); Firebase is already in the stack (`distribute: firebase`).

---

## 7. Roadmap Fit

**Phase-1 Core Utility / Engagement (NOW):**  
- F1–F4: Dashboard replaces home. Empty state = onboarding. Populated = today/this-week summary.
- Removes landing-vs-dashboard ambiguity.
- DAU/retention driver.
- Enables Phase-2 contextual commerce docking.

**Phase-2 Nutritional Gap Ring (depends on F1 completion):**  
- Adds "nutrition score" item to next-action list.
- Triggers context-specific offers (e.g., "Your pet needs omega-3").
- Reuses dashboard item structure.

**Phase-3 Intelligence / Predictive Alerts (depends on Phase-2 + Health Adviser impl):**  
- Scheduling entities (vaccine, med, vet-visit, health-log) fully modeled.
- Health Adviser derivation production-ready.
- Automated next-action generation from historical data.
- Predictive expiry alerts (vaccines overdue in N days).

---

## 8. Glossary & Cross-Links

- **PetListScreen:** Current home route (lib/main.dart). Pure stub. Will be demoted to secondary view.
- **AddPetWizard:** Existing route/feature. F2 empty state CTA reuses it.
- **Health Adviser:** Pure-domain derivation layer (CONTEXT.md + ADR-0004). Computes next-action items + verdict from Isar Pet + health_record data. NOT yet implemented.
- **ADR-0004:** Decisions on active-only pet filtering + Health Adviser contract.
- **CONTEXT.md:** Canonical glossary. Health Adviser, action-type taxonomy, entity definitions.
- **feeedme-app:** Flutter app repo.
- **feeedme-appium:** E2E test suite. Appium UiAutomator2 has known limitation on root route (frozen a11y tree).

---

## 9. Tickets & Dependencies

- **FM-XX:** Single-Home Dashboard Shell (F1). Blocks F2–F4.
- **FM-XX:** Warm Empty State + onboarding (F2). Depends F1.
- **FM-XX:** Populated Dashboard + next-actions (F3). Depends F1 + Health Adviser impl.
- **FM-XX:** Care-Status Verdict + Sort (F4). Depends F3.
- **FM-XX (separate, Phase-3 prep):** Health Adviser domain layer + scheduling entities (vaccine, med, vet-visit, health-log). Gating F3 production-ready.
- **FM-XX (E2E):** Cold-start dashboard Appium E2E (workaround: manual or Flutter Driver until Appium a11y tree fixed).

---

**Status:** Approved for build. No separate landing page. One home, two states.
