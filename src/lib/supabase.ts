import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isOffline, networkFetch } from "./net.ts";

/** Hosted tbr directory. Publishable key only — safe in the client. */
export const SUPABASE_URL = "https://thuxsshowkxacbfjdaks.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_2l4YNNqYAWs6bXQxZ0rMSg_B_3-8gPv";

/** New key. Does not replace vellum-v1, salon-reader-v1, or other local stores. */
export const SUPABASE_AUTH_STORAGE_KEY = "tbr-supabase-auth";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        // A refresh at launch waits on the network. Skip it when the radio is off
        // so getSession can return the stored session without a hanging fetch.
        autoRefreshToken: !isOffline(),
        detectSessionInUrl: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
      global: {
        fetch: networkFetch,
      },
    });
  }
  return client;
}
