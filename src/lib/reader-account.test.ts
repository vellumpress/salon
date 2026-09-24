import assert from "node:assert/strict";
import test from "node:test";
import {
  createReaderAccount,
  emptyVault,
  emailError,
  handlesInVault,
  parseVault,
  passwordError,
  READER_ACCOUNT_KEY,
  renameVaultHandle,
  sessionFromVault,
  signInReaderAccount,
  signOutReaderVault,
  takenHandlesForSignup,
} from "./reader-account.ts";

test("emailError requires a simple address", () => {
  assert.equal(emailError(""), "A real email, please.");
  assert.equal(emailError("mike"), "A real email, please.");
  assert.equal(emailError("mike@salon"), "A real email, please.");
  assert.equal(emailError(" mike@vellum.press "), null);
});

test("passwordError requires eight characters", () => {
  assert.equal(passwordError("short"), "Eight characters at least.");
  assert.equal(passwordError("longenough"), null);
});

test("createReaderAccount hashes the password and restores a session", async () => {
  const created = await createReaderAccount(
    { handle: "@Mina", email: "Mina@Vellum.press", password: "sitquietly" },
    emptyVault(),
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.session.handle, "mina");
  assert.equal(created.session.email, "mina@vellum.press");
  const account = created.vault.accounts[0];
  assert.ok(account);
  assert.notEqual(account.hash, "sitquietly");
  assert.doesNotMatch(JSON.stringify(created.vault), /sitquietly/);
  const restored = sessionFromVault(created.vault);
  assert.equal(restored?.handle, "mina");
  assert.equal(restored?.email, "mina@vellum.press");
});

test("handle uniqueness is other local accounts, not a demo directory", async () => {
  const first = await createReaderAccount(
    { handle: "mina", email: "mina@vellum.press", password: "sitquietly" },
    emptyVault(),
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const formerDemo = await createReaderAccount(
    { handle: "ada", email: "ada@vellum.press", password: "sitquietly" },
    first.vault,
  );
  assert.equal(formerDemo.ok, true);
  const duplicate = await createReaderAccount(
    { handle: "mina", email: "other@vellum.press", password: "sitquietly" },
    first.vault,
  );
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.error, "Someone already sits as that name.");
  }
  const sameEmail = await createReaderAccount(
    { handle: "cleo2", email: "mina@vellum.press", password: "sitquietly" },
    first.vault,
  );
  assert.equal(sameEmail.ok, false);
  if (!sameEmail.ok) {
    assert.equal(sameEmail.error, "That email already sits here. Sign in.");
  }
});

test("existing Friends handle is allowed on first account", async () => {
  const created = await createReaderAccount(
    { handle: "mina", email: "mina@vellum.press", password: "sitquietly" },
    emptyVault(),
    ["jules"],
    "mina",
  );
  assert.equal(created.ok, true);
  const taken = takenHandlesForSignup(emptyVault(), ["mina", "jules"], "mina");
  assert.ok(taken.includes("jules"));
  assert.ok(!taken.includes("mina"));
});

test("sign-in checks the hash and sign-out keeps the vault", async () => {
  const created = await createReaderAccount(
    { handle: "mina", email: "mina@vellum.press", password: "sitquietly" },
    emptyVault(),
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const wrong = await signInReaderAccount(
    { email: "mina@vellum.press", password: "wrongpass" },
    signOutReaderVault(created.vault),
  );
  assert.equal(wrong.ok, false);
  const missing = await signInReaderAccount(
    { email: "ghost@vellum.press", password: "sitquietly" },
    created.vault,
  );
  assert.equal(missing.ok, false);
  const ok = await signInReaderAccount(
    { email: "Mina@Vellum.press", password: "sitquietly" },
    signOutReaderVault(created.vault),
  );
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.session.handle, "mina");
  const signedOut = signOutReaderVault(ok.vault);
  assert.equal(sessionFromVault(signedOut), null);
  assert.equal(signedOut.accounts.length, 1);
});

test("parseVault restores a hard-refresh session and drops a stale one", () => {
  const raw = JSON.stringify({
    accounts: [
      {
        email: "mina@vellum.press",
        handle: "mina",
        name: "",
        salt: "aa",
        hash: "bb",
        iterations: 120000,
        createdAt: 1,
      },
    ],
    sessionEmail: "mina@vellum.press",
  });
  const vault = parseVault(raw);
  assert.equal(sessionFromVault(vault)?.handle, "mina");
  assert.equal(parseVault('{"accounts":[],"sessionEmail":"ghost@x.com"}').sessionEmail, null);
  assert.equal(parseVault("not-json").accounts.length, 0);
  assert.equal(READER_ACCOUNT_KEY, "salon-reader-v1");
});

test("renameVaultHandle updates only the signed-in account", () => {
  const vault = {
    accounts: [
      {
        email: "mina@vellum.press",
        handle: "mina",
        name: "",
        salt: "aa",
        hash: "bb",
        iterations: 1,
        createdAt: 1,
      },
    ],
    sessionEmail: "mina@vellum.press",
  };
  const next = renameVaultHandle(vault, "@Reader");
  assert.equal(next.accounts[0]?.handle, "reader");
  assert.deepEqual(handlesInVault(next), ["reader"]);
});
