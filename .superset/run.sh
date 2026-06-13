#!/usr/bin/env bash
#
# Workspace run — launch the feeed-me app for preview.
#
# Superset executes the `run` command from the workspace root (where .superset/config.json
# lives). The only runnable artifact in this workspace is the Flutter app (feeedme-app);
# feeedme-appium is the E2E test suite, not a runnable app.
#
# This delegates to feeedme-app's OWN dev tooling rather than reinventing it:
#   • codegen runs through `feeedme-app/scripts/dev.sh gen` (the repo's build_runner
#     wrapper — quiet stdout, full log under agent_logs/). The app's Isar / json /
#     riverpod `*.g.dart` files MUST be generated or the build fails.
# The one thing the repo's own .superset/run.sh can't do is pick a device — it ends in a
# bare `flutter run`, which aborts on this machine ("more than one device connected":
# macOS + Chrome + a simulator). So the WORKSPACE layer owns device selection (below) and
# pins `flutter run -d <target>`.
#
# WHY MOBILE ONLY — the desktop/web targets are dead-ends for THIS app:
#   • web / chrome → FAILS TO COMPILE: the Isar collections' generated `*.g.dart` files
#     embed 64-bit integer IDs that JavaScript (53-bit-safe ints) can't represent
#     ("integer literal … can't be represented exactly in JavaScript").
#   • macos       → builds + launches but CRASHES at startup: DefaultFirebaseOptions
#     has no `macos` entry (Firebase is only configured for android/ios/web).
#   So we run on the app's REAL targets — an iOS simulator or an Android emulator — where
#   Firebase is configured. This script boots one if none is already running.
#
# Usage — first arg or SUPERSET_RUN_DEVICE picks the target (default: ios):
#   ./.superset/run.sh                 # iOS simulator (boots a default iPhone if needed)
#   ./.superset/run.sh android         # Android emulator (launches the first AVD if needed)
#   ./.superset/run.sh both            # iOS simulator AND Android emulator at once (boots either
#                                      #   if needed). Two parallel `flutter run` sessions, output
#                                      #   line-prefixed [ios]/[android]; hot-reload keys (r/R/q)
#                                      #   are NOT wired in this mode — Ctrl-C stops both. For an
#                                      #   interactive single-device session use `ios` / `android`.
#   ./.superset/run.sh auto            # first already-running device; never auto-boots
#   ./.superset/run.sh <device-id>     # a specific id from `flutter devices`
#   SUPERSET_RUN_DEVICE=android ./.superset/run.sh
# Escape hatches (known-broken for this app, kept for when the app gains support):
#   ./.superset/run.sh macos           # ⚠ crashes at startup (Firebase macos unconfigured)
#   ./.superset/run.sh chrome | web-server   # ⚠ fails to compile (Isar 64-bit IDs); PORT=8080
#
set -euo pipefail

# Always operate from the workspace root, where .superset/ and the cloned repos live.
cd "$(dirname "$0")/.."

APP_DIR="feeedme-app"                    # the Flutter app repo (cloned by setup.sh / mani sync)
PORT="${PORT:-8080}"

command -v flutter >/dev/null 2>&1 || { echo "error: 'flutter' is not on PATH — install Flutter, then re-run." >&2; exit 1; }
[[ -d "$APP_DIR" ]] || { echo "error: '$APP_DIR' not found — run ./.superset/setup.sh first ('mani sync' clones it)." >&2; exit 1; }

DEVICE="${1:-${SUPERSET_RUN_DEVICE:-ios}}"

# ── target resolvers ─────────────────────────────────────────────────────────
booted_ios()      { xcrun simctl list devices booted 2>/dev/null | grep -oE '[0-9A-Fa-f-]{36}' | head -1; }
running_android() { flutter devices --machine 2>/dev/null | grep -oE 'emulator-[0-9]+' | head -1; }

