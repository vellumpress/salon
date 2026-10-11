import { formatHandle, handleError, normalizeHandle } from "./social.ts";
import { withBase } from "./site.ts";
import { getSupabase } from "./supabase.ts";

export const HANDLE_TAKEN_MESSAGE = "That @handle is taken.";

export type HandleAvailability = "free" | "taken" | "unknown" | "invalid" | "";

/** The line under the @name field. A name is asked for once, on create. */
export function handleAvailabilityLine(handle: string, status: HandleAvailability): string {
  const clean = normalizeHandle(handle);
  if (!clean) return "";
  const invalid = handleError(clean);
  if (invalid) return invalid;
  if (status === "taken") return "Someone already sits as that name.";
  if (status === "free") return `${formatHandle(clean)} is free.`;
  if (status === "unknown") return "Could not check that name.";
  return "Checking…";
}

export function canClaimHandle(handle: string, status: HandleAvailability) {
  const clean = normalizeHandle(handle);
  if (handleError(clean)) return false;
  return status === "free" || status === "unknown";
}

/** Live check against public profiles. This reader's own name stays free. */
export async function hostedHandleStatus(handle: string): Promise<Exclude<HandleAvailability, "">> {
  const clean = normalizeHandle(handle);
  if (handleError(clean)) return "invalid";
  try {
    const supabase = getSupabase();
    const session = await supabase.auth.getSession();
    const { data, error } = await supabase.from("profiles").select("id").eq("handle", clean).maybeSingle();
    if (error) return "unknown";
    if (!data?.id) return "free";
    if (session.data.session?.user.id === data.id) return "free";
    return "taken";
  } catch (error) {
    if (isNetworkError(error)) return "unknown";
    return "unknown";
  }
}

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

/** Production links return to the Pages app. Local checks stay on this origin. */
export function authReturnUrl(path: string, origin?: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const here = origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(here)) {
    return `${here}${withBase(suffix)}`;
  }
  return `https://vellumpress.github.io/salon${suffix}`;
}

function emailRedirectTo() {
  if (typeof window === "undefined") return undefined;
  return authReturnUrl("/login");
}

export const PASSWORD_MISMATCH_MESSAGE = "That email and password did not match.";
export const EMAIL_EXISTS_MESSAGE = "That email already sits on tbr. Sign in.";
export const MAGIC_LINK_SENT = "Check your email. The link brings you back here.";
export const MAIL_RATE_MESSAGE = "Too many emails just now. Wait a little, then ask again.";

export function authFailureMessage(status: "invalid" | "exists" | "session") {
  if (status === "exists") return EMAIL_EXISTS_MESSAGE;
  if (status === "invalid") return PASSWORD_MISMATCH_MESSAGE;
  return "Could not claim the @name.";
}

/** Expired confirm or sign-in links. A missing link is not an error. */
export function authLinkNotice(search: string, hash: string) {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const code =
    query.get("error_code") || hashParams.get("error_code") || query.get("error") || hashParams.get("error") || "";
  if (code === "otp_expired" || code === "access_denied") {
    return "That link has expired. Ask for a new one.";
  }
  return "";
}

export const RESET_EMAIL_SUCCESS =
  "If an account exists for that email, a reset link is on its way.";

export const RESET_EMAIL_RATE = "Too many requests, try again in a bit";

export type ResetEmailNotice = { tone: "success" | "rate"; text: string };

/** Neutral success unless Supabase is rate-limiting the reset mail. */
export function resetEmailNotice(
  error: { code?: string; message?: string } | null | undefined,
): ResetEmailNotice {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  if (code === "over_email_send_rate_limit" || /over_email_send_rate_limit|rate limit/i.test(`${code} ${message}`)) {
    return { tone: "rate", text: RESET_EMAIL_RATE };
  }
  return { tone: "success", text: RESET_EMAIL_SUCCESS };
}

export type RecoveryLinkKind = "pending" | "invalid";

/**
 * Recovery links arrive as `#access_token&type=recovery` (implicit, kept by
 * the Pages 404 shim) or `?code=` (PKCE). Anything else is not a live link.
 */
