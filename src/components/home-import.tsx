import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  deleteImport,
  listImports,
  newImportId,
  saveImport,
  subscribeImports,
  type SavedImport,
} from "@/lib/import/idb";
import { SAVE_FAIL } from "@/lib/import/messages";
import { useTbr } from "@/lib/store";

function pace(index: number, total: number, done: boolean) {
  if (done) return "Finished";
  if (!total || index <= 0) return "Not started";
  const pct = Math.min(99, Math.round((index / total) * 100));
  return `${Math.max(1, pct)}%`;
}

export function HomeImport() {
  const navigate = useNavigate();
  const progress = useTbr((s) => s.progress);
  const [rows, setRows] = useState<SavedImport[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"pdf" | "link" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const refresh = () => {
      void listImports().then((next) => {
        if (live) setRows(next);
      });
    };
    refresh();
    const unsub = subscribeImports(refresh);
    return () => {
      live = false;
      unsub();
    };
  }, []);

  async function openSaved(work: SavedImport["work"], source: string, kind: SavedImport["kind"]) {
    const id = newImportId();
    const saved: SavedImport = {
      id,
      title: work.title,
      author: work.author,
      source,
      kind,
      createdAt: Date.now(),
      breathCount: work.breaths.length,
      work: { ...work, id },
    };
    try {
      await saveImport(saved);
    } catch {
      throw new Error(SAVE_FAIL);
    }
    await navigate({ to: "/read/$workId", params: { workId: id } });
  }

  async function onPdf(file: File | undefined) {
    if (!file || busy) return;
    setBusy("pdf");
    setError("");
    try {
      const { workFromPdfFile } = await import("@/lib/import/pdf-file");
      const work = await workFromPdfFile(file);
      await openSaved(work, file.name || "PDF", "pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This PDF would not open.");
      setBusy(null);
    }
  }

  async function onLink(event: FormEvent) {
    event.preventDefault();
    const next = url.trim();
    if (next.length < 4 || busy) return;
    setBusy("link");
    setError("");
    try {
      const { workFromLink } = await import("@/lib/import/fetch-link");
      const work = await workFromLink(next);
      let source = next;
      try {
        source = new URL(next).hostname.replace(/^www\./, "");
      } catch {
        source = next;
      }
      await openSaved(work, source, "link");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This page would not come.");
      setBusy(null);
    }
  }

  async function remove(id: string) {
    await deleteImport(id).catch(() => undefined);
    useTbr.setState((state) => {
      const next = { ...state.progress };
      delete next[id];
      return {
        progress: next,
        sitHistory: (state.sitHistory ?? []).filter((row) => row.workId !== id),
        favorites: (state.favorites ?? []).filter((fav) => fav !== id),
      };
    });
  }

  return (
    <section className="home-import" aria-labelledby="home-import-title" data-home-import="">
      <p className="type-kicker text-muted">On this phone</p>
      <h2 id="home-import-title" className="type-title">
        Import
      </h2>
      <p className="home-import-note">A PDF or a link, in the same sitting. It stays here.</p>

      <div className="home-import-actions">
        <label className="home-import-btn home-import-btn-ink">
          <input
            type="file"
            accept="application/pdf"
            disabled={Boolean(busy)}
            className="home-import-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onPdf(file);
            }}
          />
          {busy === "pdf" ? "Reading the PDF…" : "Import a PDF"}
        </label>
        <form onSubmit={onLink} className="home-import-link">
          <label className="home-import-url-label" htmlFor="home-import-url">
            Paste a link
          </label>
          <input
            id="home-import-url"
            name="import-link"
            type="url"
            inputMode="url"
            enterKeyHint="go"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://"
            value={url}
            disabled={Boolean(busy)}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="submit" className="home-import-btn home-import-btn-paper" disabled={Boolean(busy) || url.trim().length < 4}>
            {busy === "link" ? "Fetching…" : "Paste a link"}
          </button>
        </form>
      </div>

      {error ? (
        <p className="home-import-error" role="alert">
          {error}
        </p>
      ) : null}

      <h3 className="type-kicker home-import-list-label">Your imports</h3>
      {rows.length === 0 ? (
        <p className="home-import-empty">Nothing imported yet.</p>
      ) : (
        <ul className="home-import-list">
          {rows.map((row) => {
            const item = progress[row.id];
            const where = pace(item?.breathIndex ?? 0, row.breathCount, Boolean(item?.completedAt));
            return (
              <li key={row.id} className="home-import-row">
                <div className="home-import-copy">
                  <span className="home-import-title">{row.title}</span>
                  <span className="home-import-meta">
                    {row.source}
                    <span aria-hidden="true"> · </span>
                    {where}
                  </span>
                </div>
                <div className="home-import-row-actions">
                  <Link
                    to="/read/$workId"
                    params={{ workId: row.id }}
                    className="home-import-open"
                  >
                    Open
                  </Link>
                  <button type="button" className="home-import-delete" onClick={() => void remove(row.id)}>
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
