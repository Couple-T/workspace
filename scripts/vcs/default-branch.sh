#!/usr/bin/env bash
# Print the default (parent) branch of the repo in the current directory.
#   ./default-branch.sh
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for a in "$@"; do case "$a" in -h|--help) echo "Usage: default-branch.sh   (no args)"; exit 0 ;; esac; done
# shellcheck source=lib.sh
. "$DIR/lib.sh"
vcs_default_branch
echo
