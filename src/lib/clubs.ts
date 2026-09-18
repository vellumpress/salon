import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Fill } from "./mondrian";
import {
  asClubFill,
  asClubId,
  asInviteToken,
  clubInvitePath,
  clubInviteUrl,
  clubJoinPath,
  CLUB_ID_RE,
  INVITE_TOKEN_RE,
} from "./club-time";

export type { Fill };
export {
  asClubFill,
  asClubId,
  asInviteToken,
  clubInvitePath,
  clubInviteUrl,
  clubJoinPath,
  CLUB_ID_RE,
  INVITE_TOKEN_RE,
};

export type ClubSessionView = {
  id: number;
  startsAt: string;
  label: string;
};

export type BookClubView = {
  id: string;
  name: string;
  workId: string;
  workTitle: string;
  author: string;
  fill: Fill;
  inviteToken: string;
  note: string;
  hostUserId: string | null;
  createdAt: string;
  serializePlanId: string | null;
  startEpisode: number | null;
  serializeLabel: string | null;
  nextSession: ClubSessionView | null;
  sessions: ClubSessionView[];
};

export type UpcomingSit = {
  sessionId: number;
  clubId: string;
  name: string;
  workId: string;
  workTitle: string;
  author: string;
  fill: Fill;
  inviteToken: string;
  note: string;
  startsAt: string;
  label: string;
  serializePlanId: string | null;
  serializeLabel: string | null;
  episode: number | null;
};

const optionalUser = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    assertSameSiteRequest();
    const bearer = (context as { bearerToken?: string }).bearerToken;
    // Guests are allowed (hostUserId null). Never let a session/cookie helper
    // crash the mutation — sentence shares already work this way.
    let userId: string | null = null;
    try {
      const user = await getSessionUser(bearer);
      userId = user?.id ?? null;
    } catch (err) {
      console.error("[clubs] optional session lookup failed", err);
    }
    return next({ context: { userId } });
  });

export const createClub = createServerFn({ method: "POST" })
  .middleware([optionalUser])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        workId: z.string().min(1).max(40),
        startsAt: z.string().min(10).max(40),
        note: z.string().max(240).optional(),
        serializePlanId: z.string().trim().min(1).max(80).optional(),
        startEpisode: z.number().int().min(1).max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<BookClubView> => {
    const { createClubHandler } = await import("./clubs.server");
    return createClubHandler({ ...data, hostUserId: context.userId ?? null });
  });

export const listUpcomingSessions = createServerFn({ method: "GET" }).handler(
  async (): Promise<UpcomingSit[]> => {
    const { listUpcomingSessionsHandler } = await import("./clubs.server");
    return listUpcomingSessionsHandler();
  },
);

export const getClubByInvite = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ token: z.string().min(10).max(24) }).parse(input))
  .handler(async ({ data }): Promise<BookClubView | null> => {
    const { getClubByInviteHandler } = await import("./clubs.server");
    return getClubByInviteHandler(data.token);
  });

export const getBookClub = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string().min(4).max(16) }).parse(input))
  .handler(async ({ data }): Promise<BookClubView | null> => {
    const { getBookClubHandler } = await import("./clubs.server");
    return getBookClubHandler(data.id);
  });

export const listBookClubs = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ ids: z.array(z.string().min(4).max(16)).max(40) }).parse(input),
  )
  .handler(async ({ data }): Promise<BookClubView[]> => {
    const { listBookClubsHandler } = await import("./clubs.server");
    return listBookClubsHandler(data.ids);
  });

export const addClubSession = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        token: z.string().min(10).max(24),
        startsAt: z.string().min(10).max(40),
        label: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<BookClubView> => {
    const { addClubSessionHandler } = await import("./clubs.server");
    return addClubSessionHandler(data);
  });

export const joinClubByInvite = createServerFn({ method: "POST" })
  .middleware([optionalUser])
  .validator((input: unknown) => z.object({ token: z.string().min(10).max(24) }).parse(input))
  .handler(async ({ context, data }): Promise<BookClubView | null> => {
    const { joinClubByInviteHandler } = await import("./clubs.server");
    return joinClubByInviteHandler(data.token, context.userId);
  });
