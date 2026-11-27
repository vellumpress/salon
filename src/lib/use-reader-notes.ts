import { useCallback, useMemo, useState } from "react";
import { useLayoutEffect } from "react";
import {
  noteAt,
  notesFor,
  readNoteBooks,
  withNote,
  writeNoteBooks,
  type NoteBooks,
  type NoteColor,
  type ReaderNote,
} from "./reader-notes.ts";

function mergeBooks(local: NoteBooks, remote: NoteBooks): NoteBooks {
  const workIds = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const merged: NoteBooks = {};
  for (const workId of workIds) {
    const byIndex = new Map<number, ReaderNote>();
    for (const item of remote[workId] ?? []) byIndex.set(item.breathIndex, item);
    for (const item of local[workId] ?? []) {
      const prior = byIndex.get(item.breathIndex);
      if (!prior || item.at >= prior.at) byIndex.set(item.breathIndex, item);
    }
    const items = [...byIndex.values()].sort((a, b) => a.breathIndex - b.breathIndex);
    if (items.length) merged[workId] = items;
  }
  return merged;
}

/**
 * Notes for the open book. The column reads a color string per sentence.
 * A sentence with no mark gets undefined, so its painted block can stay put.
 */
export function useReaderNotes(workId: string) {
  const [books, setBooks] = useState<NoteBooks>({});

  useLayoutEffect(() => {
    const local = readNoteBooks();
    setBooks(local);
    let cancel = false;
    void import("./reader-notes-sync.ts")
      .then(async (sync) => {
        const remote = await sync.pullRemoteNotes();
        if (cancel || !remote) return;
        const next = mergeBooks(readNoteBooks(), remote);
        writeNoteBooks(next);
        setBooks(next);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  const items = notesFor(books, workId);
  const colors = useMemo(() => {
    const map = new Map<number, NoteColor>();
    for (const item of items) {
      if (item.color) map.set(item.breathIndex, item.color);
    }
    return map;
  }, [items]);

  const commit = useCallback((next: NoteBooks) => {
    writeNoteBooks(next);
    setBooks(next);
    void import("./reader-notes-sync.ts")
      .then((sync) => sync.pushRemoteNotes(next))
      .catch(() => undefined);
  }, []);

  const paint = useCallback(
    (
      place: { breathIndex: number; breathId: string; excerpt: string },
      patch: { color?: NoteColor | null; text?: string | null; saved?: boolean },
    ) => {
      commit(withNote(readNoteBooks(), workId, { ...place, ...patch }));
    },
    [commit, workId],
  );

  return {
    items,
    colorAt(index: number) {
      return colors.get(index);
    },
    noteAt(index: number) {
      return noteAt(items, index);
    },
    paint,
  };
}
