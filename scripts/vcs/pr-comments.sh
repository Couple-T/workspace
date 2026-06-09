#!/usr/bin/env bash
# Print a PR/MR's comments / review notes as plain text.
#   ./pr-comments.sh 42
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for a in "$@"; do case "$a" in -h|--help) echo "Usage: pr-comments.sh <number>"; exit 0 ;; esac; done
# shellcheck source=lib.sh
. "$DIR/lib.sh"
[[ $# -ge 1 ]] || die "usage: $(basename "$0") <number>"
vcs_pr_comments "$1"
