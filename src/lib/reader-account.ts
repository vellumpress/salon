/**
 * Local-first reader accounts for the static Pages build.
 *
 * GitHub Pages has no Better Auth server. We persist email, @handle, and a
 * PBKDF2 password hash (never the password) on this device. A hard refresh
 * restores the session from localStorage. When `liveAuthAvailable` is on, the
 * UI still calls Better Auth email/password and keeps this vault as the handle
 * + offline bridge.
 */

import { handleError, normalizeHandle, READERS } from "./social.ts";

export const READER_ACCOUNT_KEY = "salon-reader-v1";

export const PASSWORD_ITERATIONS = 120_000;

export type ReaderAccount = {
  email: string;
  handle: string;
  name: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: number;
};

export type ReaderVault = {
  accounts: ReaderAccount[];
  sessionEmail: string | null;
};

export type ReaderSession = {
  email: string;
  handle: string;
  name: string;
};

export function emptyVault(): ReaderVault {
  return { accounts: [], sessionEmail: null };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function emailError(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "A real email, please.";
  }
  return null;
}

export function passwordError(value: string): string | null {
  if (value.length < 8) return "Eight characters at least.";
  return null;
}

export function parseVault(raw: string | null): ReaderVault {
  if (!raw) return emptyVault();
  try {
    const parsed = JSON.parse(raw) as Partial<ReaderVault>;
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts
          .map(asAccount)
          .filter((row): row is ReaderAccount => Boolean(row))
      : [];
    const sessionEmail = normalizeEmail(String(parsed.sessionEmail ?? ""));
    const known = accounts.some((row) => row.email === sessionEmail);
    return {
      accounts,
      sessionEmail: known ? sessionEmail : null,
    };
  } catch {
    return emptyVault();
  }
}

function asAccount(row: unknown): ReaderAccount | null {
  if (!row || typeof row !== "object") return null;
  const item = row as Partial<ReaderAccount>;
  const email = normalizeEmail(String(item.email ?? ""));
  const handle = normalizeHandle(String(item.handle ?? ""));
  const salt = String(item.salt ?? "");
  const hash = String(item.hash ?? "");
  const iterations = Number(item.iterations) || PASSWORD_ITERATIONS;
  if (!email || !handle || !salt || !hash) return null;
  return {
    email,
    handle,
    name: String(item.name ?? "").trim().slice(0, 80),
    salt,
    hash,
    iterations,
    createdAt: Number(item.createdAt) || 0,
  };
}

export function sessionFromVault(vault: ReaderVault): ReaderSession | null {
  if (!vault.sessionEmail) return null;
  const account = vault.accounts.find((row) => row.email === vault.sessionEmail);
  if (!account) return null;
  return {
    email: account.email,
    handle: account.handle,
    name: account.name,
  };
}

export function handlesInVault(vault?: ReaderVault): string[] {
  const rows = vault ?? readReaderVault();
  return rows.accounts.map((row) => row.handle).filter(Boolean);
}

export function takenHandlesForSignup(
  vault: ReaderVault,
  extras: Iterable<string> = [],
  allowHandle = "",
) {
  const allow = normalizeHandle(allowHandle);
  const taken = [
    ...READERS.map((row) => row.handle),
    ...vault.accounts.map((row) => row.handle),
    ...[...extras].map((row) => normalizeHandle(row)),
  ].filter((handle) => handle && handle !== allow);
  return taken;
}

export function accountByEmail(vault: ReaderVault, email: string) {
  const address = normalizeEmail(email);
  return vault.accounts.find((row) => row.email === address);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function hashesEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations = PASSWORD_ITERATIONS,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations,
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return { salt: bytesToHex(salt), hash, iterations: PASSWORD_ITERATIONS };
}

export async function verifyPassword(password: string, account: ReaderAccount) {
  const salt = hexToBytes(account.salt);
  const hash = await derivePasswordHash(password, salt, account.iterations);
  return hashesEqual(hash, account.hash);
}

