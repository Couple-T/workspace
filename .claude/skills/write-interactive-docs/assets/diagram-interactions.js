/*
 * Interactive Docs — Diagram Interaction Engine (self-contained, no deps)
 * ----------------------------------------------------------------------
 * Turns every static Mermaid diagram into something the reader can EXPLORE,
 * not just look at. Auto-applied to each `figure.diagram` once Mermaid renders:
 *
 *   • Zoom & pan + reset + fullscreen   — big diagrams become legible
 *   • Hover spotlight                    — hovering a node dims the rest
 *   • Clickable nodes                    — a node can jump to a section,
 *                                          open a detail drawer, or open a URL
 *   • Guided walkthrough (optional)      — ◀ ▶ step through a flow node-by-node
 *
 * INLINE this whole file in a <script> tag (it injects its own CSS), AFTER the
 * Mermaid <script>. It waits for Mermaid to finish via a MutationObserver, so it
 * doesn't matter whether Mermaid runs on load or you call mermaid.run() yourself.
 *
 * ── Where the interactivity comes from ─────────────────────────────────────
 * Zoom/pan/hover/fullscreen need NO authoring — they apply to every diagram.
 * Click actions + walkthrough are declared in the diagram's export-data island,
 * keyed by each node's id OR its visible label (whichever is handier):
 *
 *   <figure class="diagram" data-block="diagram">
 *     <pre class="mermaid">flowchart LR
 *       U[Pet owner] --> A[App] --> DB[(Local DB)]</pre>
 *     <script type="application/json" class="export-data">
 *       {"type":"diagram","diagramType":"flowchart","title":"Save flow",
 *        "source":"flowchart LR\n U[Pet owner] --> A[App] --> DB[(Local DB)]",
 *        "nodes":{
 *          "Pet owner":{"detail":"The person using the app to log a meal."},
 *          "App":{"section":"architecture","detail":"The offline-first Flutter client."},
 *          "Local DB":{"url":"https://isar.dev","detail":"Isar — the on-device store."}
 *        },
 *        "walkthrough":["Pet owner","App","Local DB"]}
 *     <\/script>
 *   </figure>
 *
 * Per-node config (all optional): { section, url, detail, label }
 *   • section  → click scrolls to [data-section-id="…"] and pulses it
 *   • url      → click opens the link in a new tab
 *   • detail   → click opens a side drawer rendering this markdown
 *   • label    → friendly title for the drawer + the Markdown export
 * `walkthrough` is an ordered list of node keys for the ◀ ▶ guided tour.
 *
 * The island stays the single source of truth: the export engine reads the same
 * `nodes`/detail into the Markdown/JSON export, so the interactive content isn't
 * lost when the doc is handed to an AI.
 *
 * For Mermaid-native click directives (advanced), set securityLevel:"loose" and
 * use `click X call widGo("section-id")` / `click X "https://…"`. The handlers
 * widGo() and widInfo() are exposed globally for that path.
 */
