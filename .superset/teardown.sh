#!/usr/bin/env bash
#
# Workspace teardown — mani multi-repo workspace (provider-agnostic template).
#
# Undoes setup: stops the shared MCP service containers, then removes the product repos
# that `mani sync` cloned into the workspace root (and the adapter symlinks inside them).
# The clones are untracked (gitignored from the parent repo), so clearing them lets
# Superset remove the worktree cleanly. Deleting a workspace discards its state by design
# — push uncommitted work in these clones first.
#
set -euo pipefail

cd "$(dirname "$0")/.."

# Stop the shared MCP stack and reap any stray per-client MCP containers (orphans left by
# the old per-agent `docker run` model). Self-skips if docker is unavailable.
echo "==> Stopping shared MCP services…"
./.superset/mcp-services.sh down || true
./.superset/mcp-services.sh reap || true

removed=0
for repo in */; do
  repo="${repo%/}"
  # Only the cloned product repos: a top-level dir with a .git entry. Never the
  # workspace's own repo (this script runs from the workspace root, not a child).
  [[ -e "$repo/.git" ]] || continue
  rm -rf "$repo" && echo "==> Removed cloned repo: $repo" && removed=$((removed + 1))
done
echo "==> Done (removed $removed cloned repo(s))."