export function recoveryLinkKind(search: string, hash: string): RecoveryLinkKind {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const errorCode =
    query.get("error_code") || query.get("error") || hashParams.get("error_code") || hashParams.get("error");
  if (errorCode) return "invalid";
  if (hashParams.get("type") === "recovery" && hashParams.get("access_token")) return "pending";
  if (query.get("code")) return "pending";
  return "invalid";
}

/** Don't sign the recovery session out while the new password is being set. */
export function shouldPreserveRecoverySession(event: string | null | undefined, pathname: string) {
  if (event === "PASSWORD_RECOVERY") return true;
  return pathname.replace(/\/+$/, "").endsWith("/reset-password");
}

export function isNetworkError(error: unknown) {
  if (error instanceof TypeError) return true;
  const name =
    error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  if (name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|network|load failed|aborted|timeout/i.test(message);
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
      return { status: "error", message: EMAIL_EXISTS_MESSAGE };
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
  if (step.status === "session" || step.status === "invalid" || step.status === "exists") {
    return { status: "error", message: authFailureMessage(step.status) };
  }
  return step;
}

export function signInCodeError(token: string) {
  const code = token.replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(code)) return "The code is six digits.";
  return null;
}

/**
 * Finish a sign-in from the code in the email. Does not create an account.
 * A session with no @name yet is left for the claim field.
 */
export async function confirmSignInCode(
  email: string,
  token: string,
): Promise<
  | { ok: true; handle: string }
  | { ok: false; needsHandle: true; message: string }
  | { ok: false; needsHandle?: false; message: string }
> {
  const fail = signInCodeError(token);
  if (fail) return { ok: false, message: fail };
  const code = token.replace(/\s/g, "");
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error || !data.session) {
      const notice = resetEmailNotice(error);
      if (notice.tone === "rate") return { ok: false, message: MAIL_RATE_MESSAGE };
      const message = error?.message ?? "";
      if (/expired|invalid|otp/i.test(message)) {
        return { ok: false, message: "That code has expired. Ask for a new one." };
      }
      return { ok: false, message: message || "That code did not work." };
    }
    const existing = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", data.session.user.id)
      .maybeSingle();
    const seated = normalizeHandle(existing.data?.handle ?? "");
    if (seated.length >= 2) return { ok: true, handle: seated };
    const meta = normalizeHandle(String(data.session.user.user_metadata?.handle ?? ""));
    if (meta.length >= 2) {
      const claimed = await ensureProfile(meta);
      if (claimed.ok) return { ok: true, handle: claimed.handle };
      if (claimed.error === HANDLE_TAKEN_MESSAGE) {
        return { ok: false, needsHandle: true, message: "That @name is taken. Pick another." };
      }
    }
    return { ok: false, needsHandle: true, message: "Pick an @name to finish." };
  } catch (error) {
    if (isNetworkError(error)) return { ok: false, message: "Could not reach tbr." };
    return { ok: false, message: "That code did not work." };
  }
}

/** Email a one-time sign-in link. Does not create a second account. */
export async function sendSignInLink(
  email: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authReturnUrl("/login"),
        shouldCreateUser: false,
      },
    });
    if (!error) return { ok: true, message: MAGIC_LINK_SENT };
    const notice = resetEmailNotice(error);
    if (notice.tone === "rate") return { ok: false, message: MAIL_RATE_MESSAGE };
    const mapped = mapAuthError(error);
    if (mapped.status === "invalid" || /not found|signups not allowed|user/i.test(error.message ?? "")) {
      return { ok: false, message: "No account for that email. Create one." };
    }
    if (mapped.status === "offline") return { ok: false, message: "Could not reach tbr." };
    if (mapped.status === "error") return { ok: false, message: mapped.message };
    return { ok: false, message: error.message || "Could not send the link." };
  } catch (error) {
    if (isNetworkError(error)) return { ok: false, message: "Could not reach tbr." };
    return { ok: false, message: "Could not send the link." };
  }
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