(function () {
  "use strict";

  var REDUCED = typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------- styles ---------------------------------- */
  function injectCSS() {
    if (document.getElementById("wid-dgm-css")) return;
    var css = `
    .wid-dgm-viewport{position:relative; overflow:hidden; max-height:72vh; border-radius:12px;
      background:var(--color-surface-2,rgba(127,127,127,.06)); cursor:grab; touch-action:none}
    .wid-dgm-viewport.is-panning{cursor:grabbing}
    .wid-dgm-viewport > .mermaid{margin:0}
    .wid-dgm-viewport > .mermaid > svg{transform-origin:0 0; will-change:transform; max-width:none!important; height:auto}
    .wid-dgm-tools{position:absolute; top:8px; right:8px; z-index:3; display:flex; gap:4px; align-items:center}
    .wid-dgm-tools button{font:inherit; font-size:13px; line-height:1; cursor:pointer; width:30px; height:30px;
      display:grid; place-items:center; border:1px solid var(--color-border,rgba(127,127,127,.3));
      background:var(--color-surface,#fff); color:var(--color-text,#222); border-radius:8px; box-shadow:0 1px 2px rgba(0,0,0,.12)}
    .wid-dgm-tools button:hover{border-color:var(--color-primary,#3a6df0); color:var(--color-primary,#3a6df0)}
    .wid-dgm-walk{display:flex; gap:4px; align-items:center; margin-right:6px;
      background:var(--color-surface,#fff); border:1px solid var(--color-border,rgba(127,127,127,.3));
      border-radius:999px; padding:2px 4px; box-shadow:0 1px 2px rgba(0,0,0,.12)}
    .wid-dgm-walk .lbl{font-size:12px; color:var(--color-muted,#667); padding:0 4px; min-width:54px; text-align:center}
    .wid-dgm-hint{position:absolute; left:10px; bottom:8px; z-index:3; font-size:11px; color:var(--color-muted,#778);
      background:var(--color-surface,#fff); border:1px solid var(--color-border,rgba(127,127,127,.25));
      border-radius:999px; padding:2px 9px; opacity:.85; pointer-events:none}
    /* hover spotlight + click affordance (Mermaid node groups carry class "node") */
    .wid-dim .node{opacity:.3; transition:${REDUCED ? "none" : "opacity .15s"}}
    .wid-dim .node.wid-hot{opacity:1}
    .wid-dim .edgePaths,.wid-dim .edgeLabels,.wid-dim .relation,.wid-dim .messageLine0,.wid-dim .messageLine1{opacity:.18}
    .node.wid-act{cursor:pointer}
    .node.wid-act:focus{outline:none}
    .node.wid-act:hover :is(rect,circle,polygon,path,ellipse){stroke-width:2.4px}
    .node.wid-act:focus-visible :is(rect,circle,polygon,path,ellipse){stroke-width:2.6px; stroke-dasharray:4 2}
    .node.wid-hot :is(rect,circle,polygon,path,ellipse){filter:drop-shadow(0 0 6px var(--color-accent,#22c3d6))}
    /* section pulse when a node navigates to it */
    @keyframes wid-flash{0%{box-shadow:0 0 0 0 var(--color-accent,#22c3d6)}100%{box-shadow:0 0 0 8px transparent}}
    .wid-flash{animation:${REDUCED ? "none" : "wid-flash 1.1s ease-out"}; border-radius:12px}
    /* fullscreen */
    .wid-dgm-viewport.is-fs{position:fixed; inset:14px; max-height:none; z-index:80; box-shadow:0 20px 80px rgba(0,0,0,.5)}
    /* detail drawer */
    .wid-dgm-panel{position:fixed; top:0; right:0; height:100%; width:min(420px,92vw); z-index:90;
      background:var(--color-surface,#fff); color:var(--color-text,#222);
      border-left:1px solid var(--color-border,rgba(127,127,127,.3)); box-shadow:-12px 0 40px rgba(0,0,0,.25);
      transform:translateX(102%); transition:${REDUCED ? "none" : "transform .22s ease"}; display:flex; flex-direction:column}
    .wid-dgm-panel.is-open{transform:none}
    .wid-dgm-panel header{display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:16px 18px; border-bottom:1px solid var(--color-border,rgba(127,127,127,.25))}
    .wid-dgm-panel header h3{margin:0; font-size:18px}
    .wid-dgm-panel header button{border:none; background:none; font-size:22px; cursor:pointer; color:var(--color-muted,#667); line-height:1}
    .wid-dgm-panel .body{padding:16px 18px; overflow:auto; line-height:1.6}
    .wid-dgm-panel .body code{font-family:ui-monospace,monospace; font-size:.9em;
      background:var(--color-surface-2,rgba(127,127,127,.12)); padding:1px 5px; border-radius:5px}
    .wid-dgm-panel .body a{color:var(--color-primary,#3a6df0)}
    .wid-dgm-scrim{position:fixed; inset:0; z-index:89; background:rgba(0,0,0,.18); opacity:0; pointer-events:none;
      transition:${REDUCED ? "none" : "opacity .2s"}}
    .wid-dgm-scrim.is-open{opacity:1; pointer-events:auto}
    `;
    var s = document.createElement("style");
    s.id = "wid-dgm-css"; s.textContent = css;
    document.head.appendChild(s);
  }

  /* --------------------- tiny markdown for the drawer --------------------- */
  function mdInline(s) {
    return s
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function mdToHtml(md) {
    var lines = String(md || "").split("\n"), html = [], list = false;
    lines.forEach(function (ln) {
      if (/^\s*[-*]\s+/.test(ln)) {
        if (!list) { html.push("<ul>"); list = true; }
        html.push("<li>" + mdInline(ln.replace(/^\s*[-*]\s+/, "")) + "</li>");
      } else {
        if (list) { html.push("</ul>"); list = false; }
        if (ln.trim() === "") html.push("");
        else html.push("<p>" + mdInline(ln) + "</p>");
      }
    });
    if (list) html.push("</ul>");
    return html.join("\n");
  }

  /* ----------------------------- drawer ----------------------------------- */
  var panel, scrim;
  function ensurePanel() {
    if (panel) return;
    scrim = document.createElement("div"); scrim.className = "wid-dgm-scrim";
    panel = document.createElement("div"); panel.className = "wid-dgm-panel";
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Diagram detail");
    panel.innerHTML = '<header><h3></h3><button aria-label="Close" title="Close">×</button></header><div class="body"></div>';
    document.body.append(scrim, panel);
    var close = closePanel;
    panel.querySelector("button").addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  function openPanel(title, md) {
    ensurePanel();
    panel.querySelector("h3").textContent = title || "Detail";
    panel.querySelector(".body").innerHTML = mdToHtml(md);
    panel.classList.add("is-open"); scrim.classList.add("is-open");
  }
  function closePanel() {
    if (panel) { panel.classList.remove("is-open"); scrim.classList.remove("is-open"); }
  }

  /* ------------------------- navigation handler --------------------------- */
  function widGo(sectionId) {
    var el = document.querySelector('[data-section-id="' + sectionId + '"]') ||
             document.getElementById(sectionId);
    if (!el) return;
    try { el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }); } catch (_) {}
    el.classList.remove("wid-flash"); void el.offsetWidth; el.classList.add("wid-flash");
  }
  // Registry so Mermaid-native `click X call widInfo("key")` can find detail text.
  var registry = {};
  function widInfo(key) {
    var cfg = registry[key];
    if (cfg) openPanel(cfg.label || key, cfg.detail || "");
  }

  /* --------------------------- node helpers ------------------------------- */
  function nodeText(g) { return (g.textContent || "").replace(/\s+/g, " ").trim(); }
  // Resolve every key a node could be matched by. Mermaid v11 ids look like
  // "<renderId>-flowchart-<NODEID>-<index>" (the renderId contains digits, and
  // there is NO data-id), so naive parsing fails — we try several strategies and
  // also fall back to the visible label, so islands can be keyed by id OR label.
  function nodeKeys(g) {
    var keys = [];
    var di = g.getAttribute("data-id"); if (di) keys.push(di);          // future-proof
    var id = g.id || "";
    if (id) {
      var noIdx = id.replace(/-\d+$/, "");                              // drop trailing -<index>
      var last = noIdx.match(/([A-Za-z0-9_]+)$/);                       // the NODEID (common: alnum/underscore)
      if (last) keys.push(last[1]);
      var typed = noIdx.match(/-(?:flowchart(?:-v2)?|stateDiagram(?:-v2)?|state|classDiagram|class|er|mindmap|sequence)-(.+)$/);
      if (typed) keys.push(typed[1]);                                   // node ids containing dashes
    }
    var t = nodeText(g); if (t) keys.push(t);                           // match by visible label too
    return keys.filter(function (k, i, a) { return k && a.indexOf(k) === i; });
  }

  function wireNode(g, key, cfg) {
    g.classList.add("wid-act");
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    var verb = cfg.section ? "Go to section" : cfg.url ? "Open link" : "Show detail";
    g.setAttribute("aria-label", (cfg.label || key) + " — " + verb);
    registry[key] = cfg;
    var act = function (e) {
      var vp = g.closest(".wid-dgm-viewport");
      if (vp && vp._panned) return;           // a drag, not a click
      if (e) e.preventDefault();
      if (cfg.section) widGo(cfg.section);
      else if (cfg.url) window.open(cfg.url, "_blank", "noopener");
      else if (cfg.detail) openPanel(cfg.label || key, cfg.detail);
    };
    g.addEventListener("click", act);
    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") act(e);
    });
  }

  /* ------------------------------ enhance --------------------------------- */
  function readIsland(fig) {
    var s = fig.querySelector(":scope > script.export-data");
    if (!s) return null;
    try { return JSON.parse(s.textContent); } catch (e) { return null; }
  }

  function enhance(fig) {
    if (fig.__widDgm) return true;
    var mer = fig.querySelector(".mermaid");
    var svg = mer && mer.querySelector("svg");
    if (!svg) return false;            // Mermaid hasn't rendered yet
    fig.__widDgm = true;

    /* wrap for zoom/pan */
    var vp = document.createElement("div");
    vp.className = "wid-dgm-viewport";
    mer.parentNode.insertBefore(vp, mer);
    vp.appendChild(mer);

    var st = { s: 1, x: 0, y: 0 };
    var apply = function () { svg.style.transform = "translate(" + st.x + "px," + st.y + "px) scale(" + st.s + ")"; };
    var clamp = function (v) { return Math.max(0.4, Math.min(5, v)); };
    var reset = function () { st.s = 1; st.x = 0; st.y = 0; apply(); };

    /* pan */
    var drag = null;
    vp.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, ox: st.x, oy: st.y };
      vp._panned = false; vp.classList.add("is-panning");
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    });
    vp.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) vp._panned = true;
      st.x = drag.ox + dx; st.y = drag.oy + dy; apply();
    });
    var endDrag = function () { drag = null; vp.classList.remove("is-panning"); };
    vp.addEventListener("pointerup", endDrag);
    vp.addEventListener("pointercancel", endDrag);
    vp.addEventListener("pointerleave", endDrag);

    /* wheel zoom toward cursor */
    vp.addEventListener("wheel", function (e) {
      e.preventDefault();
      var ns = clamp(st.s * (e.deltaY < 0 ? 1.12 : 0.89));
      var r = vp.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
      st.x = cx - (cx - st.x) * (ns / st.s);
      st.y = cy - (cy - st.y) * (ns / st.s);
      st.s = ns; apply();
    }, { passive: false });

    /* toolbar */
    var tools = document.createElement("div");
    tools.className = "wid-dgm-tools";
    function tbtn(txt, title, fn) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = txt;
      b.title = title; b.setAttribute("aria-label", title);
      b.addEventListener("click", fn); return b;
    }

    /* walkthrough (optional) */
    var island = readIsland(fig);
    var gNodes = [].map.call(svg.querySelectorAll("g.node"), function (g) { return { g: g, keys: nodeKeys(g) }; });
    var find = function (key) {
      return gNodes.filter(function (o) { return o.keys.indexOf(key) >= 0; })[0];
    };

    /* node click actions from the island */
    if (island && island.nodes) {
      Object.keys(island.nodes).forEach(function (key) {
        var hit = find(key);
        if (hit) wireNode(hit.g, key, island.nodes[key]);
      });
    }

    var walk = island && Array.isArray(island.walkthrough) ? island.walkthrough : null;
    if (walk && walk.length) {
      var idx = -1;
      var box = document.createElement("div"); box.className = "wid-dgm-walk";
      var lbl = document.createElement("span"); lbl.className = "lbl";
      var step = function (i) {
        idx = (i + walk.length) % walk.length;
        svg.classList.add("wid-dim");
        gNodes.forEach(function (o) { o.g.classList.remove("wid-hot"); });
        var hit = find(walk[idx]); var cfg = island.nodes && island.nodes[walk[idx]];
        if (hit) hit.g.classList.add("wid-hot");
        lbl.textContent = (idx + 1) + " / " + walk.length;
        if (cfg && cfg.detail) openPanel((cfg && cfg.label) || walk[idx], cfg.detail);
      };
      var stop = function () { svg.classList.remove("wid-dim"); gNodes.forEach(function (o) { o.g.classList.remove("wid-hot"); }); idx = -1; lbl.textContent = "Tour"; closePanel(); };
      box.append(
        tbtn("◀", "Previous step", function () { step(idx <= 0 ? walk.length - 1 : idx - 1); }),
        lbl,
        tbtn("▶", "Next step / start tour", function () { step(idx + 1); })
      );
      lbl.textContent = "Tour";
      tools.appendChild(box);
      box.appendChild(tbtn("✕", "End tour", stop));
    }

    /* hover spotlight */
    gNodes.forEach(function (o) {
      o.g.addEventListener("mouseenter", function () { svg.classList.add("wid-dim"); o.g.classList.add("wid-hot"); });
      o.g.addEventListener("mouseleave", function () { svg.classList.remove("wid-dim"); o.g.classList.remove("wid-hot"); });
    });

    tools.append(
      tbtn("＋", "Zoom in", function () { st.s = clamp(st.s * 1.2); apply(); }),
      tbtn("－", "Zoom out", function () { st.s = clamp(st.s * 0.8); apply(); }),
      tbtn("⟲", "Reset view", reset),
      tbtn("⤢", "Fullscreen", function () { vp.classList.toggle("is-fs"); reset(); })
    );
    vp.appendChild(tools);

    var hint = document.createElement("div");
    hint.className = "wid-dgm-hint";
    hint.textContent = (island && island.nodes ? "click nodes · " : "") + "scroll to zoom · drag to pan";
    vp.appendChild(hint);

    return true;
  }

  /* ----------------------- wait for Mermaid render ------------------------ */
  function scan() {
    var figs = document.querySelectorAll("figure.diagram, .wid-diagram, [data-block='diagram']");
    var pending = false;
    figs.forEach(function (f) { if (!enhance(f)) pending = true; });
    return pending;
  }

  function start() {
    injectCSS();
    var pending = scan();
    if (!pending) return;
    // Mermaid renders async; observe the DOM until every diagram has an <svg>.
    var obs = new MutationObserver(function () { if (!scan()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    // Safety net: stop observing after 8s regardless.
    setTimeout(function () { obs.disconnect(); }, 8000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.widGo = window.widGo || widGo;
  window.widInfo = window.widInfo || widInfo;
  window.WIDDiagram = { enhance: enhance, openPanel: openPanel, go: widGo };
})();
