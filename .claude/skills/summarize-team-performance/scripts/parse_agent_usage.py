#!/usr/bin/env python3
"""Summarize per-AGENT token usage + wall-clock span across ALL transcripts.

Sibling to parse_team_usage.py. That script needs a team name and only matches
the new `You're <Name>, <role>, on team \`<team>\`` spawn format — so it misses
old roll-call teammates ("You are <Name>, the <role>, joining ...") and never
covers solo sessions or the lead. This script auto-discovers EVERY agent in the
project transcript dir, classifies each, and reports usage per agent.

Each transcript file == one agent session. Classification:
  - teammate : exactly one teammate identity (new OR old roll-call format)
  - lead     : many quoted teammate identities (the orchestrator session)
  - solo     : no team identity (a direct chat or a /skill run)

Output is CSV (header + one row per agent, then a TOTAL row) written to stdout —
redirect it to a file or pipe it into a sheet. The TOTAL row's span_seconds holds
the true run window (spans overlap and must not be summed).

Usage:
  parse_agent_usage.py [TARGET ...] [--project-dir DIR] [--team NAME]
                       [--role R] [--name N] [--kind KIND] [--grep PAT]
                       [--latest [N]] [--top N]

  TARGET ...    one or more transcripts to summarize directly (skips discovery):
                a path, a bare filename, or an 8-char id prefix. Use this to
                monitor a single agent run you just kicked off.
  --latest [N]  summarize the N most-recently-active transcripts (default 1) —
                "the agent I just ran". Composes with the filters below.
  --grep PAT    only transcripts whose raw text matches PAT (regex, ci) — handy
                to pin the run that mentions a ticket, e.g. --grep FM-9.
  --team NAME   only agents on that team (matches new-style team or old-style
                quoted team name; substring, case-insensitive)
  --role R      only that role, e.g. development-planner (substring, ci)
  --name N      only that agent name, e.g. George (substring, ci)
  --kind KIND   filter to one of: teammate | lead | solo
  --top N       only the N biggest agents by Mission tokens

Caveats (see SKILL.md): `mission` = input + cache_write + output (the new tokens
this session); cache_read is re-sent context, shown but NOT summed. `span_seconds`
is wall-clock incl. idle — per-row spans overlap, do NOT sum them (the TOTAL row's
span_seconds is the true run window).
"""
import json, re, sys, os, glob, argparse, datetime, csv

# New-style spawn line (one per teammate file; many in the lead file).
NEW_RE = re.compile(r"You're (\w+), ([^,]+?), on team `([^`]+)`")
# Old roll-call spawn line: "You are David, the documentor, joining ..."
# Name may carry a nickname in quotes: Fiona ("Finn").
OLD_RE = re.compile(r"You are (\w+)(?:\s*\(\"?[^)\"]*\"?\))?, (?:the )?([A-Za-z][^,.\n]{1,40}?)[,.\n]")
# Best-effort team name for old-style: 'joining the "team-phase-1"' / 'team "x"'.
OLD_TEAM_RE = re.compile(r'(?:joining the|team)\s+"([^"]+)"')


def parse_ts(s):
    try:
        return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None


def default_project_dir():
    return os.path.expanduser(f"~/.claude/projects/{os.getcwd().replace('/', '-')}")


def first_user_text(records):
    for o in records:
        if o.get("type") != "user":
            continue
        msg = o.get("message")
        if not isinstance(msg, dict):
            continue
        c = msg.get("content")
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            for p in c:
                if isinstance(p, dict) and p.get("type") == "text":
                    return p.get("text", "")
    return ""


def classify(records, head_text):
    """Return (kind, name, role, team) for a transcript."""
    # A real teammate transcript OPENS with its spawn line, so trust the
    # new-style identity only from the first user message. Scanning the whole
    # file would misread any session that merely *quotes* "You're X, role, on
    # team `t`" (e.g. echoed tool output, a pasted summary) as that teammate.
    fu = first_user_text(records)
    m0 = NEW_RE.search(fu)
    if m0:
        return "teammate", m0.group(1), m0.group(2).strip(), m0.group(3)

    # Many distinct identities across the file → the orchestrator (lead) session.
    new = {(m.group(1), m.group(2).strip(), m.group(3)) for m in NEW_RE.finditer(head_text)}
    if len({n for n, _, _ in new}) > 1:
        return "lead", "lead", "orchestrator", next(iter(new))[2]
    # Exactly one identity, but NOT in the opening prompt → a chat that merely
    # quoted it. Fall through to solo rather than claiming it's that teammate.

    # No teammate spawn line — try old roll-call. Only trust it inside a teammate
    # spawn prompt (first user msg starts with a teammate-message wrapper).
    if "teammate-message" in fu:
        m = OLD_RE.search(fu)
        if m:
            tm = OLD_TEAM_RE.search(fu)
            return "teammate", m.group(1), m.group(2).strip().rstrip(" ."), tm.group(1) if tm else "?"

    # Old-style lead: the orchestrator session quotes many "You are X" lines.
    old_names = {m.group(1) for m in OLD_RE.finditer(head_text)}
    if len(old_names) > 1:
        return "lead", "lead", "orchestrator", "?"

    return "solo", None, None, None


