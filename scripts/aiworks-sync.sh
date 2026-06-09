#!/usr/bin/env bash
#
# aiworks-sync.sh  (run it as: aiworks sync) — onboard every repo declared in workspace.config.yaml.
#
# workspace.config.yaml is the SOURCE OF TRUTH: add a repo's URL under products[].repos[]
# and run this to set EVERYTHING up. For each declared repo it runs the full per-repo
# `aiworks add` toolchain (generate the mani.d entry, clone via mani, codegraph index, skill
# packs, hooks/settings, CLAUDE.md, scripts/dev.sh, skill generator, codegraph sync) — reading
# url/kind/lang/distribute/path straight from the config so you never retype them.
#
# Use it to bring up a workspace from a freshly-edited config, or to re-sync the whole set:
# `aiworks add` is idempotent, so repos already set up just report SKIP and move on.
#
# Usage:
#   aiworks sync [<product>] [options]
#
#   <product>             Only sync repos under products[].id == <product> (default: every product).
#   --kind <kind>         Force the kind for ALL synced repos (overrides each entry's kind).
#   --distribute <how>    Override distribute for all synced repos (default: from each entry).
#   --skill-cmd <slash>   Forwarded to `aiworks add`.
#   --claude-timeout <s>  Forwarded to `aiworks add`.
#   --safe-perms          Forwarded to `aiworks add`.
#   --force               Forwarded — re-run already-done steps.
#   -n, --dry-run         List what WOULD be synced (and the add command per repo); run nothing.
#   -h, --help            Show this help.
#
set -uo pipefail

# ── logging ─────────────────────────────────────────────────────────────────────
c_step=$'\033[1;36m'; c_ok=$'\033[1;32m'; c_warn=$'\033[1;33m'; c_err=$'\033[1;31m'; c_dim=$'\033[2m'; c_off=$'\033[0m'
[[ -t 1 ]] || { c_step=; c_ok=; c_warn=; c_err=; c_dim=; c_off=; }
step() { printf '\n%s==> %s%s\n' "$c_step" "$*" "$c_off"; }
warn() { printf '    %s! %s%s\n' "$c_warn" "$*" "$c_off"; }
die()  { printf '%serror: %s%s\n' "$c_err" "$*" "$c_off" >&2; exit 1; }

# Ctrl+C / kill stops the whole sweep, not just the current repo.
trap 'printf "\n%s✗ sync interrupted%s\n" "$c_warn" "$c_off" >&2; exit 130' INT TERM

DIR="$(cd "$(dirname "$0")" && pwd)"
ADD="$DIR/aiworks-add.sh"
[[ -x "$ADD" ]] || die "aiworks-add.sh not found/executable next to aiworks-sync.sh ($ADD)"

# ── args ──────────────────────────────────────────────────────────────────────
PRODUCT="" KIND="" DISTRIBUTE="" SKILL_CMD="" CLAUDE_TIMEOUT="" SAFE=0 FORCE=0 DRY=0
usage() { sed -n '2,/^set -uo/p' "$0" | sed 's/^# \{0,1\}//; s/^#//' | sed '$d'; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --kind)            KIND="${2:-}"; shift 2 ;;
    --distribute)      DISTRIBUTE="${2:-}"; shift 2 ;;
    --skill-cmd)       SKILL_CMD="${2:-}"; shift 2 ;;
    --claude-timeout)  CLAUDE_TIMEOUT="${2:-}"; shift 2 ;;
    --safe-perms)      SAFE=1; shift ;;
    --force)           FORCE=1; shift ;;
    -n|--dry-run)      DRY=1; shift ;;
    -h|--help)         usage; exit 0 ;;
    -*)                die "unknown option: $1   (see -h)" ;;
    *)                 [[ -z "$PRODUCT" ]] || die "unexpected argument: $1 (one <product> only)"; PRODUCT="$1"; shift ;;
  esac
done

# ── locate the workspace root ───────────────────────────────────────────────────
ROOT="$(cd "$DIR/.." && pwd)"
cd "$ROOT" || die "cannot cd to workspace root"
[[ -f "$ROOT/mani.yaml" ]] || die "no mani.yaml in $ROOT — run this from a workspace (next to mani.yaml)"
WC="$ROOT/workspace.config.yaml"
[[ -f "$WC" ]] || die "no workspace.config.yaml in $ROOT — copy workspace.config.example.yaml and declare your repos under products:"

