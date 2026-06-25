// Snapshots a curated set of Ghostty themes into src/data/themes.json.
// Run once (or when refreshing the set): `node scripts/extract-themes.mjs`.
// Parsing is done here, at author time, so the build/deploy never depends on
// the local Ghostty install path (Codex pre-flight: vendor, don't read at build).

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreTheme } from '../src/lib/legibility.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR =
  '/Applications/Ghostty.app/Contents/Resources/ghostty/themes';
const OUT = join(__dirname, '..', 'src', 'data', 'themes.json');
// Full name->colors index, lazy-loaded in the browser only to resolve a user's
// `theme = SomeName` reference when they import their own Ghostty config.
const OUT_ALL = join(__dirname, '..', 'src', 'data', 'themes-all.json');

// Curated, recognizable themes. Grouped loosely so the gallery reads well.
// `file` is the exact Ghostty theme filename; `tags` drives filtering.
const CURATED = [
  { file: 'Dracula', tags: ['classic', 'purple'] },
  { file: 'Dracula+', tags: ['classic', 'purple'] },
  { file: 'Nord', tags: ['classic', 'cool'] },
  { file: 'Nordfox', tags: ['cool'] },
  { file: 'TokyoNight', tags: ['classic', 'cool'] },
  { file: 'TokyoNight Storm', tags: ['cool'] },
  { file: 'TokyoNight Moon', tags: ['cool'] },
  { file: 'Catppuccin Mocha', tags: ['classic', 'pastel'] },
  { file: 'Catppuccin Macchiato', tags: ['pastel'] },
  { file: 'Catppuccin Frappe', tags: ['pastel'] },
  { file: 'Gruvbox Dark', tags: ['classic', 'warm'] },
  { file: 'Gruvbox Dark Hard', tags: ['warm'] },
  { file: 'Gruvbox Material Dark', tags: ['warm'] },
  { file: 'Monokai Pro', tags: ['classic', 'warm'] },
  { file: 'Monokai Classic', tags: ['warm'] },
  { file: 'Monokai Soda', tags: ['warm'] },
  { file: 'iTerm2 Solarized Dark', tags: ['classic'] },
  { file: 'Atom One Dark', tags: ['classic', 'cool'] },
  { file: 'One Half Dark', tags: ['cool'] },
  { file: 'Onenord', tags: ['cool'] },
  { file: 'Kanagawa Wave', tags: ['warm', 'muted'] },
  { file: 'Kanagawa Dragon', tags: ['muted'] },
  { file: 'Rose Pine', tags: ['pastel', 'muted'] },
  { file: 'Rose Pine Moon', tags: ['pastel', 'muted'] },
  { file: 'Everforest Dark Hard', tags: ['muted', 'warm'] },
  { file: 'Ayu Mirage', tags: ['muted'] },
  { file: 'Night Owl', tags: ['cool'] },
  { file: 'GitHub Dark Default', tags: ['cool'] },
  { file: 'Material Ocean', tags: ['cool'] },
  { file: 'Melange Dark', tags: ['warm', 'muted'] },
  { file: 'Oxocarbon', tags: ['cool'] },
  { file: 'Carbonfox', tags: ['cool'] },
  { file: 'Cobalt2', tags: ['cool', 'vivid'] },
  { file: 'Cyberpunk', tags: ['neon', 'vivid'] },
  { file: 'Synthwave', tags: ['neon', 'vivid'] },
  { file: 'Synthwave Everything', tags: ['neon', 'vivid'] },
  { file: 'Spacedust', tags: ['warm'] },
  { file: 'Moonfly', tags: ['cool'] },
  { file: 'Tomorrow Night Eighties', tags: ['classic'] },
  { file: 'Flexoki Dark', tags: ['warm', 'muted'] },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

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

/** Parse a Ghostty theme file into a structured object, tolerating junk. */
function parseTheme(text) {
  const palette = new Array(16).fill(null);
  const meta = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key === 'palette') {
      // value looks like "3=#dbba00"
      const sub = val.indexOf('=');
      if (sub === -1) {
        continue;
      }
      const idx = Number.parseInt(val.slice(0, sub).trim(), 10);
      const color = normHex(val.slice(sub + 1));
      if (Number.isInteger(idx) && idx >= 0 && idx <= 15 && color) {
        palette[idx] = color;
      }
    } else {
      const color = normHex(val);
      if (color) {
        meta[key] = color;
      }
    }
  }
  return { palette, meta };
}

/** Relative luminance (sRGB) for sorting light/dark. */
function luminance(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

if (!existsSync(THEMES_DIR)) {
  console.error(`Ghostty themes dir not found: ${THEMES_DIR}`);
  console.error('Install Ghostty or adjust THEMES_DIR, then re-run.');
  process.exit(1);
}

const out = [];
const missing = [];
for (const entry of CURATED) {
  const path = join(THEMES_DIR, entry.file);
  if (!existsSync(path)) {
    missing.push(entry.file);
    continue;
  }
  const { palette, meta } = parseTheme(readFileSync(path, 'utf8'));

  // Fallbacks: a faithful default keeps the renderer total even if a slot is
  // absent in a given theme file.
  const background = meta.background || '#1a1a1a';
  const foreground = meta.foreground || '#dddddd';
  const filled = palette.map((c, i) => c || (i < 8 ? foreground : background));

  out.push({
    name: entry.file,
    tags: entry.tags,
    background,
    foreground,
    cursor: meta['cursor-color'] || foreground,
    selectionBg: meta['selection-background'] || filled[8],
    selectionFg: meta['selection-foreground'] || foreground,
    palette: filled,
    luminance: Number(luminance(background).toFixed(4)),
    isDark: luminance(background) < 0.4,
    legibility: scoreTheme({ background, foreground, palette: filled }),
  });
}

out.sort((a, b) => a.luminance - b.luminance);

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${out.length} curated themes -> ${OUT}`);
if (missing.length) {
  console.warn(`Skipped (not found): ${missing.join(', ')}`);
}

// Full index: every theme in the bundle, keyed by lowercased name, with just
// the colors needed to render. Used to resolve `theme = X` on user import.
const all = {};
for (const file of readdirSync(THEMES_DIR)) {
  const path = join(THEMES_DIR, file);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    continue; // skip dirs / unreadable
  }
  const { palette, meta } = parseTheme(text);
  if (!meta.background && !palette.some(Boolean)) {
    continue; // not a theme file
  }
  const background = meta.background || '#1a1a1a';
  const foreground = meta.foreground || '#dddddd';
  const filled = palette.map((c, i) => c || (i < 8 ? foreground : background));
  all[file.toLowerCase()] = {
    name: file,
    background,
    foreground,
    cursor: meta['cursor-color'] || foreground,
    selectionBg: meta['selection-background'] || filled[8],
    selectionFg: meta['selection-foreground'] || foreground,
    palette: filled,
  };
}
writeFileSync(OUT_ALL, `${JSON.stringify(all)}\n`);
console.log(`Wrote ${Object.keys(all).length} themes -> ${OUT_ALL}`);
