import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PackedWork } from "./work-shape";

export const fetchShelfWork = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().min(1).max(40),
        opening: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PackedWork | null> => {
    const { loadShelfWork } = await import("./works.server");
    return loadShelfWork(data.id, Boolean(data.opening));
  });
