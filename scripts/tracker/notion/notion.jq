# Notion → plain-text rendering helpers (jq module).
# Included by the ticket scripts:  jq -L <dir> 'include "notion"; ...'

# Render a Notion rich_text array to plain text. Annotations are dropped;
# links are kept as "text (url)" so PR/Figma URLs aren't lost.
def rich_to_text:
  ( . // [] )
  | map(
      (.plain_text // .text.content // "") as $t
      | (.href // null) as $h
      | (if ($h != null and $h != "" and $h != $t) then "\($t) (\($h))" else $t end)
    )
  | join("");

# Render a single block to {list, text}: `list` marks tight list items so the
# assembler can keep them on adjacent lines.
def block_text:
  . as $b
  | $b.type as $t
  | (($b[$t].rich_text // []) | rich_to_text) as $x
  | if   $t == "paragraph"          then {list:false, text:$x}
    elif $t == "heading_1"          then {list:false, text:("# "   + $x)}
    elif $t == "heading_2"          then {list:false, text:("## "  + $x)}
    elif $t == "heading_3"          then {list:false, text:("### " + $x)}
    elif $t == "bulleted_list_item" then {list:true,  text:("- "   + $x)}
    elif $t == "numbered_list_item" then {list:true,  text:("- "   + $x)}
    elif $t == "to_do"              then {list:true,  text:((if $b.to_do.checked then "[x] " else "[ ] " end) + $x)}
    elif $t == "quote"              then {list:false, text:("> " + $x)}
    elif $t == "callout"            then {list:false, text:$x}
    elif $t == "toggle"             then {list:false, text:("▸ " + $x)}
    elif $t == "code"               then {list:false, text:(($b.code.rich_text // []) | map(.plain_text) | join(""))}
    elif $t == "divider"            then {list:false, text:"----------"}
    elif $t == "image"              then (($b.image.external.url // $b.image.file.url // "") as $u | {list:false, text:(if $u == "" then "" else "[image: \($u)]" end)})
    elif $t == "bookmark"           then {list:false, text:($b.bookmark.url // "")}
    elif $t == "child_page"         then {list:false, text:("📄 " + ($b.child_page.title // ""))}
    else {list:false, text:$x}
    end;

# Render an array of blocks to plain text: list items stay tight (single
# newline), other blocks are separated by a blank line.
def render_blocks_text:
  [ .[] | block_text | select(.text != "") ]
  | reduce .[] as $b ( {out:"", started:false, prevList:false};
      (if (.started | not) then ""
       elif ($b.list and .prevList) then "\n"
       else "\n\n" end) as $sep
      | {out: (.out + $sep + $b.text), started:true, prevList:$b.list}
    )
  | .out;

# The page's title property value as plain text.
def page_title_text:
  ( [ .properties[] | select(.type == "title") ][0].title // [] )
  | map(.plain_text // "") | join("");

# Render a single page-property value to plain text.
def prop_to_text:
  . as $p
  | $p.type as $t
  | if   $t == "title"            then ($p.title     | rich_to_text)
    elif $t == "rich_text"        then ($p.rich_text | rich_to_text)
    elif $t == "select"           then ($p.select.name // "")
    elif $t == "status"           then ($p.status.name // "")
    elif $t == "multi_select"     then ($p.multi_select | map(.name) | join(", "))
    elif $t == "people"           then ($p.people | map(.name // .id) | join(", "))
    elif $t == "date"             then (($p.date.start // "") + (if ($p.date.end // null) then " → \($p.date.end)" else "" end))
    elif $t == "unique_id"        then ((if ($p.unique_id.prefix // null) then "\($p.unique_id.prefix)-" else "" end) + ($p.unique_id.number | tostring))
    elif $t == "last_edited_time" then $p.last_edited_time
    elif $t == "created_time"     then $p.created_time
    elif $t == "url"              then ($p.url // "")
    elif $t == "number"           then (if ($p.number // null) == null then "" else ($p.number | tostring) end)
    elif $t == "checkbox"         then (if $p.checkbox then "yes" else "no" end)
    elif $t == "files"            then ($p.files | map(.name // "file") | join(", "))
    else ""
    end;

# Render all non-title, non-empty properties as aligned "Key: value" lines.
def props_text:
  [ .properties | to_entries[]
    | select(.value.type != "title")
    | {k: .key, v: (.value | prop_to_text)}
    | select(.v != null and .v != "") ]
  | (map(.k | length) | max // 0) as $w
  | map( .k + ":" + (" " * ($w - (.k | length) + 1)) + .v )
  | join("\n");

# --- Markdown → Notion blocks (write side) ----------------------------------
# The inverse of render_blocks_text: turn a Markdown spec into page-body block
# objects so the full ticket spec lands in the page BODY (like a feature ticket),
# not a comment. Supports the subset the ticket templates use: headings, bullet /
# numbered / to-do lists, quotes, dividers, fenced ``` code blocks, paragraphs.

# Split a long string into <=2000-char rich_text objects (Notion's per-object cap).
def _rt_chunks($n):
  if (length <= $n) then [.] else [.[0:$n]] + (.[$n:] | _rt_chunks($n)) end;
def _rich($s):
  ($s // "")
  | if length == 0 then []
    else (_rt_chunks(2000) | map({type: "text", text: {content: .}}))
    end;
# {object:"block", type:$type, ($type): $payload}
def _blk($type; $payload): {object: "block", type: $type} + {($type): $payload};

# Map one (non-fence, non-blank) line to a block. Order matters: dividers and
# checkboxes are matched before the plain "- " bullet they superficially resemble.
def _line_to_block:
  . as $l
  | if   ($l|test("^### "))            then _blk("heading_3";          {rich_text: _rich($l|sub("^### ";""))})
    elif ($l|test("^## "))             then _blk("heading_2";          {rich_text: _rich($l|sub("^## ";""))})
    elif ($l|test("^# "))              then _blk("heading_1";          {rich_text: _rich($l|sub("^# ";""))})
    elif ($l|test("^[-*] \\[ \\] "))   then _blk("to_do";              {rich_text: _rich($l|sub("^[-*] \\[ \\] ";"")),  checked: false})
    elif ($l|test("^[-*] \\[[xX]\\] "))then _blk("to_do";              {rich_text: _rich($l|sub("^[-*] \\[[xX]\\] ";"")), checked: true})
    elif ($l|test("^-{3,}$"))          then _blk("divider";            {})
    elif ($l|test("^[-*] "))           then _blk("bulleted_list_item"; {rich_text: _rich($l|sub("^[-*] ";""))})
    elif ($l|test("^[0-9]+\\. "))      then _blk("numbered_list_item"; {rich_text: _rich($l|sub("^[0-9]+\\. ";""))})
    elif ($l|test("^> "))              then _blk("quote";              {rich_text: _rich($l|sub("^> ";""))})
    else                                    _blk("paragraph";          {rich_text: _rich($l)})
    end;

# Convert a Markdown string to an array of Notion block objects.
def md_to_blocks:
  ( . // "" ) | gsub("\r"; "") | split("\n")
  | reduce .[] as $l ( {blocks: [], incode: false, buf: []};
      if .incode then
        if ($l|test("^```")) then
          .blocks += [ _blk("code"; {rich_text: _rich(.buf|join("\n")), language: "plain text"}) ]
          | .incode = false | .buf = []
        else .buf += [$l] end
      elif ($l|test("^```")) then .incode = true | .buf = []
      elif ($l|test("^\\s*$")) then .
      else .blocks += [ ($l | _line_to_block) ] end )
  | (if .incode and ((.buf|length) > 0)
     then .blocks + [ _blk("code"; {rich_text: _rich(.buf|join("\n")), language: "plain text"}) ]
     else .blocks end);
