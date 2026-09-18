import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

import type { SittingMinutes } from "./sitting";

export type Role = "reader" | "staff";
export type { SittingMinutes } from "./sitting";

export type Me = {
  name: string;
  role: Role;
  sittingMinutes: number;
  taste: string;
};

export type FeaturedPin = { workId: string; sort: number; note: string };
export type Notice = { id: number; title: string; body: string; createdAt: string };
export type Person = { userId: string; name: string; role: Role };

export const getMe = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({ name: z.string().max(80).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }): Promise<Me> => {
    const { getMeHandler } = await import("./account.server");
    return getMeHandler(context.userId, data.name ?? "");
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().max(80),
        sittingMinutes: z.number().int().min(0).max(180),
        taste: z.string().max(400),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<Me> => {
    const { saveSettingsHandler } = await import("./account.server");
    return saveSettingsHandler(context.userId, data);
  });

export const pushReading = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        entries: z
          .array(
            z.object({
              workId: z.string().min(1).max(40),
              breathIndex: z.number().int().min(0).max(1_000_000),
              kept: z.number().int().min(0).max(100_000),
              completed: z.boolean(),
              lastOpenedAt: z.number().int().min(0),
            }),
          )
          .max(80),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { pushReadingHandler } = await import("./account.server");
    await pushReadingHandler(context.userId, data.entries);
  });

export const listFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const { featuredRows } = await import("./account.server");
  return featuredRows();
});

export const listNotices = createServerFn({ method: "GET" }).handler(async () => {
  const { noticeRows } = await import("./account.server");
  return noticeRows();
});

export const loadDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { loadDeskHandler } = await import("./account.server");
    return loadDeskHandler(context.userId);
  });

export const claimStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Me> => {
    const { claimStaffHandler } = await import("./account.server");
    return claimStaffHandler(context.userId);
  });

export const setFeatured = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        ids: z.array(z.string().min(1).max(40)).max(12),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<FeaturedPin[]> => {
    const { setFeaturedHandler } = await import("./account.server");
    return setFeaturedHandler(context.userId, data.ids);
  });

export const addNotice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(80),
        body: z.string().min(1).max(800),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<Notice[]> => {
    const { addNoticeHandler } = await import("./account.server");
    return addNoticeHandler(context.userId, data);
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int().positive() }).parse(input))
  .handler(async ({ context, data }): Promise<Notice[]> => {
    const { deleteNoticeHandler } = await import("./account.server");
    return deleteNoticeHandler(context.userId, data.id);
  });

export const setRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().min(1).max(80),
        role: z.enum(["reader", "staff"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<Person[]> => {
    const { setRoleHandler } = await import("./account.server");
    return setRoleHandler(context.userId, data);
  });

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<string[]> => {
    const { listFavoritesHandler } = await import("./account.server");
    return listFavoritesHandler(context.userId);
  });

export const pushFavorites = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        workIds: z.array(z.string().min(1).max(40)).max(200),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { pushFavoritesHandler } = await import("./account.server");
    await pushFavoritesHandler(context.userId, data.workIds);
  });
