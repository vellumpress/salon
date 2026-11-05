import { useEffect, useRef } from "react";

type Box = { left: number; top: number; width: number; height: number };

function relBox(frame: DOMRect, el: HTMLElement): Box {
  const box = el.getBoundingClientRect();
  return {
    left: box.left - frame.left,
    top: box.top - frame.top,
    width: Math.max(0, box.width),
    height: Math.max(0, box.height),
  };
}

/**
 * Marks sit on the passage. The sheet never takes a pointer, so forward,
 * back, and hold-to-scroll stay on the reader.
 */
export function PassageBond({
  breathIndex,
  underlined,
  pinned,
  pulsing,
  emoji,
}: {
  breathIndex: number;
  underlined: boolean;
  pinned: boolean;
  pulsing: boolean;
  emoji: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLElement>(null);
  const pulseRef = useRef<HTMLElement>(null);
  const emojiRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!underlined && !pinned && !pulsing && !emoji) return;
    let frame = 0;
    const place = () => {
      const root = rootRef.current;
      const frameEl = root?.parentElement;
      if (frameEl) {
        const frameBox = frameEl.getBoundingClientRect();
        const passage = frameEl.querySelector<HTMLElement>(".breath-now");
        const phrase = frameEl.querySelector<HTMLElement>(".breath-now [data-focus-sentence]") ?? passage;
        if (passage && phrase) {
          const passageBox = relBox(frameBox, passage);
          const phraseBox = relBox(frameBox, phrase);
          const line = lineRef.current;
          const pin = pinRef.current;
          const glow = pulseRef.current;
          const mark = emojiRef.current;
          if (line && phraseBox.width > 0) {
            line.style.left = `${phraseBox.left}px`;
            line.style.top = `${phraseBox.top + phraseBox.height + 1}px`;
            line.style.width = `${phraseBox.width}px`;
          }
          if (glow && phraseBox.width > 0) {
            const pad = 3;
            glow.style.left = `${phraseBox.left - pad}px`;
            glow.style.top = `${phraseBox.top - pad}px`;
            glow.style.width = `${phraseBox.width + pad * 2}px`;
            glow.style.height = `${phraseBox.height + pad * 2}px`;
          }
          if (pin && passageBox.height > 0) {
            const top = phraseBox.top + Math.max(0, (phraseBox.height - 14) / 2);
            pin.style.left = `${Math.max(0, passageBox.left - 12)}px`;
            pin.style.top = `${top}px`;
          }
          if (mark && passageBox.width > 0) {
            const top = phraseBox.top + Math.max(0, (phraseBox.height - 18) / 2);
            mark.style.left = `${passageBox.left + passageBox.width + 2}px`;
            mark.style.top = `${top}px`;
          }
        }
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [breathIndex, underlined, pinned, pulsing, emoji]);

  return (
    <div
      ref={rootRef}
      className="passage-bond"
      data-bond-breath={breathIndex}
      data-underlined={underlined ? "yes" : "no"}
      data-pinned={pinned ? "yes" : "no"}
      data-pulse={pulsing ? "on" : "off"}
      data-emoji={emoji}
    >
      {pulsing ? <span ref={pulseRef} className="bond-pulse" /> : null}
      {underlined ? <span ref={lineRef} className="bond-line" /> : null}
      {pinned ? <span ref={pinRef} className="bond-pin" aria-hidden /> : null}
      {emoji ? (
        <span ref={emojiRef} className="bond-emoji">
          {emoji}
        </span>
      ) : null}
    </div>
  );
}
