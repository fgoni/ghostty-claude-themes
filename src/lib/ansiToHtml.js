// Renders an indexed-ANSI string (our normalized real session) to HTML spans
// colored via the theme's --c0..--c15 CSS variables. Unlike the WASM canvas VT,
// HTML lets us control line-height — so the real session can breathe.
//
// Only the SGR subset our capture uses is handled: reset, bold, italic, the
// 16 indexed foregrounds/backgrounds, and default fg/bg.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s) => s.replace(/[&<>]/g, (c) => ESC[c]);

const FG_INDEX = (n) => (n >= 30 && n <= 37 ? n - 30 : n - 90 + 8);
const BG_INDEX = (n) => (n >= 40 && n <= 47 ? n - 40 : n - 100 + 8);

/**
 * @param {string} ansi indexed-ANSI text (CRLF or LF separated)
 * @returns {string} HTML
 */
export function ansiToHtml(ansi) {
  let fg = null; // palette index or null (default)
  let bg = null;
  let bold = false;
  let italic = false;

  const openSpan = () => {
    const styles = [];
    if (fg !== null) {
      styles.push(`color:var(--c${fg})`);
    }
    if (bg !== null) {
      styles.push(`background:var(--c${bg})`);
    }
    if (bold) {
      styles.push('font-weight:700');
    }
    if (italic) {
      styles.push('font-style:italic');
    }
    return styles.length ? `<span style="${styles.join(';')}">` : '<span>';
  };

  let out = '';
  let spanOpen = false;
  const close = () => {
    if (spanOpen) {
      out += '</span>';
      spanOpen = false;
    }
  };

  // Split into SGR escape sequences and text between them.
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0;
  let m;
  const emit = (text) => {
    if (!text) {
      return;
    }
    close();
    out += openSpan() + esc(text);
    spanOpen = true;
  };

  while ((m = re.exec(ansi)) !== null) {
    emit(ansi.slice(last, m.index));
    last = re.lastIndex;
    const codes = m[1] === '' ? [0] : m[1].split(';').map((n) => parseInt(n, 10));
    for (const code of codes) {
      if (code === 0) {
        fg = bg = null;
        bold = italic = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 3) {
        italic = true;
      } else if (code === 22) {
        bold = false;
      } else if (code === 23) {
        italic = false;
      } else if (code === 39) {
        fg = null;
      } else if (code === 49) {
        bg = null;
      } else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
        fg = FG_INDEX(code);
      } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
        bg = BG_INDEX(code);
      }
    }
  }
  emit(ansi.slice(last));
  close();
  return out;
}
