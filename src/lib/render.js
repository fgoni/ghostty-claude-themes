// Maps a parsed Ghostty theme to the inline CSS custom properties a card needs,
// so every role class / span resolves against that theme's palette.

/**
 * Inline CSS custom properties for one theme.
 * @param {object} theme a themes.json entry
 * @returns {string} a `style` attribute value
 */
export function themeVars(theme) {
  const vars = [
    `--bg:${theme.background}`,
    `--fg:${theme.foreground}`,
    `--cursor:${theme.cursor}`,
    `--sel-bg:${theme.selectionBg}`,
    `--sel-fg:${theme.selectionFg}`,
  ];
  theme.palette.forEach((c, i) => {
    vars.push(`--c${i}:${c}`);
  });
  return vars.join(';');
}
