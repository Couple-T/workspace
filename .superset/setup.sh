#!/usr/bin/env bash
#
# Workspace setup — mani multi-repo workspace (provider-agnostic template).
#
# The product repos (declared under products[] in workspace.config.yaml, cloned via the
# generated mani.d/<product>.yaml files) are gitignored under the workspace
# root and do NOT travel with a new git worktree. `mani sync` clones the missing ones
# (a no-op for repos already present, so this is safe to re-run). It then seeds the
# adapter .env files and symlinks the adapters into each repo so relative
# `scripts/tracker/…` / `scripts/vcs/…` calls resolve from any repo's working dir.
#
set -euo pipefail

# Always operate from the workspace root, where mani.yaml lives.
cd "$(dirname "$0")/.."

if ! command -v mani >/dev/null 2>&1; then
  echo "error: 'mani' is not installed — run 'brew install mani', then re-run setup." >&2
  exit 1
fi

echo "==> mani sync (cloning any missing product repos)…"
mani sync

# Seed the adapter .env files (git-ignored local config). On a fresh worktree, copy them
# from the root workspace if present; harmless to skip — each adapter also reads env vars.
seed_env() {
  local rel="$1" root_src="${SUPERSET_ROOT_PATH:-}/$rel"
  if [[ ! -f "$rel" && -n "${SUPERSET_ROOT_PATH:-}" && -f "$root_src" ]]; then
    cp "$root_src" "$rel" && echo "==> Seeded $rel from the root workspace."
  fi
}
seed_env "scripts/tracker/.env"
seed_env "scripts/vcs/.env"

# Symlink the adapters into each cloned repo so agents working in cwd=<repo> can call
# `scripts/tracker/…` / `scripts/vcs/…` relatively (the originals live at the root).
# A cloned repo is a top-level dir containing a .git entry (dir or worktree file).
echo "==> Linking adapters into each repo…"
for repo in */; do
  repo="${repo%/}"
  [[ -e "$repo/.git" ]] || continue
  mkdir -p "$repo/scripts"
  for a in tracker vcs; do
    if [[ ! -e "$repo/scripts/$a" ]]; then
      ln -s "../../scripts/$a" "$repo/scripts/$a" && echo "    linked $repo/scripts/$a"
    fi
  done
done

# Start the shared, long-lived MCP service containers (one container shared by every
# client/agent over SSE — replaces the old per-client `docker run` servers that orphaned
# on crash). Idempotent and self-skipping if docker is unavailable. See
# .superset/mcp-compose.yml for the rationale.
echo "==> Starting shared MCP services…"
./.superset/mcp-services.sh up || true

echo "==> Workspace ready. Projects:"
mani list projects
