import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enqueueActivityFlush,
  publishActivity,
  syncActivityDrafts,
} from "./remote-directory.ts";
import { foldClosedSit } from "./active-read.ts";

type Stored = {
  user_id: string;
  kind: string;
  book_id: string | null;
  payload: Record<string, string | number>;
  created_at: string;
  client_key: string;
};

/**
 * In-memory activity table. A unique (user_id, client_key) is the constraint
 * the migration adds. `failNextInsert` commits the row and then reports an
 * error, which is the retry that used to insert a second copy.
 */
function memoryActivity() {
  const rows: Stored[] = [];
  let failNextInsert = false;
  let lock: Promise<void> = Promise.resolve();

  function gate<T>(run: () => T | Promise<T>): Promise<T> {
    const job = lock.then(run, run);
    lock = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }

  function commit(list: Stored[]): { error: { code: string; message: string } | null } {
    for (const row of list) {
      if (rows.some((item) => item.user_id === row.user_id && item.client_key === row.client_key)) {
        return { error: { code: "23505", message: "duplicate key" } };
      }
    }
    for (const row of list) rows.push({ ...row, payload: { ...row.payload } });
    return { error: null };
  }

  const client = {
    from(table: string) {
      if (table !== "activity") throw new Error(`unexpected table ${table}`);
      return {
        insert(payload: Stored | Stored[]) {
          const list = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
            ...row,
            payload: { ...row.payload },
          }));
          return gate(() => {
            const committed = commit(list);
            if (committed.error) return committed;
            if (failNextInsert) {
              failNextInsert = false;
              return { error: { code: "57014", message: "timeout" } };
            }
            return { error: null };
          });
        },
        update(patch: Partial<Stored>) {
          const filters: Array<[keyof Stored, string]> = [];
          const chain = {
            eq(column: keyof Stored, value: string) {
              filters.push([column, value]);
              return chain;
            },
            then(
              resolve: (value: { error: null }) => unknown,
              reject?: (reason: unknown) => unknown,
            ) {
              return gate(() => {
                for (const row of rows) {
                  const matches = filters.every(([column, value]) => String(row[column]) === value);
                  if (!matches) continue;
                  if (patch.payload) row.payload = { ...patch.payload };
                  if (patch.created_at) row.created_at = patch.created_at;
                  if (patch.kind) row.kind = patch.kind;
                  if (patch.book_id !== undefined) row.book_id = patch.book_id;
                }
                return { error: null };
              }).then(resolve, reject);
            },
          };
          return chain;
        },
      };
    },
  };

  return {
    rows,
    client: client as unknown as SupabaseClient,
    failNextCommittedInsert() {
      failNextInsert = true;
    },
  };
}

function sitDraft(key: string, progress: string, at: number) {
  return {
    key,
    kind: "sit" as const,
    bookId: "the-house-of-mirth",
    at,
    payload: { summary: "sat with The House of Mirth", progress },
  };
}

test("a session writes exactly one activity row when the effect fires twice and the insert is retried", async () => {
  const memory = memoryActivity();
  const userId = "reader-1";
  const sessionKey = "sit:session-1";
  const keys = new Set<string>();
  const remember = (saved: string[]) => {
    for (const key of saved) keys.add(key);
  };
  const readKeys = () => new Set(keys);

  // Two flushes both pass the unpublished-key check, as a strict-mode remount
  // does when the first publish has not remembered its key yet.
  await Promise.all([
    publishActivity(userId, [sitDraft(sessionKey, "38 min", 1_000)], new Set(), memory.client),
    publishActivity(userId, [sitDraft(sessionKey, "38 min", 1_000)], new Set(), memory.client),
  ]);
  assert.equal(memory.rows.length, 1);
  assert.equal(memory.rows[0]?.client_key, sessionKey);

  await Promise.all([
    enqueueActivityFlush(() =>
      syncActivityDrafts({
        userId,
        drafts: [sitDraft(sessionKey, "38 min", 1_000)],
        readKeys,
        remember,
        client: memory.client,
        cancelled: () => false,
      }),
    ),
    enqueueActivityFlush(() =>
      syncActivityDrafts({
        userId,
        drafts: [sitDraft(sessionKey, "38 min", 1_000)],
        readKeys,
        remember,
        client: memory.client,
        cancelled: () => false,
      }),
    ),
  ]);
  assert.equal(memory.rows.length, 1);
  assert.equal(keys.has(sessionKey), true);

  const later = await publishActivity(
    userId,
    [sitDraft(sessionKey, "47 min", 2_000)],
    new Set(),
    memory.client,
  );
  assert.deepEqual(later, [sessionKey]);
  assert.equal(memory.rows.length, 1);
  assert.equal(memory.rows[0]?.payload.progress, "47 min");

  // The insert landed, then the client was told it failed. The per-row retry
  // must not add a second copy of that session.
  const retryKey = "sit:session-2";
  memory.failNextCommittedInsert();
  const saved = await publishActivity(userId, [sitDraft(retryKey, "16 min", 3_000)], new Set(), memory.client);
  assert.deepEqual(saved, [retryKey]);
  assert.equal(memory.rows.filter((row) => row.client_key === retryKey).length, 1);
  assert.equal(memory.rows.length, 2);
});

test("closing one sit twice keeps a single history row", () => {
  const first = { id: "session-local", workId: "passing", minutes: 38, endedAt: 1_000 };
  const opened = foldClosedSit([], first, 80);
  assert.equal(opened.added, true);
  const repeated = foldClosedSit(opened.history, { ...first, endedAt: 2_000 }, 80);
  assert.equal(repeated.added, false);
  assert.equal(repeated.history.length, 1);
  const later = foldClosedSit(repeated.history, { ...first, minutes: 47, endedAt: 3_000 }, 80);
  assert.equal(later.added, false);
  assert.equal(later.history.length, 1);
  assert.equal(later.history[0]?.minutes, 47);
  const other = foldClosedSit(later.history, { id: "session-2", workId: "passing", minutes: 2, endedAt: 4_000 }, 80);
  assert.equal(other.added, true);
  assert.equal(other.history.length, 2);
});
