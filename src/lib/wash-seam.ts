export type WashSeam = {
  axis: "vertical" | "horizontal";
  /** Device pixel of the step. */
  at: number;
  run: number;
  count: number;
  avg: number;
};

export type WashBand = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/**
 * A seam is a long, straight, low-contrast luminance step.
 * The column clip on the old wash was about 8 levels, ran for dozens of
 * device pixels, and repeated down the page. Glyph edges are shorter or
 * much stronger. A soft wash changes by well under 4 levels per pixel.
 *
 * Kept as plain source so the same function runs under node and inside
 * a WebKit page without a type-stripping step.
 */
const DETECT_SOURCE = `function detectWashSeams(data, width, height, band) {
  const left = Math.max(1, band.left | 0);
  const right = Math.min(width - 1, band.right | 0);
  const top = Math.max(1, band.top | 0);
  const bottom = Math.min(height - 1, band.bottom | 0);
  const seams = [];
  const lum = (x, y) => {
    const i = (width * y + x) * 4;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  };

  for (let x = left; x < right; x += 1) {
    let count = 0;
    let sum = 0;
    let run = 0;
    let best = 0;
    for (let y = top; y < bottom; y += 1) {
      const delta = lum(x, y) - lum(x - 1, y);
      const abs = delta < 0 ? -delta : delta;
      if (abs >= 4 && abs <= 14) {
        count += 1;
        sum += delta;
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
    if (best >= 64 && count >= 140) {
      seams.push({
        axis: "vertical",
        at: x,
        run: best,
        count: count,
        avg: Math.round((sum / count) * 10) / 10,
      });
    }
  }

  for (let y = top; y < bottom; y += 1) {
    let count = 0;
    let sum = 0;
    let run = 0;
    let best = 0;
    let sign = 0;
    for (let x = left; x < right; x += 1) {
      const delta = lum(x, y) - lum(x, y - 1);
      const abs = delta < 0 ? -delta : delta;
      const next = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (abs >= 4 && abs <= 18 && next !== 0 && (sign === 0 || next === sign)) {
        sign = next;
        count += 1;
        sum += delta;
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
        sign = 0;
      }
    }
    if (best >= 420 && count >= 420) {
      seams.push({
        axis: "horizontal",
        at: y,
        run: best,
        count: count,
        avg: Math.round((sum / count) * 10) / 10,
      });
    }
  }

  return seams;
}`;

type Detect = (
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  band: WashBand,
) => WashSeam[];

const detectWashSeams = new Function(`return (${DETECT_SOURCE})`)() as Detect;

export function washSeams(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  band: WashBand,
): WashSeam[] {
  return detectWashSeams(data, width, height, band);
}

/** Plain function source, safe to run inside a browser page. */
export function washSeamDetectorSource(): string {
  return DETECT_SOURCE;
}
