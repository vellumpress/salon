import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ResumeLink, usePersistHydrated } from "@/components/resume-link";
import { asShareToken } from "@/lib/share-codec";
import {
  decodeSitPledge,
  pledgeLine,
  windowLabel,
} from "@/lib/sit-pledge";
import { formatHandle, normalizeHandle } from "@/lib/social";
import { useTbr } from "@/lib/store";

export const Route = createFileRoute("/pledge/$token")({
  component: PledgePage,
});

function PledgePage() {
  const { token: raw } = Route.useParams();
  const token = asShareToken(raw) ?? raw;
  const hydrated = usePersistHydrated();
  const handle = useTbr((s) => s.handle) ?? "";
  const sitPledges = useTbr((s) => s.sitPledges) ?? [];
  const rememberPledge = useTbr((s) => s.rememberPledge);
  const setPledgeStatus = useTbr((s) => s.setPledgeStatus);
  const decoded = useMemo(() => decodeSitPledge(token), [token]);
  const stored = sitPledges.find((row) => row.id === decoded?.id);
  const pledge = stored ?? decoded ?? null;

  useEffect(() => {
    if (decoded) rememberPledge(decoded);
  }, [decoded, rememberPledge]);

  if (!hydrated || !pledge) {
    return (
      <div className="frame-screen bg-paper text-ink">
        <header className="flex shrink-0 items-stretch border-b border-ink">
          <Link
            to="/friends"
            className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
          >
            Friends
          </Link>
        </header>
        <div className="flex min-h-0 flex-1 flex-col justify-end p-5 sm:p-8">
          <p className="type-kicker text-muted">A sitting</p>
          <p className="mt-2 type-title">
            {hydrated ? "This note would not come" : "Opening"}
          </p>
        </div>
      </div>
    );
  }

  const me = normalizeHandle(handle);
  const isFrom = me === pledge.fromHandle;
  const isTo = me === pledge.toHandle;

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/friends"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Friends
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">Tonight</h1>
        <ResumeLink className="h-12 border-l border-ink" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-40 flex-col justify-end bg-forest p-5 text-paper sm:p-8">
          <p className="type-kicker opacity-80">{windowLabel(pledge.window)}</p>
          <p className="mt-2 type-title">
            {isFrom
              ? `${formatHandle(pledge.toHandle)} has your word`
              : `${formatHandle(pledge.fromHandle)} will sit`}
          </p>
          <p className="mt-3 max-w-xl font-serif text-lg text-paper/85">
            {pledgeLine(pledge)}
          </p>
        </div>

        {pledge.status === "pending" && (isFrom || isTo || !me) ? (
          <div className="grid grid-cols-2 border-b border-ink">
            <button
              type="button"
              onClick={() => setPledgeStatus(pledge.id, "done")}
              className="flex h-14 items-center justify-center bg-ink font-sans text-sm text-paper"
            >
              {isFrom ? "I sat" : "They sat"}
            </button>
            <button
              type="button"
              onClick={() => setPledgeStatus(pledge.id, "cancelled")}
              className="flex h-14 items-center justify-center border-l border-ink bg-paper font-sans text-sm text-ink"
            >
              Set aside
            </button>
          </div>
        ) : (
          <p className="border-b border-ink px-4 py-5 font-serif text-lg text-ink/70">
            {pledge.status === "done"
              ? "The sitting was kept."
              : pledge.status === "cancelled"
                ? "Set aside, without a mark against anyone."
                : "Open this on the phone that claimed the name."}
          </p>
        )}

        <Link
          to="/rituals"
          className="flex h-14 items-center justify-center border-b border-ink bg-yellow font-sans text-sm text-ink"
        >
          Find a sit
        </Link>
      </div>
    </div>
  );
}
