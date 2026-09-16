import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { getWork, loadWorkText, type WorkText } from "../catalog/works";
import { FONT_MAX, FONT_MIN, getProgress } from "../lib/storage";
import {
  markEntered,
  saveProgress,
  useReaderPrefs,
  useWorkProgress,
} from "../lib/use-shelf";
import { FavoriteButton } from "../components/FavoriteButton";

export function ReadPage() {
  const params = useParams({ strict: false });
  const workId = String(params.workId ?? "");
  const work = getWork(workId);
  const progress = useWorkProgress(workId);
  const { fontSize, bump } = useReaderPrefs();
  const [text, setText] = useState<WorkText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showVeil, setShowVeil] = useState(
    () => Boolean(work?.intro && !getProgress(workId).entered),
  );
  const restored = useRef(false);
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    restored.current = false;
    setShowVeil(Boolean(work?.intro && !getProgress(workId).entered));
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
  }, [work, workId]);

  const paragraphs = useMemo(() => {
    if (!text) return [];
    return text.chapters.flatMap((chapter) =>
      chapter.paragraphs.map((paragraph, index) => ({
        key: `${chapter.id}-${index}`,
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

  if (!work) {
    return (
      <main className="reader-shell">
        <header className="reader-chrome">
          <Link to="/" className="px-4 py-3 font-sans text-sm">
            Home
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

  if (showVeil) {
    return (
      <main className="reader-shell">
        <div className="veil">
          <div className="flex items-center justify-between border-b border-ink/15">
            <Link
              to="/"
              className="flex h-12 items-center px-4 font-sans text-sm text-ink"
            >
              Home
            </Link>
            <span className="min-w-0 truncate px-2 font-sans text-xs tracking-wide text-muted">
              {work.author} · {work.year}
            </span>
            <FavoriteButton workId={work.id} compact className="mr-2 border border-ink/20" />
          </div>
          <div className="veil-body">
            <h1 className="veil-title">{work.title}</h1>
            <p className="veil-note">{work.intro}</p>
          </div>
          <button
            type="button"
            className="veil-action-full"
            onClick={() => {
              markEntered(work.id);
              setShowVeil(false);
            }}
          >
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
          Home
        </Link>
        <span className="min-w-0 truncate font-display text-lg font-medium tracking-tight">
          {work.title}
        </span>
        <span className="px-2 font-sans text-[0.65rem] tabular-nums tracking-wide text-muted">
          {percent}%
        </span>
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

      <article
        ref={articleRef}
        className="reader-article"
        style={{ ["--reader-size" as string]: `${fontSize / 16}rem` }}
      >
        {error ? <p>{error}</p> : null}
        {!text && !error ? (
          <p className="text-muted">Opening the page…</p>
        ) : null}
        {paragraphs.map((paragraph, index) => (
          <div key={paragraph.key}>
            {paragraph.chapterTitle ? <h2>{paragraph.chapterTitle}</h2> : null}
            <p data-para={index}>{paragraph.text}</p>
          </div>
        ))}
      </article>
    </main>
  );
}