resolve_ios() {                          # echo a booted iOS simulator UDID, booting one if needed
  local udid; udid="$(booted_ios)"
  if [[ -z "$udid" ]]; then
    udid="$(xcrun simctl list devices available 2>/dev/null | grep 'iPhone' | grep -oE '[0-9A-Fa-f-]{36}' | head -1)"
    [[ -n "$udid" ]] || { echo "error: no iOS simulator available — create one in Xcode (Window ▸ Devices & Simulators)." >&2; exit 1; }
    echo "==> Booting iOS simulator ($udid)…" >&2
    xcrun simctl boot "$udid" >/dev/null 2>&1 || true   # harmless if it's already booting
    open -a Simulator >/dev/null 2>&1 || true
    xcrun simctl bootstatus "$udid" >/dev/null 2>&1 || true
  fi
  printf '%s' "$udid"
}

resolve_android() {                      # echo a running Android emulator device id, launching one if needed
  local dev; dev="$(running_android)"
  if [[ -z "$dev" ]]; then
    local avd
    avd="$(flutter emulators 2>/dev/null | awk -F'•' 'NF>=4 && $4 ~ /android/ {gsub(/^ +| +$/,"",$1); print $1; exit}')"
    [[ -n "$avd" ]] || { echo "error: no Android emulator (AVD) found — create one in Android Studio." >&2; exit 1; }
    echo "==> Launching Android emulator '$avd'…" >&2
    flutter emulators --launch "$avd" >/dev/null 2>&1 || true
    local i
    for i in $(seq 1 90); do dev="$(running_android)"; [[ -n "$dev" ]] && break; sleep 2; done
    [[ -n "$dev" ]] || { echo "error: Android emulator '$avd' did not come online in time." >&2; exit 1; }
  fi
  printf '%s' "$dev"
}

resolve_auto() {                         # first already-running/connected device; never auto-boots
  local dev; dev="$(flutter devices --machine 2>/dev/null | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | sed -E 's/.*"([^"]+)"$/\1/' | head -1)"
  [[ -n "$dev" ]] || { echo "error: no running device — boot a simulator/emulator (or use 'ios' / 'android'), then re-run." >&2; exit 1; }
  printf '%s' "$dev"
}

case "$DEVICE" in
  ios|simulator) TARGET="$(resolve_ios)" ;;
  android)       TARGET="$(resolve_android)" ;;
  # Resolve (and boot, if needed) BOTH real devices up front, before pub get / codegen.
  both)          IOS_TARGET="$(resolve_ios)"; AND_TARGET="$(resolve_android)"; TARGET="iOS=$IOS_TARGET + Android=$AND_TARGET" ;;
  auto)          TARGET="$(resolve_auto)" ;;
  *)             TARGET="$DEVICE" ;;     # literal device id / chrome / web-server / macos
esac

cd "$APP_DIR"
echo "==> Resolving dependencies (flutter pub get)…"
flutter pub get

echo "==> Generating code (scripts/dev.sh gen)…"
scripts/dev.sh gen

echo "==> Launching feeed-me on '$TARGET' (requested: '$DEVICE')…"
case "$DEVICE" in
  web-server|web)
    # 0.0.0.0 so a preview is reachable from outside the sandbox; foreground (keeps serving).
    exec flutter run -d web-server --web-hostname 0.0.0.0 --web-port "$PORT"
    ;;
  both)
    # Two devices at once: can't `exec` (two processes), and `flutter run -d all` would also
    # grab macos/chrome — both dead-ends for this app (see header) — so launch one `flutter run`
    # per resolved device. Each stream is line-prefixed via a process substitution, so $! stays
    # the flutter PID (not sed's) and teardown is clean. Ctrl-C / SIGTERM stops both.
    echo "==> hot-reload keys (r/R/q) are not wired in 'both' mode — Ctrl-C stops both sessions."
    pids=()
    flutter run -d "$IOS_TARGET" > >(sed 's/^/[ios]     /') 2>&1 &     pids+=("$!")
    flutter run -d "$AND_TARGET" > >(sed 's/^/[android] /') 2>&1 &     pids+=("$!")
    trap 'echo; echo "==> Stopping both sessions…"; kill "${pids[@]}" 2>/dev/null || true' INT TERM
    wait "${pids[@]}"
    ;;
  *)
    exec flutter run -d "$TARGET"
    ;;
esac
