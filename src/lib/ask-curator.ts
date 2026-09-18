import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LOCAL_WORKS } from "./catalog/full-pdf";
import type { ShelfWork } from "./catalog/shelf";

/** Curator picks from LE-polished local binds only (Gutenberg stays searchable on the shelf). */
const READABLE: ShelfWork[] = LOCAL_WORKS;

const catalog = READABLE.map(
  (item) =>
    `${item.id} | ${item.title} | ${item.author} | ${item.year} | ${item.form} | ${item.minutes} min`,
).join("\n");

const ids = new Set(READABLE.map((item) => item.id));
const byId = new Map(READABLE.map((item) => [item.id, item]));

const Input = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "curator"]),
        text: z.string().min(1).max(800),
      }),
    )
    .min(1)
    .max(12),
  taste: z.string().max(400).optional(),
  now: z
    .object({
      id: z.string().max(40),
      title: z.string().max(80),
      author: z.string().max(80),
      place: z.string().max(80),
      sentence: z.string().max(400),
    })
    .optional(),
});

type CuratorOk = {
  ok: true;
  reply: string;
  workId: string | null;
  minutes: 12 | 20 | 0 | null;
  taste: string | null;
};

type CuratorFail = { ok: false; error: string };

function sittingFromText(text: string): 12 | 20 | 0 {
  const low = text.toLowerCase();
  if (/until the last|finish|all the way|whole|entire/.test(low)) return 0;
  if (/short|quiet|brief|quick|twelve|12\b/.test(low)) return 12;
  return 20;
}

function pickReadable(text: string, taste: string | undefined, except?: string): ShelfWork {
  const blob = `${text} ${taste ?? ""}`.toLowerCase();
  const words = blob.split(/\W+/).filter((w) => w.length > 3);
  const pool = READABLE.filter((item) => item.id !== except);
  const source = pool.length > 0 ? pool : READABLE;

  const scored = source.map((item) => {
    const hay = `${item.id} ${item.title} ${item.author} ${item.form} ${item.language}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (hay.includes(word)) score += 2;
    }
    if (/short|quiet|brief/.test(blob) && item.minutes <= 50) score += 3;
    if (/poem|poetry|verse/.test(blob) && item.form === "poem") score += 4;
    if (/play|theater|theatre|drama/.test(blob) && item.form === "play") score += 4;
    if (/stor(y|ies)|tale/.test(blob) && item.form === "stories") score += 3;
    if (/novel|long/.test(blob) && item.form === "novel") score += 2;
    if (/strange|dark|turn|uncanny|odd/.test(blob) && /strange|dark|turn|odd|uncanny|ghost|crime|underground|dracula|wallpaper/.test(hay))
      score += 3;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  const top = scored.filter((row) => row.score > 0).slice(0, 12);
  const pickFrom = top.length > 0 ? top : scored.slice(0, 24);
  return pickFrom[Math.floor(Math.random() * Math.min(pickFrom.length, 8))]!.item;
}

function localCurate(data: z.infer<typeof Input>): CuratorOk {
  const lastUser = [...data.messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const except = data.now?.id;
  const work = pickReadable(lastUser, data.taste, except);
  const minutes = sittingFromText(`${lastUser} ${data.taste ?? ""}`);
  const sitNote =
    minutes === 0 ? "until the last sentence" : minutes === 12 ? "a short sit" : "a medium sit";
  const reply = `Try ${work.title} by ${work.author} — ${sitNote}. If that weather is wrong, say so.`;
  const tasteBits = [data.taste?.trim(), lastUser.trim()].filter(Boolean).join(" · ").slice(0, 200);
  return {
    ok: true,
    reply,
    workId: work.id,
    minutes,
    taste: tasteBits || null,
  };
}

export const askCurator = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<CuratorOk | CuratorFail> => {
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) {
      // Works without xAI so the room never goes silent; add XAI_API_KEY on Vercel for the full AI curator.
      return localCurate(data);
    }

    const now = data.now
      ? `Currently sitting: ${data.now.title} — ${data.now.author}. Place: ${data.now.place}. Sentence: ${data.now.sentence}`
      : "Not in a sitting.";
    const taste = data.taste?.trim() ? `Known taste: ${data.taste.trim()}` : "No taste noted yet.";

    const messages = [
      {
        role: "system" as const,
        content: `You are the curator of Vellum, a quiet room of public-domain stories. Help the reader name how they like to sit: length, weather of a piece, authors they keep. Be brief. No manifesto. No lists of tips. Never invent a work outside the catalog. Prefer recommending a workId from the catalog whenever you can. Reply ONLY as JSON: {"reply":"plain prose","workId":"catalog id or null","minutes":12 or 20 or 0 or null,"taste":"short notes or null"}. minutes 0 means until the last sentence.
Catalog (readable full texts only):
${catalog}
${taste}
${now}`,
      },
      ...data.messages.map((turn) => ({
        role: (turn.role === "curator" ? "assistant" : "user") as "assistant" | "user",
        content: turn.text,
      })),
    ];

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.XAI_CURATOR_MODEL?.trim() || "grok-4.5",
          temperature: 0.6,
          max_tokens: 320,
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!res.ok) {
        // Fall back so a bad key / model outage still recommends something.
        return localCurate(data);
      }

      const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      let parsed: { reply?: unknown; workId?: unknown; minutes?: unknown; taste?: unknown };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        return localCurate(data);
      }

      const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      if (!reply) return localCurate(data);

      const workId =
        typeof parsed.workId === "string" && ids.has(parsed.workId) ? parsed.workId : null;
      const minutes =
        parsed.minutes === 12 || parsed.minutes === 20 || parsed.minutes === 0
          ? parsed.minutes
          : null;
      const nextTaste =
        typeof parsed.taste === "string" && parsed.taste.trim() ? parsed.taste.trim() : null;

      // If the model forgot a workId, still offer one from the catalog.
      if (!workId) {
        const local = localCurate(data);
        return {
          ok: true,
          reply,
          workId: local.workId,
          minutes: minutes ?? local.minutes,
          taste: nextTaste ?? local.taste,
        };
      }

      // Ensure recommended id is known (already checked) and exists in map.
      if (!byId.has(workId)) {
        const local = localCurate(data);
        return { ok: true, reply, workId: local.workId, minutes: minutes ?? local.minutes, taste: nextTaste };
      }

      return { ok: true, reply, workId, minutes, taste: nextTaste };
    } catch {
      return localCurate(data);
    }
  });
