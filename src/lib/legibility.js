// Contrast-based readability scoring for a theme, measured against the fg/bg
// token pairs that actually appear in the captured Claude Code session.
//
// Honest naming: this is a WCAG *contrast* score, not a perceptual legibility
// proof. WCAG (linear-RGB luminance) is the widely understood standard and is
// explainable; APCA would rank some saturated hues differently but adds
// complexity we don't need here.
//
// Weights are CURATED by UI role (not the raw glyph frequency of one capture),
// so an error-heavy showcase doesn't let bright-red dominate the ranking. The
// accent colors are averaged equally for the same reason.

/** Relative luminance (WCAG sRGB). */
function relLum(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrast(a, b) {
  const la = relLum(a);
  const lb = relLum(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// Piecewise-linear map ratio -> 0..1, anchored at WCAG thresholds so passing AA
// reads as "good" rather than "mediocre":
//   1:1 -> 0.00   3:1 (AA large) -> 0.50   4.5:1 (AA) -> 0.80   7:1 (AAA) -> 1.0
const ANCHORS = [
  [1, 0],
  [3, 0.5],
  [4.5, 0.8],
  [7, 1],
];
function ratioToScore(r) {
  if (r <= 1) {
    return 0;
  }
  if (r >= 7) {
    return 1;
  }
  for (let i = 1; i < ANCHORS.length; i++) {
    const [r0, s0] = ANCHORS[i - 1];
    const [r1, s1] = ANCHORS[i];
    if (r <= r1) {
      return s0 + ((r - r0) / (r1 - r0)) * (s1 - s0);
    }
  }
  return 1;
}

function gradeFor(score) {
  if (score >= 85) {
    return 'A';
  }
  if (score >= 70) {
    return 'B';
  }
  if (score >= 55) {
    return 'C';
  }
  if (score >= 40) {
    return 'D';
  }
  return 'F';
}

// Composite role weights (sum = 1). Derived from the capture's token roles but
// flattened so no single session quirk dominates; the prompt block is floored
// up from ~0.3% of glyphs because it's a prominent filled bar, not stray text.
const ROLE_WEIGHTS = { body: 0.45, dim: 0.13, accents: 0.27, prompt: 0.15 };

/**
 * Score one theme's readability for the captured session.
 * @param {{background:string, foreground:string, palette:string[]}} theme
 * @returns {{score:number, grade:string, sub:{body:number,dim:number,accents:number,prompt:number}, worst:{label:string, ratio:number}, lowContrast:boolean}}
 */
export function scoreTheme(theme) {
  const bg = theme.background;
  const fg = theme.foreground;
  const p = theme.palette;

  const pairs = []; // {label, ratio} for the worst-pair lookup
  const track = (label, a, b) => {
    const ratio = contrast(a, b);
    pairs.push({ label, ratio });
    return ratio;
  };

  // Body: main text (foreground/bg, weighted heavier) + white text c7/bg.
  const rBody = track('body text', fg, bg);
  const rWhite = track('white text', p[7], bg);
  const body = (ratioToScore(rBody) * 54 + ratioToScore(rWhite) * 13) / 67;

  // Dim/secondary: brightBlack as foreground over bg.
  const rDim = track('dim text', p[8], bg);
  const dim = ratioToScore(rDim);

  // Accents: colored roles over bg, averaged equally (red doesn't get to
  // dominate just because this capture had a big diff).
  const accentIdx = [9, 12, 10, 14, 13, 11]; // red blue green cyan magenta yellow
  const accentScores = accentIdx.map((i) => {
    const r = track(`accent ${i}`, p[i], bg);
    return ratioToScore(r);
  });
  const accents = accentScores.reduce((s, v) => s + v, 0) / accentScores.length;

  // Prompt block: brightWhite text and the chevron over brightBlack — take the
  // worse of the two, since the whole bar reads only as well as its weakest part.
  const rPromptText = track('prompt block', p[15], p[8]);
  const rPromptChev = track('prompt chevron', p[7], p[8]);
  const prompt = Math.min(ratioToScore(rPromptText), ratioToScore(rPromptChev));

  const composite =
    body * ROLE_WEIGHTS.body +
    dim * ROLE_WEIGHTS.dim +
    accents * ROLE_WEIGHTS.accents +
    prompt * ROLE_WEIGHTS.prompt;

  const score = Math.round(composite * 100);
  const worst = pairs.reduce((a, b) => (b.ratio < a.ratio ? b : a));
  // Flag when a structurally important pair (body or prompt) is below AA-large.
  const lowContrast = rBody < 3 || Math.min(rPromptText, rPromptChev) < 3;

  return {
    score,
    grade: gradeFor(score),
    sub: {
      body: Math.round(body * 100),
      dim: Math.round(dim * 100),
      accents: Math.round(accents * 100),
      prompt: Math.round(prompt * 100),
    },
    worst: { label: worst.label, ratio: Number(worst.ratio.toFixed(2)) },
    lowContrast,
  };
}
