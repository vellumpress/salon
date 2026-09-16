import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { getWork, loadWorkText, type WorkText } from "../catalog/works";
import { cn } from "../lib/hash";
import {
  formatRemaining,
  isSitMinutes,
  remainingMs,
  type SitMinutes,
} from "../lib/sitting";
import { FONT_MAX, FONT_MIN, clearSitting, getProgress, getShelf } from "../lib/storage";
import {
  saveProgress,
  startSitting,
  useReaderPrefs,
  useShelf,
  useWorkProgress,
} from "../lib/use-shelf";
import { DurationControl } from "../components/DurationControl";
import { FavoriteButton } from "../components/FavoriteButton";

export function ReadPage() {
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const workId = String(params.workId ?? "");
  const work = getWork(workId);
  const progress = useWorkProgress(workId);
  const preferredSit = useShelf((s) => s.sittingMinutes);
  const { fontSize, bump } = useReaderPrefs();
  const [text, setText] = useState<WorkText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sitFromUrl = Number(search.sit);
  const fromShuffle = search.from === "shuffle";
  const initialSit: SitMinutes = isSitMinutes(sitFromUrl)
    ? sitFromUrl
    : isSitMinutes(preferredSit)
      ? preferredSit
      : 20;
  const [sit, setSit] = useState<SitMinutes>(initialSit);
  const [showVeil, setShowVeil] = useState(() => {
    const saved = getProgress(workId);
    if (saved.entered && (saved.paragraphIndex > 0 || saved.scrollRatio > 0)) {
      return false;
    }
    if (fromShuffle) return false;
    return Boolean(getWork(workId)?.intro);
  });
  const [tocOpen, setTocOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const restored = useRef(false);
  const articleRef = useRef<HTMLElement | null>(null);
  const startedFromShuffle = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    restored.current = false;
    startedFromShuffle.current = false;
    const saved = getProgress(workId);
    const continuing =
      saved.entered && (saved.paragraphIndex > 0 || saved.scrollRatio > 0);
    setShowVeil(!continuing && !fromShuffle && Boolean(getWork(workId)?.intro));
    const preferred = getShelf().sittingMinutes;
    setSit(
      isSitMinutes(sitFromUrl)
        ? sitFromUrl
        : isSitMinutes(preferred)
          ? preferred
          : 20,
    );
    if (!work) return undefined;
    loadWorkText(work.id)
      .then((loaded) => {
        if (!cancelled) setText(loaded);
      })
      .catch(() => {
        if (!cancelled) setError("This text could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [work, workId, fromShuffle, sitFromUrl]);

  useEffect(() => {
    if (fromShuffle && work && !startedFromShuffle.current) {
      startedFromShuffle.current = true;
      startSitting(work.id, sit);
    }
  }, [fromShuffle, work, sit]);

  const paragraphs = useMemo(() => {
    if (!text) return [];
    return text.chapters.flatMap((chapter) =>
      chapter.paragraphs.map((paragraph, index) => ({
        key: `${chapter.id}-${index}`,
        chapterId: chapter.id,
        chapterStart: index === 0,
        chapterTitle: index === 0 ? chapter.title : null,
        text: paragraph,
      })),
    );
  }, [text]);

  useEffect(() => {
    if (!text || showVeil || restored.current) return;
    restored.current = true;
    const saved = getProgress(workId);
    const node = document.querySelector<HTMLElement>(
      `[data-para="${saved.paragraphIndex}"]`,
    );
    if (saved.paragraphIndex > 0 && node) {
      node.scrollIntoView({ block: "start" });
    } else if (saved.scrollRatio > 0) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: max * saved.scrollRatio });
    }
  }, [text, showVeil, workId]);

  useEffect(() => {
    if (showVeil || !text) return undefined;
    const onScroll = () => {
      const nodes = document.querySelectorAll<HTMLElement>("[data-para]");
      let current = 0;
      const probe = window.scrollY + window.innerHeight * 0.28;
      nodes.forEach((node) => {
        if (node.offsetTop <= probe) {
          current = Number(node.dataset.para ?? 0);
        }
      });
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const ratio = Math.min(1, window.scrollY / max);
      saveProgress(workId, {
        paragraphIndex: current,
        scrollRatio: ratio,
        completedAt: ratio > 0.97 ? Date.now() : null,
      });
    };
    const timer = window.setInterval(onScroll, 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [showVeil, text, workId]);

  const remaining = remainingMs(
    progress.sittingStartedAt,
    progress.sittingMinutes,
    now,
  );
  const timed = remaining !== null;

  useEffect(() => {
    if (!timed) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timed]);

  if (!work) {
    return (
      <main className="reader-shell">
        <header className="reader-chrome">
          <Link to="/" className="px-4 py-3 font-sans text-sm">
            Back
          </Link>
        </header>
        <div className="reader-article">
          <h1 className="font-display text-3xl font-medium">Not on this shelf</h1>
          <p>That work is not in the starter catalog.</p>
        </div>
      </main>
    );
  }

  const percent = Math.round((progress.scrollRatio || 0) * 100);
  const timeUp = Boolean(
    progress.sittingMinutes &&
      progress.sittingMinutes > 0 &&
      remaining !== null &&
      remaining <= 0,
  );

  function begin() {
    startSitting(workId, sit);
    setShowVeil(false);
  }

  function jumpToChapter(chapterId: string) {
    setTocOpen(false);
    document.getElementById(`ch-${chapterId}`)?.scrollIntoView({
      block: "start",
    });
  }

  if (showVeil) {
    return (
      <main className="reader-shell">
        <div className="veil">
          <div className="flex items-center justify-between border-b border-ink/15">
            <Link
              to="/"
              className="flex h-12 items-center px-4 font-sans text-sm text-ink"
            >
              Back
            </Link>
            <span className="min-w-0 truncate px-2 font-sans text-xs tracking-wide text-muted">
              {work.author} · {work.year}
            </span>
            <FavoriteButton
              workId={work.id}
              compact
              className="mr-2 border border-ink/20"
            />
          </div>
          <div className="veil-body">
            <h1 className="veil-title">{work.title}</h1>
            <p className="veil-note">{work.intro}</p>
          </div>
          <div className="veil-duration">
            <span className="font-sans text-[0.65rem] uppercase tracking-[0.14em] text-muted">
              Sit for
            </span>
            <DurationControl value={sit} onChange={setSit} compact />
          </div>
          <button type="button" className="veil-action-full" onClick={begin}>
            {progress.paragraphIndex > 0 ? "Continue" : "Begin"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="reader-shell">
      <header className="reader-chrome">
        <Link
          to="/"
          className="flex h-12 items-center px-4 font-sans text-sm text-ink"
        >
          Back
        </Link>
        <span className="min-w-0 truncate font-display text-lg font-medium tracking-tight">
          {work.title}
        </span>
        <button
          type="button"
          className="h-12 px-3 font-sans text-sm"
          aria-expanded={tocOpen}
          onClick={() => setTocOpen((open) => !open)}
        >
          TOC
        </button>
        <div className="flex items-stretch">
          <button
            type="button"
            className="h-12 px-3 font-sans text-sm"
            aria-label="Smaller type"
            disabled={fontSize <= FONT_MIN}
            onClick={() => bump(-2)}
          >
            A−
          </button>
          <button
            type="button"
            className="h-12 px-3 font-sans text-sm"
            aria-label="Larger type"
            disabled={fontSize >= FONT_MAX}
            onClick={() => bump(2)}
          >
            A+
          </button>
        </div>
      </header>
      <div className="reader-progress" aria-hidden="true">
        <span
          className="reader-progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="reader-status">
        <span className="font-sans text-[0.65rem] tabular-nums tracking-wide text-muted">
          {percent}% through
        </span>
        {remaining !== null && remaining > 0 ? (
          <span className="font-sans text-[0.65rem] tabular-nums tracking-wide text-muted">
            {formatRemaining(remaining)} left
          </span>
        ) : null}
        {timeUp ? (
          <button
            type="button"
            className="font-sans text-[0.65rem] tracking-wide text-ink"
            onClick={() => clearSitting(work.id)}
          >
            Time’s up — keep reading
          </button>
        ) : null}
      </div>

      {tocOpen && text ? (
        <nav className="toc-panel" aria-label="Contents">
          {text.chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className="toc-row"
              onClick={() => jumpToChapter(chapter.id)}
            >
              {chapter.title || "Opening"}
            </button>
          ))}
        </nav>
      ) : null}

      <article
        ref={articleRef}
        className={cn("reader-article", tocOpen && "hidden")}
        style={{ ["--reader-size" as string]: `${fontSize / 16}rem` }}
      >
        {error ? <p>{error}</p> : null}
        {!text && !error ? (
          <p className="text-muted">Opening the page…</p>
        ) : null}
        {paragraphs.map((paragraph, index) => (
          <div key={paragraph.key}>
            {paragraph.chapterStart ? (
              <h2 id={`ch-${paragraph.chapterId}`}>
                {paragraph.chapterTitle || "Opening"}
              </h2>
            ) : null}
            <p data-para={index}>{paragraph.text}</p>
          </div>
        ))}
      </article>
    </main>
  );
}
