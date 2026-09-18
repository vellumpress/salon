import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";

export type SentenceShare = {
  token: string;
  workId: string;
  breathIndex: number;
  sentenceText: string;
  toPhone: string;
  createdBy: string | null;
  createdAt: string;
  claimedAt: string | null;
};

type SentenceShareRow = {
  token: string;
  work_id: string;
  breath_index: number;
  sentence_text: string;
  to_phone: string;
  created_by: string | null;
  created_at: string | Date;
  claimed_at: string | Date | null;
};

function makeToken() {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

function toShare(row: SentenceShareRow): SentenceShare {
  return {
    token: row.token,
    workId: row.work_id,
    breathIndex: Number(row.breath_index),
    sentenceText: row.sentence_text,
    toPhone: row.to_phone,
    createdBy: row.created_by,
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString(),
    claimedAt: row.claimed_at
      ? typeof row.claimed_at === "string"
        ? row.claimed_at
        : row.claimed_at.toISOString()
      : null,
  };
}

export async function createSentenceShareHandler(input: {
  workId: string;
  breathIndex: number;
  sentenceText: string;
  toPhone?: string;
  createdBy?: string;
}): Promise<{
  token: string;
  workId: string;
  breathIndex: number;
  sentenceText: string;
}> {
  const sql = await getSql();
  const token = makeToken();
  const toPhone = (input.toPhone ?? "").trim().slice(0, 40);
  const createdBy = input.createdBy?.trim() || null;
  const sentenceText = input.sentenceText.slice(0, 4000);

  await sql`
    insert into sentence_shares (
      token, work_id, breath_index, sentence_text, to_phone, created_by
    ) values (
      ${token},
      ${input.workId},
      ${input.breathIndex},
      ${sentenceText},
      ${toPhone},
      ${createdBy}
    )
  `;

  return {
    token,
    workId: input.workId,
    breathIndex: input.breathIndex,
    sentenceText,
  };
}

export async function getSentenceShareHandler(
  token: string,
): Promise<SentenceShare | null> {
  const sql = await getSql();
  const rows = await sql<SentenceShareRow>`
    select
      token, work_id, breath_index, sentence_text, to_phone,
      created_by, created_at, claimed_at
    from sentence_shares
    where token = ${token}
  `;
  const row = rows[0];
  if (!row) return null;

  if (!row.claimed_at) {
    await sql`
      update sentence_shares
      set claimed_at = now()
      where token = ${token} and claimed_at is null
    `;
    const refreshed = await sql<SentenceShareRow>`
      select
        token, work_id, breath_index, sentence_text, to_phone,
        created_by, created_at, claimed_at
      from sentence_shares
      where token = ${token}
    `;
    return refreshed[0] ? toShare(refreshed[0]) : toShare(row);
  }

  return toShare(row);
}
