# Ghostty × Claude Code — Theme Visualizer

See how **Claude Code** looks in every **Ghostty** terminal theme — each card
painted with that theme's *real* color palette, snapshotted straight from a
Ghostty install.

Every card renders the **same Claude Code session**, re-colored by a different
Ghostty theme. Pick the one you like before you set it.

> **Assumes Claude Code is on its `dark-ansi` theme** — the mode where Claude
> emits indexed ANSI colors and lets your terminal's palette decide the real
> colors. In Claude's default themes the colors are hardcoded and don't follow
> your terminal. Set it with `/theme → dark-ansi`.

## Try it

- **Online:** <https://cc-themes-for-ghostty.facundogoni.com.ar>
- **Local:**
  ```bash
  git clone <repo>
  cd ghostty-claude-themes
  npm install
  npm run dev          # http://localhost:4321
  ```

That's it — no terminal capture, no server, no config needed to browse.

## How it works

- **Themes** are snapshotted from a Ghostty install into `src/data/themes.json`
  (40 curated) and `themes-all.json` (every bundled theme, for name resolution).
  Refresh with `npm run extract`.
- **Rendering**: the captured session is normalized to indexed ANSI, then
  rendered to HTML where each color index maps to the theme's palette via CSS
  variables (`--c0`..`--c15`). HTML (not a canvas VT) lets the session breathe
  with real line-height.
- **Content** is a real Claude Code session captured once (see below). The same
  ANSI bytes render under every theme, so differences are purely the palette.
- **Toggles**: sort by readability (contrast score) or default order, and
  switch between 1 and 2 columns.

## Import your own Ghostty theme

Click **＋ Import your Ghostty**, then paste a theme file or your
`~/.config/ghostty/config` (a `theme = Name` line resolves against the full set).
Everything stays in your browser. Tip: `ghostty +show-config` prints your config.

## Updating the reference session (maintainers)

The site renders a real Claude Code capture. To regenerate it:

```bash
# 1. Capture — CLAUDE_CODE_NO_FLICKER=0 forces the classic main-screen
#    (linear, no alt-screen) renderer, which captures cleanly:
CLAUDE_CODE_NO_FLICKER=0 asciinema rec --command claude --overwrite docs/reference-session.cast
#    inside, run `/claude-showcase` (the bundled skill that demos every UI
#    feature in a throwaway sandbox), then exit with Ctrl-D.

# 2. Normalize — replays the capture through a terminal emulator, drops the
#    welcome banner / exit footer, word-wraps to 88 cols, and re-emits a clean
#    static frame using only indexed colors (theme-agnostic):
pip install pyte
python3 scripts/normalize-cast.py        # -> docs/reference-session.ansi
```

The site imports `docs/reference-session.ansi` directly. `.claude/skills/claude-showcase/`
holds the demo skill so anyone can reproduce a comparable capture.

## Deploy (Cloudflare Workers)

```bash
npm run deploy        # astro build && wrangler deploy
```

Static assets only — `wrangler.jsonc` points at `./dist`. Needs `wrangler login`
once.

## Stack

Astro (static) · vanilla JS · indexed-ANSI → HTML renderer (real Ghostty theme
palettes) · Cloudflare Workers static assets.
