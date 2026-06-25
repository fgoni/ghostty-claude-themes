# Ghostty × Claude Code — Theme Visualizer

See how **Claude Code** looks in every **Ghostty** terminal theme — rendered by
Ghostty's *real* terminal engine (compiled to WebAssembly via
[`ghostty-web`](https://github.com/coder/ghostty-web)), not a CSS approximation.

Each card is a live terminal running the **same Claude Code session**, re-colored
by a different Ghostty theme. Pick the one you like before you set it.

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
- **Real VT** mode mounts one `ghostty-web` terminal per theme (lazy, as you
  scroll) and writes the same byte stream to each. Toggle it off for a fast
  CSS approximation.
- **Content** is a real Claude Code session captured once (see below). The same
  ANSI bytes render under every theme, so differences are purely the palette.

## Import your own Ghostty theme

Click **＋ Import your Ghostty**, then paste a theme file or your
`~/.config/ghostty/config` (a `theme = Name` line resolves against the full set).
Everything stays in your browser. Tip: `ghostty +show-config` prints your config.

## Updating the reference session (maintainers)

The **Real session** tab replays a real Claude Code capture. To regenerate it:

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

Astro (static) · vanilla JS · `ghostty-web` (Ghostty VT in WASM) · Cloudflare
Workers static assets.
