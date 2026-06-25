#!/usr/bin/env python3
"""Normalize a real Claude Code asciinema capture into a clean, static ANSI
stream the visualizer replays.

The capture (recorded with CLAUDE_CODE_NO_FLICKER=0 = classic main-screen
renderer) is linear but full of Ink's incremental redraws. We replay it through
a terminal emulator (pyte), take the final accumulated screen, and re-emit each
cell as INDEXED SGR — so the result is a single clean frame that:
  - drops the welcome banner (everything before the first `❯` prompt),
  - trims trailing whitespace (so width = real content, not 216),
  - uses only indexed colors (theme-agnostic: every Ghostty theme recolors it).

Output: docs/reference-session.ansi  (raw bytes, imported by the site).
"""

import json
import sys
from pathlib import Path

import pyte

ROOT = Path(__file__).resolve().parent.parent
CAST = ROOT / "docs" / "reference-session.cast"
OUT = ROOT / "docs" / "reference-session.ansi"

# pyte color name -> SGR foreground / background code
FG = {
    "default": 39, "black": 30, "red": 31, "green": 32, "brown": 33,
    "blue": 34, "magenta": 35, "cyan": 36, "white": 37,
    "brightblack": 90, "brightred": 91, "brightgreen": 92, "brightbrown": 93,
    "brightblue": 94, "brightmagenta": 95, "brightcyan": 96, "brightwhite": 97,
}
BG = {k: (v + 10 if v < 90 else v + 10) for k, v in FG.items()}


def load_output(path):
    chunks = []
    with open(path) as fp:
        fp.readline()  # header
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(ev, list) and ev[1] == "o":
                chunks.append(ev[2])
    return "".join(chunks)


def cell_sgr(ch):
    """SGR params for a pyte cell's style (indexed only)."""
    params = []
    fg = FG.get(ch.fg)
    if fg is not None and ch.fg != "default":
        params.append(str(fg))
    bg = BG.get(ch.bg)
    if bg is not None and ch.bg != "default":
        params.append(str(bg))
    if ch.bold:
        params.append("1")
    if ch.italics:
        params.append("3")
    return params


def main():
    data = load_output(CAST)
    screen = pyte.Screen(216, 600)
    stream = pyte.ByteStream(screen)
    stream.feed(data.encode("utf-8", "replace"))

    # Materialize rows as (text, [cells]) and drop trailing blank rows.
    rows = []
    for y in range(screen.lines):
        row = screen.buffer[y]
        max_x = max([x for x in row], default=-1)
        cells = [row[x] for x in range(max_x + 1)]
        text = "".join(c.data for c in cells).rstrip()
        rows.append((text, cells))
    while rows and not rows[-1][0]:
        rows.pop()

    # Drop the welcome banner: everything before the first prompt line (❯).
    start = 0
    for i, (text, _) in enumerate(rows):
        if "❯" in text or "/claude-showcase" in text:
            start = i
            break
    rows = rows[start:]
    # Also drop a leading blank/prompt-echo run so it opens on real content.
    while rows and (not rows[0][0] or rows[0][0].strip() in ("❯", "")):
        rows.pop(0)

    # Drop the exit footer (Ctrl-D hint / closing dividers) from the tail.
    def is_footer(text):
        t = text.strip()
        return "Ctrl-D" in t or "Press Ctrl" in t
    cut = len(rows)
    for i, (text, _) in enumerate(rows):
        if is_footer(text):
            cut = i
            break
    rows = rows[:cut]
    while rows and not rows[-1][0]:
        rows.pop()

    # Drop transient re-render artifacts from the main-screen renderer: the
    # symbol legend (e.g. "● Bash  ⏺ plan  ✓ done  ✗ error") that briefly paints
    # over the buffer and pyte accumulates as a stray line.
    def is_artifact(text):
        t = text.strip()
        return "● Bash" in t and "done" in t and "error" in t and "plan" in t
    rows = [r for r in rows if not is_artifact(r[0])]

    def emit(cells):
        """Render a run of pyte cells to indexed-SGR text."""
        line = []
        prev = None
        for ch in cells:
            params = cell_sgr(ch)
            if params != prev:
                line.append("\x1b[0m")
                if params:
                    line.append("\x1b[" + ";".join(params) + "m")
                prev = params
            line.append(ch.data)
        line.append("\x1b[0m")
        return "".join(line)

    def wrap(cells, width):
        """Word-wrap a cell run to <= width visible columns, preserving style.
        Falls back to a hard cut for unbroken runs (e.g. ─── dividers)."""
        if len(cells) <= width:
            return [cells]
        out_runs = []
        i = 0
        n = len(cells)
        while n - i > width:
            brk = -1
            for j in range(i + width, i, -1):
                if cells[j].data == " ":
                    brk = j
                    break
            if brk == -1:
                brk = i + width  # hard cut
            out_runs.append(cells[i:brk])
            i = brk + 1 if brk < n and cells[brk].data == " " else brk
        out_runs.append(cells[i:])
        return out_runs

    def render(width, out_path):
        out = []
        max_w = 0
        for text, cells in rows:
            visible = cells[: len(text)]
            for run in wrap(visible, width):
                out.append(emit(run))
                max_w = max(max_w, len(run))
        out_path.write_text("\r\n".join(out) + "\r\n")
        print(f"Wrote {len(out)} lines, max width {max_w} -> {out_path}")

    # Desktop (wide) and mobile (narrow) variants — the site picks by viewport.
    render(120, OUT)
    render(62, OUT.with_suffix(".mobile.ansi"))


if __name__ == "__main__":
    main()
