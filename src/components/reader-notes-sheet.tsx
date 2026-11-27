import { useState } from "react";
import { NOTE_COLORS, type NoteColor, type ReaderNote } from "@/lib/reader-notes";
import "./reader-notes.css";

export function NoteMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 3.5h11v17l-5.5-3.4L6.5 20.5v-17z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReaderNotesSheet({
  items,
  here,
  onColor,
  onText,
  onSaved,
  onJump,
  onClose,
}: {
  items: readonly ReaderNote[];
  here: ReaderNote | undefined;
  onColor: (color: NoteColor) => void;
  onText: (text: string) => void;
  onSaved: () => void;
  onJump: (breathIndex: number) => void;
  onClose: () => void;
}) {
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(here?.text ?? "");

  return (
    <div className="note-sheet" data-note-sheet="" role="dialog" aria-label="Notes">
      <h2>Highlight</h2>
      <div className="note-colors" role="group" aria-label="Highlight">
        {NOTE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`note-swatch-${color}`}
            aria-label={color}
            aria-pressed={here?.color === color}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onColor(color);
            }}
          />
        ))}
      </div>
      <div className="note-actions">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setDraft(here?.text ?? "");
            setDrafting(true);
          }}
        >
          Add a note
        </button>
        <button
          type="button"
          aria-pressed={here?.saved === true}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSaved();
          }}
        >
          {here?.saved ? "Saved" : "Save this part"}
        </button>
        <button
          type="button"
          className="note-sheet-close"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          Close
        </button>
      </div>
      {drafting ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onText(draft);
            setDrafting(false);
          }}
        >
          <label className="sr-only" htmlFor="reader-note-draft">
            Note
          </label>
          <textarea
            id="reader-note-draft"
            className="note-draft"
            value={draft}
            placeholder="A note for this part"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <div className="note-actions">
            <button type="submit">Keep note</button>
          </div>
        </form>
      ) : null}
      <h2>Saved</h2>
      {items.length === 0 ? (
        <p className="note-empty">Nothing saved in this book yet.</p>
      ) : (
        <ul className="note-list">
          {items.map((item) => (
            <li key={`${item.breathIndex}-${item.breathId}`}>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onJump(item.breathIndex);
                }}
              >
                {item.color ? <span className={`note-dot note-swatch-${item.color}`} aria-hidden="true" /> : null}
                <span className="note-list-text">{item.text || item.excerpt}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
