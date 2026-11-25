import type { Page } from "playwright";

/** The place one tap lands on. Progress stays a sentence; window is only set inside a long sentence. */
export type GroupPlace = { index: number; cursor: number; window: number };

export function groupKey(place: { index: number; cursor: number; window?: number }) {
  return `${place.index}:${place.cursor}:${place.window ?? 0}`;
}

type StepResult = GroupPlace | "start" | "end";

/** The reader's live grouping, so a test predicts the same group the tap will land on. */
export async function planGroups(page: Page, delta: 1 | -1, steps = 1): Promise<StepResult> {
  return page.evaluate(
    ({ delta, steps }) => {
      const frame = document.querySelector(".reader-frame") as
        | (HTMLElement & {
            spotlightStep?: (next: 1 | -1, count?: number) => StepResult;
          })
        | null;
      const step = frame?.spotlightStep;
      if (!step) return "end";
      return step(delta, steps);
    },
    { delta, steps },
  );
}

export async function readGroup(page: Page): Promise<GroupPlace & { key: string }> {
  return page.evaluate(() => {
    const frame = document.querySelector(".reader-frame");
    const index = Number(frame?.getAttribute("data-breath-index") ?? 0);
    const cursor = Number(frame?.getAttribute("data-sentence-at") ?? 0);
    const window = Number(frame?.getAttribute("data-spotlight-window") ?? 0);
    return {
      index,
      cursor,
      window,
      key: frame?.getAttribute("data-spotlight-key") ?? `${index}:${cursor}:${window}`,
    };
  });
}

/**
 * Wait until a fling has stopped moving the page. A tap before this
 * lands while the scroll is still running.
 */
export async function waitForPageRest(page: Page, timeout = 3000) {
  const start = Date.now();
  let last = Number.NaN;
  let stable = 0;
  while (Date.now() - start < timeout) {
    const top = await page.evaluate(() => {
      const flow = document.querySelector(".focus-live");
      return flow instanceof HTMLElement ? flow.scrollTop : 0;
    });
    if (Number.isFinite(last) && Math.abs(top - last) < 0.5) {
      stable += 1;
      if (stable >= 2) return;
    } else {
      stable = 0;
    }
    last = top;
    await page.waitForTimeout(32);
  }
  throw new Error("the page was still moving");
}

export async function waitGroup(page: Page, place: GroupPlace, timeout = 4000) {
  const key = groupKey(place);
  await page.waitForFunction(
    (want) => document.querySelector(".reader-frame")?.getAttribute("data-spotlight-key") === want,
    key,
    { timeout },
  );
}
