import { formatHandle, handleError, normalizeHandle } from "./social.ts";
import { withBase } from "./site.ts";
import { getSupabase } from "./supabase.ts";

export const HANDLE_TAKEN_MESSAGE = "That @handle is taken.";

export function confirmEmailMessage(handle = "") {
  const name = formatHandle(handle);
  if (!name) {
    return "Check your email to confirm. You can keep reading on this phone meanwhile.";
  }
  return `Check your email to confirm ${name}. You can keep reading on this phone meanwhile.`;
}

export type HostedConnect =
  | { status: "session"; handle: string }
  | { status: "confirm_email" }
  | { status: "offline" }
  | { status: "handle_taken"; message: string }
  | { status: "error"; message: string };

type AuthStep =
  | { status: "session" }
  | { status: "confirm_email" }
  | { status: "offline" }
  | { status: "invalid" }
  | { status: "exists" }
  | { status: "error"; message: string };

function emailRedirectTo() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${withBase("/login")}`;
}

export function isNetworkError(error: unknown) {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|network|load failed/i.test(message);
}

export function mapAuthError(error: { message?: string; code?: string } | null): AuthStep {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();
  if (!error) return { status: "error", message: "Could not reach tbr." };
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return { status: "confirm_email" };
  }
  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return { status: "exists" };
  }
  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return { status: "invalid" };
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return {
      status: "error",
      message:
        "The confirmation email is catching its breath. You can keep reading on this phone and sign in again shortly.",
    };
  }
  if (isNetworkError(error.message ? new Error(error.message) : error)) {
    return { status: "offline" };
  }
  return { status: "error", message: error.message || "Could not reach tbr." };
}

async function signInPassword(email: string, password: string): Promise<AuthStep> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) return mapAuthError(error);
  if (!data.session) return { status: "confirm_email" };
  return { status: "session" };
}

async function signUpPassword(
  email: string,
  password: string,
  handle: string,
): Promise<AuthStep> {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { handle },
      emailRedirectTo: emailRedirectTo(),
    },
  });
  if (error) {
    const mapped = mapAuthError(error);
    if (mapped.status === "exists") return signInPassword(email, password);
    return mapped;
  }
  const identities = data.user?.identities ?? [];
  if (data.user && identities.length === 0) {
    const signed = await signInPassword(email, password);
    if (signed.status === "invalid") {
      return { status: "error", message: "That email already sits on tbr. Sign in." };
    }
    return signed;
  }
  if (!data.session) return { status: "confirm_email" };
  return { status: "session" };
}

export async function ensureProfile(
  handle: string,
  displayName = "",
): Promise<{ ok: true; handle: string } | { ok: false; error: string }> {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError && isNetworkError(sessionError)) return { ok: false, error: "offline" };
  const session = sessionData.session;
  if (!session) return { ok: false, error: "offline" };
  const userId = session.user.id;
  const existing = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
  if (existing.error) {
    if (isNetworkError(existing.error)) return { ok: false, error: "offline" };
    return { ok: false, error: existing.error.message };
  }
  if (existing.data?.handle) return { ok: true, handle: normalizeHandle(existing.data.handle) };
  const clean = normalizeHandle(handle);
  const invalid = handleError(clean);
  if (invalid) return { ok: false, error: invalid };
  const inserted = await supabase.from("profiles").insert({
    id: userId,
    handle: clean,
    display_name: displayName.trim().slice(0, 80) || null,
  });
  if (!inserted.error) return { ok: true, handle: clean };
  if (inserted.error.code === "23505") {
    const again = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
    if (again.data?.handle) return { ok: true, handle: normalizeHandle(again.data.handle) };
    return { ok: false, error: HANDLE_TAKEN_MESSAGE };
  }
  if (isNetworkError(inserted.error)) return { ok: false, error: "offline" };
  return { ok: false, error: inserted.error.message };
}

async function claimOrReport(handle: string, name?: string): Promise<HostedConnect> {
  const claimed = await ensureProfile(handle, name ?? "");
  if (claimed.ok) return { status: "session", handle: claimed.handle };
  if (claimed.error === "offline") return { status: "offline" };
  if (claimed.error === HANDLE_TAKEN_MESSAGE) {
    return { status: "handle_taken", message: HANDLE_TAKEN_MESSAGE };
  }
  return { status: "error", message: claimed.error };
}

/**
 * Create or sign in the hosted account, then claim the local @handle.
 * Network failures stay offline so the phone account still works.
 */
export async function connectHostedAccount(input: {
  mode: "up" | "in";
  email: string;
  password: string;
  handle: string;
  name?: string;
}): Promise<HostedConnect> {
  try {
    if (input.mode === "up") {
      const signed = await signUpPassword(input.email, input.password, input.handle);
      if (signed.status !== "session") return idle(signed);
      return claimOrReport(input.handle, input.name);
    }
    const signed = await signInPassword(input.email, input.password);
    if (signed.status !== "session") return idle(signed);
    return claimOrReport(input.handle, input.name);
  } catch (error) {
    if (isNetworkError(error)) return { status: "offline" };
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not reach tbr.",
    };
  }
}

function idle(step: AuthStep): HostedConnect {
  if (step.status === "session") return { status: "error", message: "Could not claim the @name." };
  if (step.status === "invalid" || step.status === "exists") {
    return { status: "error", message: "That email already sits on tbr. Sign in." };
  }
  return step;
}

export async function updateHostedHandle(
  handle: string,
): Promise<{ ok: true; handle: string; skipped?: boolean } | { ok: false; error: string }> {
  const clean = normalizeHandle(handle);
  const invalid = handleError(clean);
  if (invalid) return { ok: false, error: invalid };
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return { ok: true, handle: clean, skipped: true };
    const existing = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", session.user.id)
      .maybeSingle();
    if (existing.error && isNetworkError(existing.error)) {
      return { ok: true, handle: clean, skipped: true };
    }
    if (!existing.data) {
      const claimed = await ensureProfile(clean);
      if (claimed.ok) return { ok: true, handle: claimed.handle };
      if (claimed.error === "offline") return { ok: true, handle: clean, skipped: true };
      return claimed;
    }
    if (normalizeHandle(existing.data.handle) === clean) return { ok: true, handle: clean };
    const updated = await supabase
      .from("profiles")
      .update({ handle: clean })
      .eq("id", session.user.id);
    if (!updated.error) return { ok: true, handle: clean };
    if (updated.error.code === "23505") return { ok: false, error: HANDLE_TAKEN_MESSAGE };
    if (isNetworkError(updated.error)) return { ok: true, handle: clean, skipped: true };
    return { ok: false, error: updated.error.message };
  } catch (error) {
    if (isNetworkError(error)) return { ok: true, handle: clean, skipped: true };
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update that @name.",
    };
  }
}

export async function signOutHosted() {
  try {
    await getSupabase().auth.signOut();
  } catch {
    /* local sign-out still stands */
  }
}

export async function hostedSession() {
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}
