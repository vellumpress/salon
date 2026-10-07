export type TurnZone = "prev" | "next";

type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
};

/**
 * Page turn for a tap inside the reading column.
 * Already-read lines — everything above the focus sentence — go back.
 * The focus line and the preview below it go forward.
 * When the focus line is off the column, the left third stays the back zone.
 */
export function turnZone(input: {
  x: number;
  y: number;
  host: Box;
  focusTop: number | null;
  focusBottom: number | null;
}): TurnZone | null {
  const { x, y, host } = input;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < host.left || x >= host.right || y < host.top || y >= host.bottom) return null;
  const focusTop = input.focusTop;
  const focusBottom = input.focusBottom;
  const focusVisible =
    focusTop != null &&
    focusBottom != null &&
    Number.isFinite(focusTop) &&
    Number.isFinite(focusBottom) &&
    focusBottom > host.top &&
    focusTop < host.bottom;
  if (focusVisible && y < (focusTop as number)) return "prev";
  if (focusVisible) return "next";
  return x < host.left + host.width / 3 ? "prev" : "next";
}
