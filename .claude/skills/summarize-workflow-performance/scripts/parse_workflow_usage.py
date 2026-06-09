#!/usr/bin/env python3
"""Summarize per-role token usage + wall-clock span for one Workflow run.

Twin of summarize-team-performance/parse_team_usage.py, but the run's agents are
subagents spawned by the `Workflow` tool — not `TeamCreate` teammates. They are
matched by the marker that dev-cycle.js prefixes onto every agent prompt:

    [dev-cycle FM-9 role=developer phase=build round=2]

Reads the agents' JSONL transcripts under ~/.claude/projects/<encoded-cwd>/ and
reports, per role#round: turns, input/cacheWrite/cacheRead/output tokens, the
run subtotal, and alive span. Prints a RUN TOTAL and the true run window.

Default output is a paste-ready Markdown table; --csv emits raw CSV.

Usage:
  parse_workflow_usage.py <ticket> [--workflow dev-cycle] [--project-dir DIR] [--csv]

Caveats (see SKILL.md): `run` excludes cache reads (re-sent context); spans are
wall-clock "alive" time incl. idle and MUST NOT be summed — use the run window.
"""
import json, re, sys, os, glob, argparse, datetime, csv


def parse_ts(s):
    try:
        return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def default_project_dir():
    cwd = os.getcwd()
    return os.path.expanduser(f"~/.claude/projects/{cwd.replace('/', '-')}")


def first_user_text(o):
    if o.get("type") != "user":
        return None
    msg = o.get("message") if isinstance(o.get("message"), dict) else None
    c = msg.get("content") if msg else None
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return " ".join(p.get("text", "") for p in c
                        if isinstance(p, dict) and p.get("type") == "text")
    return None


