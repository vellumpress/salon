import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const fetchPage = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ url: z.string().min(8).max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const { extractPage } = await import("./extract-page.server");
    return extractPage(data.url);
  });