export async function createReaderAccount(
  input: { handle: string; email: string; password: string; name?: string },
  vault: ReaderVault,
  extras: Iterable<string> = [],
  allowHandle = "",
): Promise<{ ok: true; vault: ReaderVault; session: ReaderSession } | { ok: false; error: string }> {
  const emailFail = emailError(input.email);
  if (emailFail) return { ok: false, error: emailFail };
  const passwordFail = passwordError(input.password);
  if (passwordFail) return { ok: false, error: passwordFail };
  const handle = normalizeHandle(input.handle);
  const taken = takenHandlesForSignup(vault, extras, allowHandle);
  const handleFail = handleError(handle, taken);
  if (handleFail) return { ok: false, error: handleFail };
  const email = normalizeEmail(input.email);
  if (accountByEmail(vault, email)) {
    return { ok: false, error: "That email already sits here. Sign in." };
  }
  const secret = await hashPassword(input.password);
  const account: ReaderAccount = {
    email,
    handle,
    name: (input.name ?? "").trim().slice(0, 80),
    salt: secret.salt,
    hash: secret.hash,
    iterations: secret.iterations,
    createdAt: Date.now(),
  };
  const next: ReaderVault = {
    accounts: [...vault.accounts, account],
    sessionEmail: email,
  };
  return {
    ok: true,
    vault: next,
    session: { email, handle, name: account.name },
  };
}

export async function signInReaderAccount(
  input: { email: string; password: string },
  vault: ReaderVault,
): Promise<{ ok: true; vault: ReaderVault; session: ReaderSession } | { ok: false; error: string }> {
  const emailFail = emailError(input.email);
  if (emailFail) return { ok: false, error: emailFail };
  const passwordFail = passwordError(input.password);
  if (passwordFail) return { ok: false, error: passwordFail };
  const account = accountByEmail(vault, input.email);
  if (!account) {
    return { ok: false, error: "No account for that email. Create one." };
  }
  const match = await verifyPassword(input.password, account);
  if (!match) return { ok: false, error: "That password does not match." };
  const next: ReaderVault = { ...vault, sessionEmail: account.email };
  return {
    ok: true,
    vault: next,
    session: { email: account.email, handle: account.handle, name: account.name },
  };
}

export function signOutReaderVault(vault: ReaderVault): ReaderVault {
  return { ...vault, sessionEmail: null };
}

export function renameVaultHandle(vault: ReaderVault, handle: string): ReaderVault {
  const clean = normalizeHandle(handle);
  if (!clean || !vault.sessionEmail) return vault;
  return {
    ...vault,
    accounts: vault.accounts.map((row) =>
      row.email === vault.sessionEmail ? { ...row, handle: clean } : row,
    ),
  };
}

export function openSessionForEmail(vault: ReaderVault, email: string, handle?: string): ReaderVault {
  const address = normalizeEmail(email);
  if (!address) return vault;
  const existing = accountByEmail(vault, address);
  if (existing) return { ...vault, sessionEmail: existing.email };
  const claimed = normalizeHandle(handle ?? address.split("@")[0] ?? "");
  if (claimed.length < 2) return vault;
  return {
    accounts: [
      ...vault.accounts,
      {
        email: address,
        handle: claimed,
        name: "",
        salt: "live",
        hash: "live",
        iterations: 0,
        createdAt: Date.now(),
      },
    ],
    sessionEmail: address,
  };
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readReaderVault(): ReaderVault {
  const slot = storage();
  return parseVault(slot?.getItem(READER_ACCOUNT_KEY) ?? null);
}

export function writeReaderVault(vault: ReaderVault) {
  const slot = storage();
  if (!slot) return;
  slot.setItem(READER_ACCOUNT_KEY, JSON.stringify(vault));
}

export function persistReaderVault(vault: ReaderVault): ReaderVault {
  writeReaderVault(vault);
  return vault;
}

export function renameActiveHandle(handle: string) {
  const next = renameVaultHandle(readReaderVault(), handle);
  writeReaderVault(next);
  return next;
}
