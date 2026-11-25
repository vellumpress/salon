export type Rgb = [number, number, number];

export type BandSample = {
  name: string;
  background: Rgb;
  glyph: Rgb;
  /** Distance from the page color to the strongest glyph pixel. */
  contrast: number;
};

export type SampleRect = {
  name: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
};

function luminance(rgb: Rgb): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function hypot(rgb: Rgb): number {
  return Math.hypot(rgb[0], rgb[1], rgb[2]);
}

export function glyphVector(glyph: Rgb, background: Rgb): Rgb {
  return [glyph[0] - background[0], glyph[1] - background[1], glyph[2] - background[2]];
}

/** 1 when the two colors leave the page along the same hue. */
export function hueCosine(glyph: Rgb, background: Rgb, ink: Rgb, inkBackground: Rgb): number {
  const a = glyphVector(glyph, background);
  const b = glyphVector(ink, inkBackground);
  const denom = hypot(a) * hypot(b);
  if (denom < 1e-3) return 1;
  return (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / denom;
}

export function luminanceSide(glyph: Rgb, background: Rgb): number {
  return luminance(glyph) - luminance(background);
}

/**
 * Strongest glyph pixel in a band, and the flat page color beside it.
 * `rect` is in device pixels and should already sit inside the frost or
 * the sharp band, clear of the fade and the footer chrome.
 */
export function sampleBandGlyph(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  rect: SampleRect,
): BandSample {
  const left = Math.max(0, rect.left | 0);
  const right = Math.min(width - 1, rect.right | 0);
  const top = Math.max(0, rect.top | 0);
  const bottom = Math.min(height - 1, rect.bottom | 0);
  const at = (x: number, y: number): Rgb => {
    const i = (width * y + x) * 4;
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
  };
  let br = 0;
  let bg = 0;
  let bb = 0;
  let bn = 0;
  const gutter = Math.min(right, left + 4);
  for (let y = top; y <= bottom; y += 2) {
    const pixel = at(gutter, y);
    br += pixel[0];
    bg += pixel[1];
    bb += pixel[2];
    bn += 1;
  }
  const background: Rgb = bn
    ? [Math.round(br / bn), Math.round(bg / bn), Math.round(bb / bn)]
    : [0, 0, 0];
  const textLeft = Math.min(right, left + 28);
  let glyph = background;
  let contrast = 0;
  for (let y = top; y <= bottom; y += 2) {
    for (let x = textLeft; x <= right; x += 2) {
      const pixel = at(x, y);
      const distance = Math.hypot(
        pixel[0] - background[0],
        pixel[1] - background[1],
        pixel[2] - background[2],
      );
      if (distance > contrast) {
        contrast = distance;
        glyph = pixel;
      }
    }
  }
  return {
    name: rect.name,
    background,
    glyph,
    contrast: Math.round(contrast * 10) / 10,
  };
}

/**
 * Plain source so the same sampler runs in WebKit without a type-stripping
 * step. Kept in lockstep with `sampleBandGlyph`.
 */
export function bandGlyphSamplerSource(): string {
  return `function sampleBandGlyph(data, width, height, rect) {
  const left = Math.max(0, rect.left | 0);
  const right = Math.min(width - 1, rect.right | 0);
  const top = Math.max(0, rect.top | 0);
  const bottom = Math.min(height - 1, rect.bottom | 0);
  const at = (x, y) => {
    const i = (width * y + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  let br = 0, bg = 0, bb = 0, bn = 0;
  const gutter = Math.min(right, left + 4);
  for (let y = top; y <= bottom; y += 2) {
    const pixel = at(gutter, y);
    br += pixel[0]; bg += pixel[1]; bb += pixel[2]; bn += 1;
  }
  const background = bn ? [Math.round(br / bn), Math.round(bg / bn), Math.round(bb / bn)] : [0, 0, 0];
  const textLeft = Math.min(right, left + 28);
  let glyph = background;
  let contrast = 0;
  for (let y = top; y <= bottom; y += 2) {
    for (let x = textLeft; x <= right; x += 2) {
      const pixel = at(x, y);
      const distance = Math.hypot(pixel[0] - background[0], pixel[1] - background[1], pixel[2] - background[2]);
      if (distance > contrast) {
        contrast = distance;
        glyph = pixel;
      }
    }
  }
  return { name: rect.name, background, glyph, contrast: Math.round(contrast * 10) / 10 };
}`;
}
