#!/usr/bin/env bash
#
# Workspace teardown — mani multi-repo workspace (provider-agnostic template).
#
# Undoes setup: removes the product repos that `mani sync` cloned into the workspace
# root (and the adapter symlinks inside them). These are untracked clones (gitignored
# from the parent repo), so clearing them lets Superset remove the worktree cleanly.
# Nothing persistent lives outside the worktree (no containers/services). Deleting a
# workspace discards its state by design — push uncommitted work in these clones first.
#
set -euo pipefail

cd "$(dirname "$0")/.."

removed=0
for repo in */; do
  repo="${repo%/}"
  # Only the cloned product repos: a top-level dir with a .git entry. Never the
  # workspace's own repo (this script runs from the workspace root, not a child).
  [[ -e "$repo/.git" ]] || continue
  rm -rf "$repo" && echo "==> Removed cloned repo: $repo" && removed=$((removed + 1))
done
echo "==> Done (removed $removed cloned repo(s))."
