import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useShelfSearch } from "@/components/shelf-search";
import { isLocalBound } from "@/lib/catalog/full-pdf";
import { shelfWork } from "@/lib/catalog/shelf";
import { fillClass, fillInk, type Fill } from "@/lib/mondrian";
import { publicUrl, salonShareText, salonShareTitle } from "@/lib/site";
import { asSittingMinutes, SIT_PRESETS } from "@/lib/sitting";
import { makePair, shareOrCopy, sittingSharePath } from "@/lib/shuffle";
import { cn } from "@/lib/utils";

const HIT_FILLS: Fill[] = ["paper", "blue", "yellow", "forest"];

export function LiveRoomForm({
  defaultWorkId,
  onClose,
}: {
  defaultWorkId: string;
  onClose: () => void;
}) {
  const search = useShelfSearch("local");
  const [workId, setWorkId] = useState(defaultWorkId);
  const [minutes, setMinutes] = useState(20);
  const [error, setError] = useState("");
  const [room, setRoom] = useState<{ pair: string; href: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const selected = shelfWork(workId);

  async function sendInvite(pair: string) {
    if (!selected) return;
    const path = sittingSharePath(workId, asSittingMinutes(minutes), pair);
    const url = publicUrl(path);
    setRoom({ pair, href: url });
    const result = await shareOrCopy({
      title: salonShareTitle(selected.title),
      text: salonShareText(`Sit together with ${selected.title}.`),
      url,
    });
    if (result === "copied" || result === "shared") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  async function openRoom() {
    if (!isLocalBound(workId) || !selected) {
      setError("Pick a bound book from the shelf.");
      return;
    }
    setError("");
    await sendInvite(makePair());
  }

  if (room && selected) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-paper text-ink">
        <div className="flex min-h-40 flex-col justify-end bg-red p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">The room is open</p>
          <p className="mt-2 type-title">{selected.title}</p>
          <p className="mt-2 font-serif text-lg text-paper/85">{selected.author}</p>
        </div>
        <p className="border-b border-ink px-4 py-4 font-sans text-sm leading-relaxed break-all text-ink">
          {room.href}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <Link
            to="/read/$workId"
            params={{ workId }}
            search={{ sit: asSittingMinutes(minutes), pair: room.pair }}
            className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
          >
            Sit now
          </Link>
          <button
            type="button"
            onClick={() => void sendInvite(room.pair)}
            className="flex h-14 items-center justify-center border-t border-ink bg-yellow font-sans text-sm text-ink sm:border-l sm:border-t-0"
          >
            {copied ? "Invite sent" : "Send the invite"}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-14 w-full items-center justify-center border-t border-ink bg-paper font-sans text-sm text-ink"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col bg-paper text-ink"
      onSubmit={(event) => {
        event.preventDefault();
        void openRoom();
      }}
    >
      <div className="flex shrink-0 items-stretch border-b border-ink">
        <div className={cn("flex min-w-0 flex-1 items-center px-5 py-3", fillClass("red"), fillInk("red"))}>
          <p className="type-kicker opacity-80">Open a room</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 py-5">
          <p className="type-lede">One book. One invite.</p>
          <p className="mt-2 max-w-xl font-serif text-base leading-snug text-ink/75">
            Send the link. Whoever opens it sits the same page, live, with you.
          </p>
        </div>
        {error ? (
          <p className="border-t border-ink bg-yellow px-4 py-3 font-sans text-sm text-ink">{error}</p>
        ) : null}
        <label className={cn("flex items-stretch border-t border-ink", fillClass("yellow"), fillInk("yellow"))}>
          <span className="flex w-24 shrink-0 items-center px-4 type-kicker opacity-70">Book</span>
          <input
            type="search"
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            placeholder={selected ? selected.title : "Title, author"}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl placeholder:opacity-40 focus-visible:outline-none"
          />
        </label>
        {search.query.trim()
          ? search.matches.slice(0, 5).map((item, index) => {
              const fill = HIT_FILLS[index % HIT_FILLS.length] ?? "paper";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setWorkId(item.id);
                    search.setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between border-t border-ink px-4 py-4 text-left",
                    fillClass(fill),
                    fillInk(fill),
                  )}
                >
                  <span className="min-w-0">
                    <span className="block type-lede">{item.title}</span>
                    <span className="mt-0.5 block truncate type-kicker opacity-70">{item.author}</span>
                  </span>
                  <span className="font-sans text-sm">{item.id === workId ? "In" : "Pick"}</span>
                </button>
              );
            })
          : selected ? (
              <p className={cn("border-t border-ink px-4 py-3 font-sans text-sm", fillClass("forest"), fillInk("forest"))}>
                {selected.title}
                <span className="opacity-70"> · {selected.author}</span>
              </p>
            ) : null}
        <div className="border-t border-ink">
          <p className="px-4 pt-3 type-kicker text-muted">Length</p>
          <div className="flex flex-wrap gap-px bg-ink p-px">
            {SIT_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => setMinutes(preset.minutes)}
                className={cn(
                  "flex h-12 min-w-[4.5rem] flex-1 items-center justify-center font-sans text-sm",
                  minutes === preset.minutes ? "bg-ink text-paper" : "bg-paper text-ink",
                )}
              >
                {preset.short}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        type="submit"
        className="flex h-14 w-full shrink-0 items-center justify-center border-t border-ink bg-ink font-sans text-sm text-paper"
      >
        Create the invite
      </button>
    </form>
  );
}
