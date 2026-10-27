import { Link } from "@tanstack/react-router";
import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { DoorCta, DoorSlide } from "@/lib/home-doors";
import { fillClass, fillInk, type Fill } from "@/lib/mondrian";
import { cn } from "@/lib/utils";

function SlideLink({ slide, children }: { slide: DoorSlide; children: ReactNode }) {
  const className =
    "door-slide-link flex h-full min-w-0 flex-col justify-end text-inherit no-underline";
  if (slide.kind === "rituals") {
    return (
      <Link to="/rituals" search={{ lane: slide.lane }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "rituals-home") {
    return (
      <Link to="/rituals" preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "together") {
    return (
      <Link to="/together" preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "together-room") {
    return (
      <Link to="/together" search={{ room: true }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "together-host") {
    return (
      <Link to="/together" search={{ host: true }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "together-club") {
    return (
      <Link to="/together" search={{ start: true }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "shuffle") {
    return (
      <Link to="/shuffle" search={{ together: true }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "friends") {
    return (
      <Link to="/friends" preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "curated") {
    return (
      <Link to="/curated" preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  if (slide.kind === "sit") {
    return (
      <Link to="/sit/$token" params={{ token: slide.token }} preload="intent" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/read/$workId" params={{ workId: slide.workId }} preload="intent" className={className}>
      {children}
    </Link>
  );
}

function CtaLink({ cta }: { cta: DoorCta }) {
  const className = "door-cta type-kicker";
  if (cta.kind === "rituals") {
    return (
      <Link to="/rituals" preload="intent" className={className}>
        {cta.label}
      </Link>
    );
  }
  if (cta.kind === "curated") {
    return (
      <Link to="/curated" preload="intent" className={className}>
        {cta.label}
      </Link>
    );
  }
  return (
    <Link to="/together" preload="intent" className={className}>
      {cta.label}
    </Link>
  );
}

function SlideCopy({ slide }: { slide: DoorSlide }) {
  return (
    <>
      <span className="type-kicker opacity-70">{slide.kicker}</span>
      <span className="pillar-title door-slide-title">{slide.title}</span>
      {slide.line ? <span className="type-pitch pillar-pitch door-slide-line">{slide.line}</span> : null}
    </>
  );
}

/** How long a finger has to be gone before a door starts drifting again. */
const RESUME_AFTER_MS = 3000;

/**
 * A slow horizontal loop inside one home block. Touch pauses it, and the
 * drift starts again a few seconds after release. A swipe moves the track.
 * Reduced motion leaves the slides still and swipeable.
 */
export function DoorCarousel({
  label,
  slides,
  cta,
  seconds,
  fill,
  aria,
  door,
  mark,
}: {
  label: string;
  slides: DoorSlide[];
  cta: DoorCta;
  seconds: number;
  fill: Fill;
  aria: string;
  door: "rituals" | "together" | "curated";
  mark?: Record<string, string>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef(0);
  const reducedRef = useRef(false);
  const suppressRef = useRef(false);
  const dragRef = useRef({ id: -1, startX: 0, x: 0, moved: false });
  const count = Math.max(1, slides.length);
  const shown = slides.length > 0 ? slides : [];
  const loopSlides = shown.length > 1 ? [...shown, ...shown] : shown;
  const slidesKey = shown.map((slide) => slide.id).join("|");

  useEffect(() => {
    const node = viewportRef.current;
    const track = trackRef.current;
    if (!node || !track || shown.length < 2) return;
    offsetRef.current = 0;
    track.style.transform = "translate3d(0,0,0)";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => {
      reducedRef.current = media.matches;
      if (media.matches) offsetRef.current = 0;
    };
    syncReduced();
    media.addEventListener("change", syncReduced);

    const paint = () => {
      const width = node.clientWidth;
      const loop = width * shown.length;
      if (loop <= 0) return;
      offsetRef.current = ((offsetRef.current % loop) + loop) % loop;
      track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const width = node.clientWidth;
      const loop = width * shown.length;
      if (!reducedRef.current && !pausedRef.current && loop > 0 && seconds > 0) {
        offsetRef.current += (loop * dt) / (seconds * 1000);
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => paint();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      media.removeEventListener("change", syncReduced);
      window.removeEventListener("resize", onResize);
    };
  }, [seconds, slidesKey, shown.length]);

  useEffect(() => () => window.clearTimeout(resumeTimerRef.current), []);

  function paintNow() {
    const node = viewportRef.current;
    const track = trackRef.current;
    if (!node || !track) return;
    const loop = node.clientWidth * shown.length;
    if (loop <= 0) return;
    offsetRef.current = ((offsetRef.current % loop) + loop) % loop;
    track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
  }

  function holdPause() {
    window.clearTimeout(resumeTimerRef.current);
    pausedRef.current = true;
  }

  function releasePause() {
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_AFTER_MS);
  }

  function onDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    holdPause();
    dragRef.current = { id: event.pointerId, startX: event.clientX, x: event.clientX, moved: false };
  }

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 8) return;
    drag.moved = true;
    drag.x = event.clientX;
    if (reducedRef.current) return;
    offsetRef.current -= dx;
    paintNow();
  }

  function onUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.id !== event.pointerId) return;
    releasePause();
    const width = viewportRef.current?.clientWidth ?? 0;
    const travel = event.clientX - drag.startX;
    if (drag.moved) suppressRef.current = true;
    if (drag.moved && reducedRef.current && width > 0 && Math.abs(travel) > width * 0.12) {
      const dir = travel < 0 ? 1 : -1;
      const index = Math.round(offsetRef.current / width);
      const next = (index + dir + shown.length) % shown.length;
      offsetRef.current = next * width;
      paintNow();
    }
    dragRef.current.id = -1;
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressRef.current) return;
    suppressRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  if (shown.length === 0) return null;

  return (
    <section
      className={cn(
        "cell-pillar door-block relative flex min-h-0 flex-col",
        fillClass(fill),
        fillInk(fill),
      )}
      data-home-door={door}
      data-door-loop={seconds}
      aria-label={aria}
      {...mark}
    >
      <h2 className="sr-only">{label}</h2>
      <div
        ref={viewportRef}
        className="door-carousel"
        data-door-viewport=""
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
      >
        <div ref={trackRef} className="door-track">
          {loopSlides.map((slide, index) => {
            const copy = index >= shown.length;
            return (
              <div
                key={`${slide.id}-${copy ? "loop" : "live"}`}
                className="door-slide"
                aria-hidden={copy ? true : undefined}
              >
                <SlideLink slide={slide}>
                  <SlideCopy slide={slide} />
                </SlideLink>
              </div>
            );
          })}
        </div>
      </div>
      <CtaLink cta={cta} />
    </section>
  );
}
