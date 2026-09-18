import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { ChamberReader } from "../components/ChamberReader";
import { getWork, loadWorkText, type WorkText } from "../catalog/works";
import { breathsFromText, migrateBreathIndex } from "../lib/breaths";
import { asSittingMinutes, isSitMinutes } from "../lib/sitting";
import { getProgress, getShelf, setBreath } from "../lib/storage";

export function ReadPage() {
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const workId = String(params.workId ?? "");
  const work = getWork(workId);
  const [text, setText] = useState<WorkText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sitFromUrl = Number(search.sit);
  const fromShuffle = search.from === "shuffle";
  const preferredSit = getShelf().sittingMinutes;
  const initialSit = asSittingMinutes(
    Number.isFinite(sitFromUrl)
      ? sitFromUrl
      : isSitMinutes(preferredSit)
        ? preferredSit
        : 20,
  );

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
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
  }, [work]);

  const breaths = useMemo(
    () => (text && work ? breathsFromText(text, work.form) : []),
    [text, work],
  );

  useEffect(() => {
    if (!work || breaths.length === 0) return;
    const saved = getProgress(work.id);
    if (saved.breathMigrated) return;
    if (!saved.entered && saved.paragraphIndex === 0) return;
    const next = migrateBreathIndex(breaths, saved);
    setBreath(work.id, next, {
      paragraphIndex: breaths[next]?.paragraphIndex ?? saved.paragraphIndex,
      total: breaths.length,
    });
  }, [breaths, work]);

  if (!work) {
    return (
      <main className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="inline-flex h-12 items-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Back
          </Link>
        </header>
        <div className="veil-body">
          <h1 className="veil-title">Not on this shelf</h1>
          <p className="veil-note">That work is not in the starter catalog.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="inline-flex h-12 items-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Back
          </Link>
        </header>
        <div className="veil-body">
          <h1 className="veil-title">{work.title}</h1>
          <p className="veil-note">{error}</p>
        </div>
      </main>
    );
  }

  if (!text) {
    return (
      <main className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/"
            className="inline-flex h-12 items-center bg-ink px-4 font-sans text-sm text-paper"
          >
            Back
          </Link>
          <span className="flex min-w-0 flex-1 items-center truncate px-4 font-sans text-xs tracking-wide text-muted">
            {work.title}
          </span>
        </header>
        <div className="veil-body">
          <p className="font-serif text-lg text-muted">Opening the page…</p>
        </div>
      </main>
    );
  }

  return (
    <ChamberReader
      work={work}
      breaths={breaths}
      initialSit={initialSit}
      skipVeil={fromShuffle}
    />
  );
}