def parse_file(path, marker_re):
    """Return usage dict iff the transcript's first user message carries the
    [<workflow> <ticket> role=… (round=…)] marker; else None (skip orchestrator
    / unrelated sessions)."""
    first_user = None
    inp = out = cr = cc = turns = 0
    ts = []
    with open(path, encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            if first_user is None:
                txt = first_user_text(o)
                if txt and txt.strip():
                    first_user = txt
            if o.get("timestamp"):
                t = parse_ts(o["timestamp"])
                if t:
                    ts.append(t)
            msg = o.get("message") if isinstance(o.get("message"), dict) else None
            u = msg.get("usage") if msg else None
            if u:
                turns += 1
                inp += u.get("input_tokens", 0)
                out += u.get("output_tokens", 0)
                cr += u.get("cache_read_input_tokens", 0)
                cc += u.get("cache_creation_input_tokens", 0)
    m = marker_re.search(first_user or "")
    if not m:
        return None
    role = m.group("role")
    rnd = m.group("round")
    repo = m.groupdict().get("repo") or ""
    base = f"{role}#{rnd}" if rnd else role
    label = f"{repo}/{base}" if repo else base
    span = (max(ts) - min(ts)).total_seconds() if ts else 0
    return {
        "label": label, "role": role, "round": rnd or "", "repo": repo,
        "turns": turns, "in": inp, "cacheW": cc, "cacheR": cr, "out": out,
        # tokens actually processed THIS run = fresh input + cache writes + output.
        "run": inp + cc + out, "span": span,
        "first": min(ts) if ts else None, "last": max(ts) if ts else None,
    }


def fmt_secs(s):
    s = int(round(s))
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m{s % 60:02d}s"
    return f"{s // 3600}h{(s % 3600) // 60:02d}m"


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ticket", help="work-key the run used, e.g. FM-9")
    ap.add_argument("--workflow", default="dev-cycle",
                    help="workflow name in the marker (default: dev-cycle)")
    ap.add_argument("--project-dir", default=None,
                    help="transcript dir (default: ~/.claude/projects/<encoded-cwd>)")
    ap.add_argument("--csv", action="store_true", help="emit raw CSV instead of Markdown")
    ap.add_argument("--all-runs", action="store_true",
                    help="aggregate EVERY run of this ticket; default scopes to the latest run only")
    args = ap.parse_args()

    pdir = args.project_dir or default_project_dir()
    # e.g.  [dev-cycle FM-9 repo=app role=developer phase=build round=2]
    # repo= is optional so single-repo runs (no repo= in the marker) still parse.
    marker_re = re.compile(
        r"\[" + re.escape(args.workflow) + r"\s+" + re.escape(args.ticket) +
        r"(?:\s+repo=(?P<repo>[\w-]+))?"
        r"\s+role=(?P<role>[\w-]+)(?:\s+phase=[\w-]+)?(?:\s+round=(?P<round>\d+))?",
    )
    plain = f"[{args.workflow} {args.ticket} "

    # Recursive: workflow agent transcripts live deep under
    # <pdir>/<session>/subagents/workflows/wf_*/agent-*.jsonl, not at the top level.
    matched = []
    for path in glob.glob(os.path.join(pdir, "**", "*.jsonl"), recursive=True):
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                if plain in fh.read():
                    matched.append(path)
        except Exception:
            continue
    if not matched:
        print(f"No '{args.workflow} {args.ticket}' transcripts in {pdir}", file=sys.stderr)
        sys.exit(1)

    # Scope to ONE run by default. The same ticket can be run through the workflow
    # many times — each run is its own subagents/workflows/wf_<id>/ dir — and summing
    # them would inflate the table. Keep only the transcripts in the most-recently-
    # modified run dir (= the run just finished when the documentor calls this).
    def run_dir(p):
        parts = p.split(os.sep)
        if "workflows" in parts:
            i = parts.index("workflows")
            if i + 1 < len(parts):
                return os.sep.join(parts[: i + 2])
        return os.path.dirname(p)
    if args.all_runs:
        files = matched
    else:
        # Prefer transcripts inside a workflow run dir; ignore the live main-session
        # transcript (it mentions the marker but is not a run and is always newest).
        wf = [p for p in matched if "workflows" in p.split(os.sep)] or matched
        keep = run_dir(max(wf, key=os.path.getmtime))
        files = [p for p in wf if run_dir(p) == keep]

    rows = [parse_file(f, marker_re) for f in sorted(files)]
    rows = [r for r in rows if r and r["turns"] > 0]
    if not rows:
        print(f"Matched files but none carried a parseable marker for "
              f"'{args.workflow} {args.ticket}'", file=sys.stderr)
        sys.exit(1)

    tot = {k: 0 for k in ("turns", "in", "cacheW", "cacheR", "out", "run")}
    for r in rows:
        for k in tot:
            tot[k] += r[k]
    firsts = [r["first"] for r in rows if r["first"]]
    lasts = [r["last"] for r in rows if r["last"]]
    window = (max(lasts) - min(firsts)).total_seconds() if firsts and lasts else 0

    ranked = sorted(rows, key=lambda r: r["run"], reverse=True)

    if args.csv:
        w = csv.writer(sys.stdout)
        w.writerow(["role_round", "turns", "input", "cache_write", "cache_read",
                    "output", "run", "span_seconds"])
        for r in ranked:
            w.writerow([r["label"], r["turns"], r["in"], r["cacheW"], r["cacheR"],
                        r["out"], r["run"], round(r["span"])])
        w.writerow(["RUN TOTAL", tot["turns"], tot["in"], tot["cacheW"], tot["cacheR"],
                    tot["out"], tot["run"], round(window)])
        return

    # Markdown (default) — paste-ready.
    out = []
    out.append(f"> `{args.workflow} {args.ticket}` — **Run** = input+cache-write+output (new tokens this run; "
               f"excludes cache-read re-reads). **Alive** = wall-clock span incl. idle — do not sum; "
               f"use the run window. Orchestrator session excluded.")
    out.append("")
    out.append("| Role#round | Turns | Input | Cache-write | Cache-read | Output | Run | Alive |")
    out.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    for r in ranked:
        out.append(f"| {r['label']} | {r['turns']} | {r['in']:,} | {r['cacheW']:,} | "
                   f"{r['cacheR']:,} | {r['out']:,} | {r['run']:,} | {fmt_secs(r['span'])} |")
    out.append(f"| **RUN TOTAL** | **{tot['turns']}** | **{tot['in']:,}** | **{tot['cacheW']:,}** | "
               f"**{tot['cacheR']:,}** | **{tot['out']:,}** | **{tot['run']:,}** | "
               f"**{fmt_secs(window)}** (run window) |")
    print("\n".join(out))


if __name__ == "__main__":
    main()
