#!/usr/bin/env bash
#
# Workspace run — mani multi-repo workspace (provider-agnostic template).
#
# The "run" lifecycle hook (aiworks run -> .superset/run.sh). Like setup.sh and teardown.sh it
# operates on EVERY cloned product repo: for each it delegates to that repo's scripts/dev.sh run
# — the single source of truth for how to build, launch and drive that app as a non-interactive
# agent path that proves it works and exits with a verdict (scaffolded by `aiworks add` step 10).
# Pass repo name(s) to run only those; default = every cloned repo.
#
# Created/repaired by `aiworks add`/`sync` (scripts/aiworks-superset.sh) so a freshly onboarded
# repo is covered by setup/run/teardown alike. Re-creatable: delete it and re-run add/sync.
#
#   aiworks run                   # run every cloned repo (scripts/dev.sh run each)
#   aiworks run <repo> [<repo>…]  # run only the named repo(s)
#
set -uo pipefail

cd "$(dirname "$0")/.."

# Optional repo-name filter from positional args. No args -> run every cloned repo.
filter=" $* "
want() { [[ "$filter" == "  " ]] && return 0; case "$filter" in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

ran=0 skipped=0 failed=0 notes=()
for repo in */; do
  repo="${repo%/}"
  # Only the cloned product repos: a top-level dir with a .git entry.
  [[ -e "$repo/.git" ]] || continue
  want "$repo" || continue
  if [[ ! -f "$repo/scripts/dev.sh" ]]; then
    echo "==> Skip $repo — no scripts/dev.sh (run 'aiworks sync $repo' to scaffold it)"
    skipped=$((skipped + 1)); notes+=("$repo: no scripts/dev.sh"); continue
  fi
  echo "==> Run $repo  (scripts/dev.sh run)…"
  if ( cd "$repo" && bash scripts/dev.sh run ); then
    ran=$((ran + 1))
  else
    rc=$?
    echo "    ! $repo failed — scripts/dev.sh run exited $rc (diagnose: cd $repo && bash scripts/dev.sh why run)" >&2
    failed=$((failed + 1)); notes+=("$repo: dev.sh run exited $rc")
  fi
done

# A named repo the filter never matched = a typo or an un-cloned repo — surface it.
if [[ "$filter" != "  " ]]; then
  for w in $*; do
    [[ -e "$w/.git" ]] || { echo "==> No cloned repo named '$w' to run" >&2; notes+=("$w: not a cloned repo"); }
  done
fi

echo "==> Done (ran $ran, skipped $skipped, failed $failed)."
[[ "${#notes[@]}" -gt 0 ]] && printf '    • %s\n' "${notes[@]}"
[[ "$failed" -eq 0 ]]
