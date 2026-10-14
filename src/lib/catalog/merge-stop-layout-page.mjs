// @ts-nocheck
/** Runs inside the reader page. Plain script so the typecheck does not parse it. */

export async function installMergeStop(urls) {
  const spot = await import(urls.spot);
  const disp = await import(urls.disp);
  globalThis.__mergeStop = { spot, disp };
}

export function readColumnMetrics() {
  const sample = document.querySelector(".breath-block");
  if (!sample) return null;
  const style = getComputedStyle(sample);
  const viewport = Math.round(window.visualViewport?.height || window.innerHeight);
  const width = Math.round(sample.clientWidth);
  return {
    width,
    viewport,
    limit: Math.max(48, Math.floor(viewport / 3)),
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    faceReady: true,
  };
}

export function measureStopBatch({ batch, metrics }) {
  const kit = globalThis.__mergeStop;
  const linePx = kit.disp.displayLinePx(metrics);
  const measure = (sample) => kit.disp.measureStyledHeight(sample, metrics);
  const reasons = [];
  for (const job of batch) {
    const groups = kit.spot.spotlightGroups(
      job.breaths,
      measure,
      metrics.limit,
      linePx,
      job.displayKind,
      new Set(job.stops),
      job.cuts.length ? new Map(job.cuts) : undefined,
    );
    const reason = kit.spot.passageEndsAtStop(groups, job.stop, job.stopLength);
    if (reason) reasons.push({ id: job.id, kinds: job.kinds, stop: job.stop, reason });
  }
  return reasons;
}