def parse_file(path):
    records, ts = [], []
    inp = out = cr = cc = turns = 0
    with open(path, encoding="utf-8", errors="ignore") as fh:
        head = fh.read()
    for line in head.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
        except Exception:
            continue
        records.append(o)
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

    if turns == 0:
        return None
    kind, name, role, team = classify(records, head)
    # Opening label: the command, or the first meaningful prompt line. Computed
    # for every row (used to label solo runs and shown in the detail panel).
    fu = first_user_text(records).strip()
    cmd = re.search(r"<command-name>/?([\w:-]+)</command-name>", fu)
    if cmd:
        label = f"/{cmd.group(1)}"
    elif fu.startswith("<local-command-caveat>"):
        label = "(local command)"
    else:
        body = re.sub(r"^<teammate-message[^>]*>\s*", "", fu)
        label = (next((ln for ln in body.splitlines() if ln.strip()), "") or "(empty)").strip()[:80]
    if kind == "solo":
        name, role = label[:48], ""
    return {
        "file": os.path.basename(path), "kind": kind, "name": name, "role": role,
        "team": team or "", "open": label, "turns": turns, "in": inp, "cacheW": cc, "cacheR": cr,
        "out": out, "mission": inp + cc + out, "span": (max(ts) - min(ts)).total_seconds() if ts else 0,
        "first": min(ts) if ts else None, "last": max(ts) if ts else None,
    }


def resolve_targets(targets, pdir):
    """Map each TARGET (path / filename / id-prefix) to actual transcript files."""
    out = []
    for t in targets:
        if os.path.isfile(t):
            out.append(t); continue
        cand = os.path.join(pdir, t if t.endswith(".jsonl") else t + ".jsonl")
        if os.path.isfile(cand):
            out.append(cand); continue
        hits = glob.glob(os.path.join(pdir, t + "*.jsonl")) or glob.glob(os.path.join(pdir, "*" + t + "*.jsonl"))
        if hits:
            out.extend(hits)
        else:
            print(f"warn: no transcript matches {t!r}", file=sys.stderr)
    return sorted(set(out))


def agent_label(r):
    if r["kind"] == "solo":
        return r["name"]
    if r["kind"] == "lead":
        return f"lead ({r['team']})" if r["team"] not in ("", "?") else "lead"
    return f"{r['name']} ({r['role']})"


def main():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Output: CSV to stdout (header, one row per agent, then a TOTAL row). "
               "All filters compose. Example: parse_agent_usage.py --role development-planner > planner.csv")
    ap.add_argument("targets", nargs="*", metavar="TARGET",
                    help="transcripts to summarize directly: path, filename, or 8-char id-prefix")
    ap.add_argument("--project-dir", default=None,
                    help="override the transcript dir (default: ~/.claude/projects/<encoded-cwd>)")
    ap.add_argument("--team", default=None, help="filter to a team (substring, case-insensitive)")
    ap.add_argument("--role", default=None, help="filter to a role, e.g. development-planner (substring, ci)")
    ap.add_argument("--name", default=None, help="filter to an agent name, e.g. George (substring, ci)")
    ap.add_argument("--kind", choices=["teammate", "lead", "solo"], default=None,
                    help="filter to one kind: teammate | lead | solo")
    ap.add_argument("--grep", default=None, help="only transcripts whose raw text matches this regex (ci)")
    ap.add_argument("--latest", nargs="?", type=int, const=1, default=None, metavar="N",
                    help="summarize the N most-recently-active transcripts (default 1)")
    ap.add_argument("--top", type=int, default=None, metavar="N",
                    help="keep only the N agents with the most Mission tokens")
    args = ap.parse_args()

    pdir = args.project_dir or default_project_dir()
    if args.targets:
        files = resolve_targets(args.targets, pdir)
    else:
        files = sorted(glob.glob(os.path.join(pdir, "*.jsonl")))
    if not files:
        print(f"No transcripts in {pdir}", file=sys.stderr)
        sys.exit(1)

    if args.grep:
        pat = re.compile(args.grep, re.I)
        files = [f for f in files if pat.search(open(f, encoding="utf-8", errors="ignore").read())]
        if not files:
            print(f"No transcript matches --grep {args.grep!r}", file=sys.stderr)
            sys.exit(1)

    rows = [r for r in (parse_file(f) for f in files) if r]
    if args.team:
        t = args.team.lower()
        rows = [r for r in rows if t in r["team"].lower()]
    if args.role:
        rl = args.role.lower()
        rows = [r for r in rows if rl in (r["role"] or "").lower()]
    if args.name:
        nm = args.name.lower()
        rows = [r for r in rows if nm in (r["name"] or "").lower()]
    if args.kind:
        rows = [r for r in rows if r["kind"] == args.kind]
    if not rows:
        print("No matching agents.", file=sys.stderr)
        sys.exit(1)

    if args.latest is not None:
        rows.sort(key=lambda r: (r["last"] or datetime.datetime.min), reverse=True)
        rows = rows[: max(1, args.latest)]
    rows.sort(key=lambda r: r["mission"], reverse=True)
    if args.top:
        rows = rows[: args.top]

    tot = {k: sum(r[k] for r in rows) for k in ("turns", "in", "cacheW", "cacheR", "out", "mission")}
    firsts = [r["first"] for r in rows if r["first"]]
    lasts = [r["last"] for r in rows if r["last"]]
    window = (max(lasts) - min(firsts)).total_seconds() if firsts and lasts else 0

    # CSV to stdout. Mission = input + cache_write + output (the new tokens this
    # session); cache_read is re-sent context, NOT in Mission. The TOTAL row's
    # span_seconds is the run window (spans overlap, so do not sum the per-row ones).
    w = csv.writer(sys.stdout)
    w.writerow(["agent", "kind", "team", "turns", "input", "cache_write", "cache_read",
                "output", "mission", "span_seconds"])
    for r in rows:
        w.writerow([agent_label(r), r["kind"], r["team"], r["turns"], r["in"], r["cacheW"],
                    r["cacheR"], r["out"], r["mission"], round(r["span"])])
    w.writerow([f"TOTAL ({len(rows)} agents)", "", "", tot["turns"], tot["in"], tot["cacheW"],
                tot["cacheR"], tot["out"], tot["mission"], round(window)])


if __name__ == "__main__":
    main()
