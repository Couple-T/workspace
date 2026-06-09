#!/usr/bin/env bash
# Open (or reuse) a pull request / merge request for the current ticket branch.
# Provider-neutral: github -> gh pr, gitlab -> glab mr. Prints the URL + number=.
#
#   ./open-pr.sh --head feature/FM-9 --base develop --title "FM-9: Add pet" --body "…"
#   ./open-pr.sh --title "FM-9: Add pet" --body "…"        # head=current branch, base=default
#   ./open-pr.sh --title "…" --body "…" --dry-run
#
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: open-pr.sh --title <t> [--base <b>] [--head <h>] [--body <b>] [--dry-run]

Open (or reuse) a PR/MR for HEAD -> BASE in the current repo.

Options:
  --title <text>   PR/MR title (required).
  --base  <branch> Target branch (default: the repo's default branch).
  --head  <branch> Source branch (default: the current branch).
  --body  <text>   PR/MR description (default: empty).
  --dry-run        Print what would run, without pushing or creating anything.
  -h, --help       Show this help and exit.

Environment:
  VCS_PROVIDER     github | gitlab (default: auto-detected from the origin remote).
EOF
}

for a in "$@"; do case "$a" in -h|--help) usage; exit 0 ;; esac; done
# shellcheck source=lib.sh
. "$DIR/lib.sh"

base=""; head=""; title=""; body=""; dry=0
need() { [[ -n "${1:-}" ]] || die "$2"; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)    need "${2:-}" "--base needs a value";  base="$2";  shift 2 ;;
    --head)    need "${2:-}" "--head needs a value";  head="$2";  shift 2 ;;
    --title)   need "${2:-}" "--title needs a value"; title="$2"; shift 2 ;;
    --body)    body="${2:-}"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    -*)        die "unknown option: $1   (see -h)" ;;
    *)         die "unexpected argument: $1   (see -h)" ;;
  esac
done

[[ -n "$title" ]] || die "--title is required (see -h)"
[[ -n "$head" ]]  || head="$(git rev-parse --abbrev-ref HEAD)"
[[ -n "$base" ]]  || base="$(vcs_default_branch)"
[[ "$head" != "$base" ]] || die "head ($head) == base ($base) — nothing to open"

vcs_open_pr "$base" "$head" "$title" "$body" "$dry"
