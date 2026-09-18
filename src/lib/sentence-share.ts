import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createSentenceShare = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        workId: z.string().min(1).max(40),
        breathIndex: z.number().int().min(0),
        sentenceText: z.string().max(4000),
        toPhone: z.string().max(40).optional(),
        createdBy: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createSentenceShareHandler } = await import("./sentence-share.server");
    return createSentenceShareHandler(data);
  });

export const getSentenceShare = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ token: z.string().min(8).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getSentenceShareHandler } = await import("./sentence-share.server");
    return getSentenceShareHandler(data.token);
  });
