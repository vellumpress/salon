import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  canNativeShare,
  makePair,
  pickShuffle,
  searchFlag,
  shareOrCopy,
  sittingSharePath,
  type SittingLength,
} from "@/lib/shuffle";
import { boardWork } from "@/lib/mondrian";
import { useVellum } from "@/lib/store";
import { publicUrl } from "@/lib/site";
import { prefetchWork } from "@/lib/works";

export const Route = createFileRoute("/shuffle")({
  validateSearch: (search: Record<string, unknown>): { except?: string; together?: boolean } => {
    const next: { except?: string; together?: boolean } = {};
    if (typeof search.except === "string" && search.except.length < 32) next.except = search.except;
    if (searchFlag(search.together)) next.together = true;
    return next;
  },
  component: ShufflePage,
});

type Step = "length" | "company" | "share";

function ShufflePage() {
  const navigate = useNavigate();
  const { except, together } = Route.useSearch();
  const lastShuffle = useVellum((s) => s.lastShuffle);
  const taste = useVellum((s) => s.taste);
  const setSittingMinutes = useVellum((s) => s.setSittingMinutes);
  const setLastShuffle = useVellum((s) => s.setLastShuffle);
  const [step, setStep] = useState<Step>("length");
  const [sit, setSit] = useState<SittingLength>(20);
  const [workId, setWorkId] = useState("passing");
  const [pair, setPair] = useState<string | null>(null);
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [ready, setReady] = useState(false);
  const stepRef = useRef<Step>(step);
  stepRef.current = step;

  const meta = boardWork(workId);

  useEffect(() => {
    setCanShare(canNativeShare());
  }, []);

  useEffect(() => {
    const done = () => setReady(true);
    if (useVellum.persist.hasHydrated()) {
      done();
      return;
    }
    return useVellum.persist.onFinishHydration(done);
  }, []);

  function chooseLength(next: SittingLength) {
    if (stepRef.current !== "length") return;
    const id = pickShuffle(except ?? lastShuffle, next, taste);
    setSit(next);
    setWorkId(id);
    setLastShuffle(id);
    setSittingMinutes(next);
    prefetchWork(id);
    if (together) {
      const code = makePair();
      setPair(code);
      setHref(publicUrl(sittingSharePath(id, next, code)));
      stepRef.current = "share";
      setStep("share");
      return;
    }
    stepRef.current = "company";
    setStep("company");
  }

  function chooseAlone() {
    if (stepRef.current !== "company") return;
    void navigate({
      to: "/read/$workId",
      params: { workId },
      search: { shuffle: true, sit },
    });
  }

  function chooseTogether() {
    if (stepRef.current !== "company") return;
    const code = makePair();
    setPair(code);
    setHref(publicUrl(sittingSharePath(workId, sit, code)));
    stepRef.current = "share";
    setStep("share");
  }

  function beginTogether() {
    if (!pair) return;
    void navigate({
      to: "/read/$workId",
      params: { workId },
      search: { shuffle: true, sit, pair },
    });
  }

  async function sendLink() {
    const result = await shareOrCopy({
      title: meta?.title ?? "Salon",
      text: meta?.title ?? "A sitting",
      url: href,
    });
    if (result === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }

  function pick(next: SittingLength) {
    return {
      onClick: () => chooseLength(next),
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        chooseLength(next);
      },
    };
  }

  return (
    <div className="frame-screen bg-paper text-ink" data-hydrated={ready ? "1" : "0"} data-step={step}>
      <header className="relative z-20 flex shrink-0 items-stretch border-b border-ink">
        <Link
          to={together ? "/together" : "/"}
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          {together ? "Together" : "Home"}
        </Link>
        <span className="flex min-w-0 flex-1 items-center bg-paper px-4 type-kicker text-ink">
          {together ? "Sit with a friend" : "A sitting"}
        </span>
        <span className="w-3 shrink-0 bg-red sm:w-4" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {step === "length" ? (
          <>
            <div className="veil-body">
              <h1 className="veil-title">How long would you like to read for?</h1>
            </div>
            <div className="flex shrink-0 flex-col gap-rule bg-ink">
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-red font-sans text-sm text-paper"
                {...pick(12)}
              >
                Twelve minutes
              </button>
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-blue font-sans text-sm text-paper"
                {...pick(20)}
              >
                Twenty minutes
              </button>
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-yellow font-sans text-sm text-ink"
                {...pick(0)}
              >
                Until the end
              </button>
            </div>
          </>
        ) : null}

        {step === "company" ? (
          <>
            <div className="veil-body">
              <p className="mb-3 type-kicker text-muted">{meta?.author}</p>
              <h1 className="veil-title">{meta?.title ?? "A sitting"}</h1>
              <p className="veil-note">Read with a friend?</p>
            </div>
            <div className="flex shrink-0 flex-col gap-rule bg-ink">
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-paper font-sans text-sm text-ink"
                onClick={chooseAlone}
              >
                Alone
              </button>
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-red font-sans text-sm text-paper"
                onClick={chooseTogether}
              >
                With a friend
              </button>
            </div>
          </>
        ) : null}

        {step === "share" ? (
          <>
            <div className="veil-body">
              <p className="mb-3 type-kicker text-muted">{meta?.author}</p>
              <h1 className="veil-title">{meta?.title ?? "A sitting"}</h1>
              <p className="veil-note">They sit the same hour. The page holds both of you.</p>
              <p className="mt-5 break-all font-sans text-xs leading-relaxed tracking-wide text-ink">
                {href}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-rule bg-ink">
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-paper font-sans text-sm text-ink"
                onClick={() => void sendLink()}
              >
                {copied ? "Copied" : canShare ? "Send the link" : "Copy the link"}
              </button>
              <button
                type="button"
                className="flex h-16 items-center justify-center bg-ink font-sans text-sm text-paper"
                onClick={beginTogether}
              >
                Begin
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}