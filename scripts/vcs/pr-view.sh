#!/usr/bin/env bash
# Print a PR/MR's state and merge SHA.
#   ./pr-view.sh 42      ->  state=MERGED
#                            merge_sha=abc123…
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for a in "$@"; do case "$a" in -h|--help) echo "Usage: pr-view.sh <number>"; exit 0 ;; esac; done
# shellcheck source=lib.sh
. "$DIR/lib.sh"
[[ $# -ge 1 ]] || die "usage: $(basename "$0") <number>"
vcs_pr_view "$1"
