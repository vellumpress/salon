import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { fetchPage } from "@/lib/fetch-page";
import { useTbr } from "@/lib/store";
import type { Work } from "@/lib/literature";

export const Route = createFileRoute("/page")({
  component: ImportPage,
});

const MAX_IMPORT_BYTES = 12_000_000;

function looksLikePdf(name: string, type: string) {
  if (/pdf/i.test(type)) return true;
  return /\.pdf(?:$|[?#])/i.test(name);
}

function ImportPage() {
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
          Import
        </h1>
      </header>
      {live ? <ImportBody /> : <ImportShell />}
    </div>
  );
}

function ImportShell() {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto">
      <div className="flex min-h-36 flex-col justify-end p-5 sm:p-10">
        <p className="type-kicker text-muted">A sitting from elsewhere</p>
        <p className="mt-2 type-title">
          A page or a PDF
        </p>
      </div>
    </div>
  );
}

function ImportBody() {
  const navigate = useNavigate();
  const setPageWork = useTbr((s) => s.setPageWork);
  const resetWork = useTbr((s) => s.resetWork);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState<"link" | "pdf" | null>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  async function sitWith(work: Work) {
    setPageWork(work);
    resetWork("page");
    await navigate({ to: "/read/$workId", params: { workId: "page" } });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = url.trim();
    if (next.length < 8 || busy) return;
    setBusy("link");
    setError("");
    try {
      const work = await fetchPage({ data: { url: next } });
      await sitWith(work);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This page would not come.");
      setBusy(null);
    }
  }

  async function openPdf(file: File) {
    if (busy) return;
    if (!looksLikePdf(file.name, file.type) && file.type !== "") {
      setError("Bring a PDF, or a web address.");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setError("This PDF is too large.");
      return;
    }
    setFileName(file.name);
    setBusy("pdf");
    setError("");
    try {
      const { workFromPdfBytes, nameFromFile } = await import("@/lib/extract-pdf");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const work = await workFromPdfBytes(bytes, {
        title: nameFromFile(file),
        author: "Imported",
        url: file.name,
      });
      await sitWith(work);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This PDF would not open.");
      setBusy(null);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setOver(false);
    const file = event.dataTransfer.files[0];
    if (file) void openPdf(file);
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto"
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <div className="flex min-h-36 flex-col justify-end p-5 sm:p-10">
        <p className="type-kicker text-muted">A sitting from elsewhere</p>
        <p className="mt-2 type-title">
          A page or a PDF
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col">
        <label className="flex items-stretch border-t border-ink">
          <span className="flex w-20 shrink-0 items-center px-4 type-kicker text-muted">
            Link
          </span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="url"
            name="import-url"
            className="h-14 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl text-ink placeholder:text-muted focus-visible:outline-none"
          />
        </label>
        {error ? (
          <p className="border-t border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={Boolean(busy) || url.trim().length < 8}
          className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper disabled:opacity-40"
        >
          {busy === "link" ? "Opening…" : "Read the link"}
        </button>
      </form>
      <label
        className={`relative flex h-16 cursor-pointer items-center justify-center font-sans text-sm ${
          over ? "bg-red text-paper" : "bg-yellow text-ink"
        }`}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={Boolean(busy)}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void openPdf(file);
          }}
        />
        {busy === "pdf" ? "Opening…" : fileName || "A PDF"}
      </label>
    </div>
  );
}
