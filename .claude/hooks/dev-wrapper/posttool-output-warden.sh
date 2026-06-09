#!/usr/bin/env bash
#
# PostToolUse(Bash) hook — oversized-output warden.
#
# IMPORTANT: PostToolUse is observational — it fires AFTER the tool ran and CANNOT
# modify/truncate the output the model already received. So this hook does not shrink
# the current result. Instead, when a Bash command dumped a large amount of text into
# context, it injects a short note (hookSpecificOutput.additionalContext) steering the
# agent to BOUND output next time — redirect to a file + grep/tail, or use scripts/dev.sh
# for builds (which logs full output and prints a one-line summary).
#
# Stays quiet for normal-sized output. Always exits 0 (PostToolUse cannot block anyway).

set -uo pipefail

MAX_BYTES=8000   # ~ a couple of screens; tune to taste
MAX_LINES=200

input=$(cat)

# Bash tool output may arrive as a string or an object — collect the likely fields.
text=$(printf '%s' "$input" | jq -r '
  .tool_response as $r
  | if ($r | type) == "string" then $r
    elif ($r | type) == "object" then
      ([$r.text, $r.stdout, $r.stderr, $r.output] | map(select(. != null)) | join("\n"))
    else "" end' 2>/dev/null)
[ -z "$text" ] && exit 0

bytes=$(printf '%s' "$text" | wc -c | tr -d ' ')
lines=$(printf '%s' "$text" | wc -l | tr -d ' ')

if [ "${bytes:-0}" -le "$MAX_BYTES" ] && [ "${lines:-0}" -le "$MAX_LINES" ]; then
  exit 0
fi

cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null)

note="⚠️ The previous Bash command returned ${lines} lines (~${bytes} bytes) into your context"
[ -n "$cmd" ] && note="$note: \`${cmd}\`"
note="$note. PostToolUse can't shrink output already received, so for next time keep context lean: redirect verbose output to a file and inspect just what you need — e.g. \`<cmd> > /tmp/out.log 2>&1\` then \`grep -n <pattern> /tmp/out.log\` or \`tail -n 40 /tmp/out.log\`. For Flutter/Dart builds, use \`scripts/dev.sh test|gen|analyze|clean\` (full log to agent_logs/executed_verbose/, one-line summary to stdout) and \`scripts/dev.sh why <name>\` for failure detail."

jq -n --arg c "$note" '{
  hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: $c },
  suppressOutput: true
}'
exit 0
