#!/usr/bin/env python3
"""Summarize per-role token usage + wall-clock span for an Agent Team run.

Reads the teammates' JSONL transcripts under ~/.claude/projects/<encoded-cwd>/
and reports, per role: turns, input/cacheWrite/cacheRead/output tokens, total,
and alive span. Prints a team total and the true run window (min->max ts).

Output is CSV (header + one row per role, then a TEAM TOTAL row) to stdout. The
TEAM TOTAL row's span_seconds holds the mission wall-clock (create → delete); the
lead/orchestrator session is excluded — its tokens aren't bounded to the mission.

Usage:
  parse_team_usage.py <team-name> [--project-dir DIR]

Caveats (see SKILL.md): `total` is dominated by cache reads (cheap); spans are
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
    encoded = cwd.replace("/", "-")
    return os.path.expanduser(f"~/.claude/projects/{encoded}")


def find_transcripts(project_dir, team):
    hits = []
    marker = f"on team `{team}`"
    for path in glob.glob(os.path.join(project_dir, "*.jsonl")):
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                head = fh.read()
        except Exception:
            continue
        if marker in head or team in head:
            hits.append(path)
    return sorted(hits)


def parse_file(path, team):
    # A genuine teammate transcript OPENS with its spawn prompt: "You're <Name>,
    # <role>, on team `<team>`". Trust the identity only from that first user
    # message — scanning the whole file would miscount the lead (quotes every
    # teammate) or any session that merely echoes a spawn line as a teammate.
    ident_re = re.compile(r"You're (\w+), ([^,]+?), on team `" + re.escape(team) + "`")
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
            if first_user is None and o.get("type") == "user":
                msg = o.get("message") if isinstance(o.get("message"), dict) else None
                c = msg.get("content") if msg else None
                txt = c if isinstance(c, str) else (
                    " ".join(p.get("text", "") for p in c if isinstance(p, dict) and p.get("type") == "text")
                    if isinstance(c, list) else "")
                if txt.strip():
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
    # Identity must appear in the opening prompt; otherwise it's the lead or an
    # unrelated session that just mentions the team — skip it.
    m = ident_re.search(first_user or "")
    if not m:
        return None
    nm, rl = m.group(1), m.group(2).strip()
    span = (max(ts) - min(ts)).total_seconds() if ts else 0
    return {
        "role": (nm, rl), "turns": turns, "in": inp, "cacheW": cc, "cacheR": cr,
        "out": out,
        # tokens actually processed THIS mission = fresh input + cache writes + output.
        # Excludes cache-read re-reads (already-counted context re-sent each turn).
        "mission": inp + cc + out, "span": span,
        "first": min(ts) if ts else None, "last": max(ts) if ts else None,
    }


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Output: CSV to stdout (header, one row per role, then a TEAM TOTAL row). "
               "The lead/orchestrator session is excluded. "
               "Example: parse_team_usage.py fm8-pipeline > mission.csv")
    ap.add_argument("team", help="team name, e.g. fm8-pipeline (matches the `on team \\`<team>\\`` spawn marker)")
    ap.add_argument("--project-dir", default=None,
                    help="override the transcript dir (default: ~/.claude/projects/<encoded-cwd>)")
    args = ap.parse_args()

    pdir = args.project_dir or default_project_dir()
    files = find_transcripts(pdir, args.team)
    if not files:
        print(f"No transcripts for team '{args.team}' in {pdir}", file=sys.stderr)
        sys.exit(1)

    rows = [parse_file(f, args.team) for f in files]
    rows = [r for r in rows if r and r["turns"] > 0]
    rows.sort(key=lambda r: r["first"] or datetime.datetime.max)

    tot = {k: 0 for k in ("turns", "in", "cacheW", "cacheR", "out", "mission")}
    for r in rows:
        for k in tot:
            tot[k] += r[k]
    firsts = [r["first"] for r in rows if r["first"]]
    lasts = [r["last"] for r in rows if r["last"]]
    run_window = (max(lasts) - min(firsts)).total_seconds() if firsts and lasts else 0

    # CSV to stdout, ranked by Mission. Mission = input + cache_write + output
    # (the new tokens this mission); cache_read is re-sent context, NOT in Mission.
    # The TEAM TOTAL row's span_seconds is the mission wall-clock (create → delete);
    # per-row spans overlap and must not be summed. The lead is excluded upstream.
    w = csv.writer(sys.stdout)
    w.writerow(["name", "role", "turns", "input", "cache_write", "cache_read",
                "output", "mission", "span_seconds"])
    for r in sorted(rows, key=lambda r: r["mission"], reverse=True):
        nm, rl = r["role"]
        w.writerow([nm, rl, r["turns"], r["in"], r["cacheW"], r["cacheR"], r["out"],
                    r["mission"], round(r["span"])])
    w.writerow(["TEAM TOTAL", "", tot["turns"], tot["in"], tot["cacheW"], tot["cacheR"],
                tot["out"], tot["mission"], round(run_window)])


if __name__ == "__main__":
    main()
