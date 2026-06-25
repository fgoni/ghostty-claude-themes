// Client-side parser for a pasted/uploaded Ghostty theme OR config file.
// Everything stays in the browser — the file never leaves the page.
//
// Handles both shapes:
//   • a theme file:   palette = 0=#..., background = #..., foreground = #...
//   • a full config:  theme = Dracula            (a reference, resolved later)
//                     font-family = "JetBrains Mono"
//                     font-size = 14
// Same tolerant rules as the build-time extractor.

const HEX = /^#?[0-9a-fA-F]{6}$/;

function normHex(v) {
  if (!v) {
    return null;
  }
  let s = v.trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    s = `#${s}`;
  }
  return HEX.test(s) ? s.toLowerCase() : null;
}

function stripQuotes(s) {
  return s.replace(/^["']|["']$/g, '').trim();
}

/**
 * @param {string} text raw file contents
 * @returns {{
 *   colors: object|null,   // a renderable theme if inline colors were present
 *   themeRef: string|null, // a `theme = NAME` reference to resolve
 *   fontFamily: string|null,
 *   fontSize: number|null,
 *   warnings: string[]
 * }}
 */
export function parseGhostty(text) {
  const palette = new Array(16).fill(null);
  const meta = {};
  let themeRef = null;
  let fontFamily = null;
  let fontSize = null;
  const warnings = [];

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim().toLowerCase();
    const val = line.slice(eq + 1).trim();

    if (key === 'palette') {
      const sub = val.indexOf('=');
      if (sub === -1) {
        continue;
      }
      const idx = Number.parseInt(val.slice(0, sub).trim(), 10);
      const color = normHex(val.slice(sub + 1));
      if (Number.isInteger(idx) && idx >= 0 && idx <= 15 && color) {
        palette[idx] = color;
      }
    } else if (key === 'theme') {
      // May be "Name" or "dark:Name,light:Other" — prefer the dark variant.
      let v = val;
      const darkMatch = v.match(/dark:\s*([^,]+)/i);
      if (darkMatch) {
        v = darkMatch[1];
      } else if (v.includes(',')) {
        v = v.split(',')[0];
      }
      themeRef = stripQuotes(v);
    } else if (key === 'font-family') {
      fontFamily = stripQuotes(val);
    } else if (key === 'font-size') {
      const n = Number.parseFloat(val);
      if (!Number.isNaN(n)) {
        fontSize = n;
      }
    } else {
      const color = normHex(val);
      if (color) {
        meta[key] = color;
      }
    }
  }

  const hasInline = meta.background || palette.some(Boolean);
  let colors = null;
  if (hasInline) {
    const background = meta.background || '#1a1a1a';
    const foreground = meta.foreground || '#dddddd';
    const filled = palette.map((c, i) => c || (i < 8 ? foreground : background));
    if (!palette.some(Boolean)) {
      warnings.push('No palette colors found — using foreground/background only.');
    }
    colors = {
      name: 'Your Ghostty',
      background,
      foreground,
      cursor: meta['cursor-color'] || foreground,
      selectionBg: meta['selection-background'] || filled[8],
      selectionFg: meta['selection-foreground'] || foreground,
      palette: filled,
    };
  }

  if (!colors && !themeRef) {
    warnings.push(
      "Couldn't find a palette, colors, or a `theme =` line. Paste a Ghostty theme file or your config.",
    );
  }

  return { colors, themeRef, fontFamily, fontSize, warnings };
}
