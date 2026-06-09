# Localization / i18n (English-first, multi-locale ready)

**English is the primary and source locale** and the fallback for everything. But the app must be built so that **adding a language (Thai, Chinese, …) is just dropping in a translation file** — never a code change hunt. Treat any hard-coded user-facing string as a bug.

> Existing debt: `step1_welcome_step.dart` ships hard-coded Thai strings. Under this standard, user-facing text lives in resource files with **English as the source** — migrate those when you touch that screen.

## The rule

- **No hard-coded user-facing strings.** Every label, button, message, error, empty-state, and placeholder comes from the localization layer.
- **English (`en`) is the source/template locale** and the fallback when a key is missing in another locale.
- **Adding a locale = adding one `.arb` file** (e.g. `app_th.arb`, `app_zh.arb`) + listing the locale. No widget edits.
- Developer-facing text is **not** localized: log messages (Sentry, see observability doc), enum names, ids, analytics keys — keep those English.

## Approach — Flutter's official l10n

Use `flutter_localizations` + `intl` + `gen_l10n` (ARB-based codegen). Do **not** roll a custom string map.

```yaml
# pubspec.yaml
dependencies:
  flutter_localizations:
    sdk: flutter
  intl: any
flutter:
  generate: true   # enables gen_l10n
```

```yaml
# l10n.yaml (repo root)
arb-dir: lib/l10n
template-arb-file: app_en.arb
output-localization-file: app_localizations.dart
nullable-getter: false
```

File layout:
```
lib/l10n/
├── app_en.arb   ← source of truth (keys + English text + descriptions)
├── app_th.arb   ← Thai
└── app_zh.arb   ← Chinese (Simplified)
```

Wire it once in the root app:
```dart
MaterialApp(
  localizationsDelegates: AppLocalizations.localizationsDelegates,
  supportedLocales: AppLocalizations.supportedLocales,
  locale: null, // follow device locale; fall back to en
);
```
Use in widgets: `final l10n = AppLocalizations.of(context); Text(l10n.addPetTitle);`

## ARB conventions

- **Keys are descriptive English camelCase**, namespaced by feature: `addPetWelcomeTitle`, `healthRecordWeightLabel`.
- Always include a `@key` `description` so translators have context.
- **Use ICU placeholders / plurals / select — never concatenate translated fragments.**
  ```json
  "petCount": "{count, plural, =0{No pets yet} =1{1 pet} other{{count} pets}}",
  "@petCount": { "description": "Number of pets on the dashboard",
                 "placeholders": { "count": { "type": "int" } } }
  ```
- **Format dates / numbers / weight with `intl` and the active locale** — don't hard-format. (e.g. birthdate via `DateFormat.yMMMd(locale)`, weight via `NumberFormat`). Note the Notion `MM/DD/YYYY` is storage display only; the app formats per locale.

## Fonts & script coverage (critical)

A locale only works if the font renders its script.

- The current `GoogleFonts.prompt` covers **Latin + Thai** — good for `en`/`th`, **but not CJK**.
- For **Chinese/Japanese/Korean**, configure a CJK-capable fallback (e.g. Noto Sans SC) via the text theme's `fontFamilyFallback`, ideally **per-locale**, so glyphs don't render as tofu boxes (□).
- Centralize this in `core/theme` alongside the typography so every screen inherits correct fallbacks.

## Future-proofing

- **Be RTL-ready** even though en/th/zh are LTR: use `EdgeInsetsDirectional`, `start`/`end`, `Alignment*Directional`, and `TextDirection`-aware widgets instead of hard left/right. Adding Arabic/Hebrew later then "just works."
- **Locale resolution:** follow the device locale, fall back to `en`. Leave room for a future in-app language override (store a chosen locale, drive `MaterialApp.locale`).
- Keep strings out of the domain layer — domain stays pure; presentation resolves text from `AppLocalizations`.

## Checklist (per feature/screen)

- [ ] Zero hard-coded user-facing strings — all via `AppLocalizations`.
- [ ] New keys added to `app_en.arb` (source) with `description` + placeholders.
- [ ] Plurals/selects use ICU syntax; no string concatenation of translated parts.
- [ ] Dates/numbers/weight formatted via `intl` with the active locale.
- [ ] Layout uses directional (`start`/`end`) insets/alignment, not left/right.
- [ ] Text theme has script-appropriate font fallback (Thai now; CJK fallback ready).
- [ ] App still builds/runs correctly with the device set to a non-English locale.
- [ ] Log/analytics/enum text left in English (developer-facing).