# Parse products[].repos[] → one line per repo:  product \037 url \037 kind \037 lang \037 distribute \037 path
# Indentation contract (see workspace.config.example.yaml): products: at col 0; `  - id:`
# (2sp) per product; `    repos:` (4sp); `      - url:` (6sp) per repo; `        <field>:` (8sp).
parse_repos() {
  awk '
    function val(s){ sub(/^[^:]*:[ \t]*/,"",s); sub(/[ \t]+#.*$/,"",s); gsub(/^["'\'']|["'\'']$/,"",s); return s }
    function setkv(line){ k=line; sub(/^[ \t]*/,"",k)
      if(k ~ /^url:/) url=val(k); else if(k ~ /^kind:/) kind=val(k)
      else if(k ~ /^lang:/) lang=val(k); else if(k ~ /^distribute:/) dist=val(k)
      else if(k ~ /^path:/) path=val(k) }
    function flush(){ if(url!=""){ printf "%s\037%s\037%s\037%s\037%s\037%s\n", prod,url,kind,lang,dist,path }
      url="";kind="";lang="";dist="";path="" }
    /^products:[ \t]*$/ { inp=1; next }
    inp && /^  - id:/ { flush(); prod=val($0); inrepos=0; next }
    inp && /^    repos:[ \t]*$/ { inrepos=1; next }
    inp && /^    [A-Za-z_]/ { inrepos=0; next }
    inrepos && /^      - / { flush(); l=$0; sub(/^      - /,"",l); setkv(l); next }
    inrepos && /^        [A-Za-z_]/ { setkv($0); next }
    /^[A-Za-z_]/ { flush(); inp=0; inrepos=0 }
    END{ flush() }
  ' "$WC"
}

printf '%sSyncing repos declared in workspace.config.yaml%s%s\n' "$c_step" "${PRODUCT:+ (product: $PRODUCT)}" "$c_off"
[[ "$DRY" -eq 1 ]] && printf '  %s(dry run — nothing will be executed)%s\n' "$c_dim" "$c_off"

# ── iterate every declared repo and delegate to aiworks-add.sh ───────────────────
total=0; synced=0; failed=0; noted=()
while IFS=$'\037' read -r prod url kind lang dist path; do   # \037 (US) — empty fields aren't collapsed
  [[ -n "$url" ]] || continue
  [[ -z "$PRODUCT" || "$prod" == "$PRODUCT" ]] || continue
  key="${url%.git}"; key="${key##*/}"; key="${key##*:}"
  [[ -n "$key" ]] || { warn "could not derive a repo name from url '$url' — skipping"; noted+=("$url: bad url"); continue; }
  repokind="$KIND"; [[ -n "$repokind" ]] || repokind="${kind:-generic}"
  total=$((total+1))

  cmd=("$ADD" --url "$url" --product "$prod" --kind "$repokind" -y)
  [[ -n "$path" ]]          && cmd+=(--path "$path")
  [[ -n "$lang" ]]          && cmd+=(--lang "$lang")
  if   [[ -n "$DISTRIBUTE" ]]; then cmd+=(--distribute "$DISTRIBUTE")
  elif [[ -n "$dist" ]];      then cmd+=(--distribute "$dist"); fi
  [[ -n "$SKILL_CMD" ]]      && cmd+=(--skill-cmd "$SKILL_CMD")
  [[ -n "$CLAUDE_TIMEOUT" ]] && cmd+=(--claude-timeout "$CLAUDE_TIMEOUT")
  [[ "$SAFE" -eq 1 ]]        && cmd+=(--safe-perms)
  [[ "$FORCE" -eq 1 ]]       && cmd+=(--force)

  if [[ "$DRY" -eq 1 ]]; then
    printf '  %s%s/%s%s (kind %s) → ' "$c_step" "$prod" "$key" "$c_off" "$repokind"
    printf '%q ' "${cmd[@]}"; printf '\n'
    continue
  fi

  step "Sync $prod/$key  (kind $repokind${path:+, dir $path/})"
  # </dev/null so aiworks-add never consumes this loop's parse stream; its own prompts use
  # /dev/tty and Ctrl+C is signal-based, so both still work.
  if "${cmd[@]}" </dev/null; then synced=$((synced+1))
  else
    rc=$?
    [[ "$rc" -eq 130 ]] && { printf '\n%s✗ interrupted during %s/%s%s\n' "$c_warn" "$prod" "$key" "$c_off" >&2; exit 130; }
    failed=$((failed+1)); noted+=("$prod/$key: aiworks-add exited $rc")
  fi
done < <(parse_repos)

# ── summary ──────────────────────────────────────────────────────────────────────
printf '\n%s──────── sync summary ────────%s\n' "$c_step" "$c_off"
if [[ "$total" -eq 0 ]]; then
  printf '%sNo repos to sync%s%s — declare them under products[].repos[] in workspace.config.yaml (each needs a url + kind).\n' "$c_warn" "${PRODUCT:+ for product '$PRODUCT'}" "$c_off"
elif [[ "$DRY" -eq 1 ]]; then
  printf '%s%d repo(s)%s would be synced (dry run). Re-run without --dry-run to execute.\n' "$c_step" "$total" "$c_off"
else
  printf '%sRepos: %d   synced/ok: %d   failed: %d%s\n' "$c_step" "$total" "$synced" "$failed" "$c_off"
  if [[ "${#noted[@]}" -gt 0 ]]; then
    printf '%sNotes:%s\n' "$c_warn" "$c_off"; for n in "${noted[@]}"; do printf '  • %s\n' "$n"; done
  fi
  printf '%sNext:%s mirror any newly-onboarded repos into the .claude/workflows/dev-cycle.js CONFIG `REPOS` block (each `aiworks add` printed a paste-ready entry).\n' "$c_step" "$c_off"
fi
[[ "$failed" -eq 0 ]]
