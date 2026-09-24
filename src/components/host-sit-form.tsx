import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useShelfSearch } from "@/components/shelf-search";
import { isLocalBound } from "@/lib/catalog/full-pdf";
import { shelfWork } from "@/lib/catalog/shelf";
import { createHostedSit, encodeHostedSit, hostedSitUrl, sitDurationLabel } from "@/lib/hosted-sit";
import { salonShareText, salonShareTitle } from "@/lib/site";
import { fillClass, fillInk, type Fill } from "@/lib/mondrian";
import { searchPeople } from "@/lib/friends";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { SIT_PRESETS } from "@/lib/sitting";
import { shareOrCopy } from "@/lib/shuffle";
import { useVellum } from "@/lib/store";
import { cn } from "@/lib/utils";

const HIT_FILLS: Fill[] = ["paper", "blue", "yellow", "forest"];

export function HostSitForm({ onClose }: { onClose: () => void }) {
  const handle = useVellum((s) => s.handle) ?? "";
  const contacts = useVellum((s) => s.contacts) ?? [];
  const lastShuffle = useVellum((s) => s.lastShuffle);
  const rememberHostedSit = useVellum((s) => s.rememberHostedSit);
  const addContact = useVellum((s) => s.addContact);
  const search = useShelfSearch("local");
  const [workId, setWorkId] = useState(
    lastShuffle && isLocalBound(lastShuffle) ? lastShuffle : "passing",
  );
  const [minutes, setMinutes] = useState(20);
  const [invite, setInvite] = useState("");
  const [invitees, setInvitees] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const hostedSits = useVellum((s) => s.hostedSits) ?? [];
  const [freshId, setFreshId] = useState<string | null>(null);
  const selected = shelfWork(workId);
  const people = useMemo(
    () => (invite.trim() ? searchPeople(invite, contacts) : []),
    [invite, contacts],
  );
  const hosted = hostedSits.find((row) => row.id === freshId);

  function addInvitee(raw: string) {
    const next = normalizeHandle(raw);
    if (next.length < 2) {
      setError("Name someone with at least two letters.");
      return;
    }
    if (next === normalizeHandle(handle)) {
      setError("That is already you.");
      return;
    }
    addContact({ handle: next });
    setInvitees((current) => (current.includes(next) ? current : [...current, next]));
    setInvite("");
    setError("");
  }

  async function submit() {
    const host = normalizeHandle(handle);
    if (!host) {
      setError("Claim an @name on Friends first.");
      return;
    }
    if (!isLocalBound(workId)) {
      setError("Pick a bound book from the shelf.");
      return;
    }
    const next = createHostedSit({
      hostHandle: host,
      workId,
      minutes,
      invitees,
    });
    if (!next) {
      setError("The sit would not open.");
      return;
    }
    rememberHostedSit(next);
    setFreshId(next.id);
    const result = await shareOrCopy({
      title: salonShareTitle(next.workTitle),
      text: salonShareText(
        `${formatHandle(host)} is hosting ${sitDurationLabel(next.minutes)} with ${next.workTitle}.`,
      ),
      url: hostedSitUrl(next),
    });
    if (result === "copied" || result === "shared") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  if (hosted) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-paper text-ink">
        <div className="flex min-h-40 flex-col justify-end bg-blue p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">Your sit is set</p>
          <p className="mt-2 type-title">{hosted.workTitle}</p>
          <p className="mt-2 font-serif text-lg text-paper/85">
            {sitDurationLabel(hosted.minutes)}
            {hosted.invitees.length
              ? ` · ${hosted.invitees.map((row) => formatHandle(row)).join(" · ")}`
              : ""}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <Link
            to="/sit/$token"
            params={{ token: encodeHostedSit(hosted) }}
            className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
          >
            Open the sit
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 items-center justify-center border-t border-ink bg-paper font-sans text-sm text-ink sm:border-l sm:border-t-0"
          >
            {copied ? "Invite copied" : "Done"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col bg-paper text-ink"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex shrink-0 items-stretch border-b border-ink">
        <div className={cn("flex min-w-0 flex-1 items-center px-5 py-3", fillClass("yellow"), fillInk("yellow"))}>
          <p className="type-kicker opacity-70">Host a sit</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "flex h-12 shrink-0 items-center justify-center border-l border-ink px-4 font-sans text-sm",
            fillClass("red"),
            fillInk("red"),
          )}
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn("px-5 py-5", fillClass("red"), fillInk("red"))}>
          <p className="type-lede">Name the hour. Send the door.</p>
          <p className="mt-2 max-w-xl font-serif text-base leading-snug text-paper/85">
            Friends RSVP on the link. Afterward, anyone who missed it can read the kept lines — not the chat.
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
              const fill = HIT_FILLS[index % HIT_FILLS.length]!;
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
        <label className="flex items-stretch border-t border-ink">
          <span className="flex w-24 shrink-0 items-center px-4 type-kicker text-muted">@</span>
          <input
            value={invite}
            onChange={(event) => setInvite(event.target.value)}
            placeholder="name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent font-serif text-xl focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={() => addInvitee(invite)}
            className="px-4 font-sans text-sm text-ink"
          >
            Add
          </button>
        </label>
        {people.slice(0, 4).map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => addInvitee(row.handle)}
            className="flex w-full items-center justify-between border-t border-ink px-4 py-3 text-left"
          >
            <span className="font-serif text-lg">{formatHandle(row.handle)}</span>
            <span className="font-sans text-sm">Invite</span>
          </button>
        ))}
        {invitees.length > 0 ? (
          <p className="border-t border-ink px-4 py-3 font-serif text-base text-ink/80">
            {invitees.map((row) => formatHandle(row)).join(" · ")}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        className="flex h-14 w-full shrink-0 items-center justify-center border-t border-ink bg-ink font-sans text-sm text-paper"
      >
        Host this sit
      </button>
    </form>
  );
}
