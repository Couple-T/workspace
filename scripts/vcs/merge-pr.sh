#!/usr/bin/env bash
# Server-side SQUASH-merge a PR/MR so the web UI marks it Merged (not Closed), then
# print the resulting state + merge SHA. Provider-neutral: gh pr merge / glab mr merge.
#
# This is the low-level primitive: when invoked, it merges. The "auto-merge or not"
# DECISION lives upstream where the config is read — `vcs.auto_merge` (+ per-repo
# `auto_merge`) in workspace.config.yaml, honored by the dev-cycle workflow's Merge
# phase and the self-control-gitflow skill. They simply don't call this when it's off.
#
#   ./merge-pr.sh 42 --subject "FM-9: Add user profile screen"
#   ./merge-pr.sh 42 --subject "…" --dry-run
#
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: merge-pr.sh <number> [--subject <text>] [--dry-run]

Squash-merge a PR/MR through the host so it shows as Merged, then print pr-view.

Options:
  --subject <text>  Squash commit subject (default: the PR/MR title).
  --dry-run         Print what would run, without merging.
  -h, --help        Show this help and exit.
EOF
}

for a in "$@"; do case "$a" in -h|--help) usage; exit 0 ;; esac; done
# shellcheck source=lib.sh
. "$DIR/lib.sh"

num=""; subject=""; dry=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --subject) subject="${2:-}"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    -*)        die "unknown option: $1   (see -h)" ;;
    *)         num="$1"; shift ;;
  esac
done

[[ -n "$num" ]] || die "usage: $(basename "$0") <number> [--subject <text>]"
vcs_merge_pr "$num" "$subject" "$dry"
