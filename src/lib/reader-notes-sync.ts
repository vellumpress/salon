/**
 * Best-effort copy of this device's notes onto the signed-in account.
 * A missing session or a missing table leaves the local notes as they are.
 */

import { isOffline } from "./net.ts";
import { getSupabase } from "./supabase.ts";
import { parseNoteBooks, type NoteBooks } from "./reader-notes.ts";

async function userId(): Promise<string | null> {
  if (isOffline()) return null;
  try {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) return null;
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function pullRemoteNotes(): Promise<NoteBooks | null> {
  const id = await userId();
  if (!id) return null;
  try {
    const { data, error } = await getSupabase()
      .from("reader_notes")
      .select("notes")
      .eq("user_id", id)
      .maybeSingle();
    if (error || !data) return null;
    const raw = data.notes;
    return parseNoteBooks(typeof raw === "string" ? raw : JSON.stringify(raw ?? {}));
  } catch {
    return null;
  }
}

export async function pushRemoteNotes(notes: NoteBooks): Promise<void> {
  const id = await userId();
  if (!id) return;
  try {
    await getSupabase().from("reader_notes").upsert(
      { user_id: id, notes, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  } catch {
    /* stay local */
  }
}
