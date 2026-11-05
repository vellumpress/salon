import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { fillVar, hashSeed, type Fill } from "@/lib/mondrian";
import {
  INK_OPACITY,
  inkOpacity,
  smoothStroke,
  strokeLength,
  strokePath,
  tidyStroke,
  MIN_STROKE_LENGTH,
  STROKE_POINT_CAP,
  type PassageStroke,
  type StrokePoint,
} from "@/lib/multiplayer/passage-ink";

const INK_MARKS: Fill[] = ["red", "blue", "yellow", "ink"];

function inkFill(id: string): Fill {
  return INK_MARKS[hashSeed(id) % INK_MARKS.length] ?? "ink";
}

type Draft = {
  id: string;
  from: string;
  breath: number;
  at: number;
  points: StrokePoint[];
};

function pointFrom(event: { clientX: number; clientY: number }, svg: SVGSVGElement): StrokePoint {
  const box = svg.getBoundingClientRect();
  const x = box.width > 0 ? (event.clientX - box.left) / box.width : 0;
  const y = box.height > 0 ? (event.clientY - box.top) / box.height : 0;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

/**
 * Ink sits on the passage itself. With the pen off, the sheet ignores
 * pointers so forward, back, and hold-to-scroll stay on the reader.
 */
export function PassageInk({
  strokes,
  breathIndex,
  drawing,
  selfId,
  onStroke,
}: {
  strokes: readonly PassageStroke[];
  breathIndex: number;
  drawing: boolean;
  selfId: string;
  onStroke: (stroke: PassageStroke) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<SVGSVGElement>(null);
  const draftRef = useRef<Draft | null>(null);
  const activePointer = useRef<number | null>(null);
  const lastSend = useRef(0);
  const [draftTick, setDraftTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const visit = useRef({ breath: breathIndex, at: Date.now() });
  const grown = useRef(new Map<string, { n: number; at: number }>());
  const onStrokeRef = useRef(onStroke);
  onStrokeRef.current = onStroke;

  if (visit.current.breath !== breathIndex) {
    visit.current = { breath: breathIndex, at: Date.now() };
    grown.current.clear();
    draftRef.current = null;
    activePointer.current = null;
  }

  const stamp = Date.now();
  for (const stroke of strokes) {
    if (stroke.breath !== breathIndex) continue;
    const prev = grown.current.get(stroke.id);
    if (!prev || prev.n !== stroke.points.length) {
      grown.current.set(stroke.id, { n: stroke.points.length, at: stamp });
    }
  }

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 80);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let frame = 0;
    const place = () => {
      const root = rootRef.current;
      const sheet = sheetRef.current;
      const frameEl = root?.parentElement;
      const breath = frameEl?.querySelector<HTMLElement>(".breath-now");
      if (sheet && frameEl && breath) {
        const frameBox = frameEl.getBoundingClientRect();
        const box = breath.getBoundingClientRect();
        sheet.style.left = `${box.left - frameBox.left}px`;
        sheet.style.top = `${box.top - frameBox.top}px`;
        sheet.style.width = `${Math.max(0, box.width)}px`;
        sheet.style.height = `${Math.max(0, box.height)}px`;
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (drawing) return;
    draftRef.current = null;
    activePointer.current = null;
  }, [drawing]);

  function publish(draft: Draft, done: boolean) {
    const points = done ? smoothStroke(draft.points) : tidyStroke(draft.points);
    if (points.length < 2 || strokeLength(points) < MIN_STROKE_LENGTH) return;
    onStrokeRef.current({
      id: draft.id,
      from: draft.from,
      breath: draft.breath,
      at: Date.now(),
      points,
    });
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    activePointer.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* the stroke still follows the pointer */
    }
    draftRef.current = {
      id: `ink-${selfId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      from: selfId,
      breath: breathIndex,
      at: Date.now(),
      points: [pointFrom(event, event.currentTarget)],
    };
    lastSend.current = 0;
    setDraftTick((tick) => tick + 1);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const draft = draftRef.current;
    if (!draft || !drawing || event.pointerId !== activePointer.current) return;
    event.preventDefault();
    const point = pointFrom(event, event.currentTarget);
    const last = draft.points[draft.points.length - 1];
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx * dx + dy * dy < 0.00004) return;
    }
    if (draft.points.length >= STROKE_POINT_CAP) draft.points[draft.points.length - 1] = point;
    else draft.points.push(point);
    setDraftTick((tick) => tick + 1);
    const time = Date.now();
    if (time - lastSend.current > 140) {
      lastSend.current = time;
      publish(draft, false);
    }
  }

  function finish(event: ReactPointerEvent<SVGSVGElement>) {
    const draft = draftRef.current;
    if (!draft || event.pointerId !== activePointer.current) return;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draft.points.push(pointFrom(event, event.currentTarget));
    draftRef.current = null;
    setDraftTick((tick) => tick + 1);
    publish(draft, true);
  }

  const draft = draftRef.current;
  const shown = new Map<string, PassageStroke>();
  for (const stroke of strokes) {
    if (stroke.breath !== breathIndex) continue;
    shown.set(stroke.id, stroke);
  }
  if (draft && draft.breath === breathIndex && draft.points.length > 1) {
    shown.set(draft.id, {
      id: draft.id,
      from: draft.from,
      breath: draft.breath,
      at: draft.at,
      points: tidyStroke(draft.points),
    });
  }

  return (
    <div
      ref={rootRef}
      className={drawing ? "passage-ink is-drawing" : "passage-ink"}
      data-draw={drawing ? "on" : "off"}
      data-passage-ink={shown.size}
      data-ink-tick={draftTick}
    >
      <svg
        ref={sheetRef}
        className="passage-ink-sheet"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {[...shown.values()].map((stroke) => {
          const seen = grown.current.get(stroke.id)?.at ?? visit.current.at;
          const live = draft?.id === stroke.id;
          const opacity = live ? INK_OPACITY : inkOpacity(now - seen);
          return (
            <path
              key={stroke.id}
              data-stroke={stroke.id}
              data-from={stroke.from}
              data-breath={stroke.breath}
              d={strokePath(stroke.points)}
              stroke={fillVar(inkFill(stroke.from))}
              strokeWidth={1.35}
              vectorEffect="non-scaling-stroke"
              opacity={opacity}
            />
          );
        })}
      </svg>
    </div>
  );
}
