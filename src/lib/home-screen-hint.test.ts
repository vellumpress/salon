import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_SCREEN_HINT_KEY,
  dismissHomeScreenHint,
  homeScreenHintDismissed,
  isIphoneSafari,
  isReadingPath,
  shouldOfferHomeScreenHint,
} from "./home-screen-hint.ts";

const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1";

test("the hint is for iPhone Safari, not Chrome on the phone or a laptop", () => {
  assert.equal(isIphoneSafari(SAFARI), true);
  assert.equal(isIphoneSafari(CHROME), false);
  assert.equal(
    isIphoneSafari(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    ),
    false,
  );
});

test("a sitting hides the hint; the shelf does not", () => {
  assert.equal(isReadingPath("/read/cranford"), true);
  assert.equal(isReadingPath("/salon/read/cranford"), true);
  assert.equal(isReadingPath("/"), false);
  assert.equal(isReadingPath("/login"), false);
  assert.equal(isReadingPath("/rituals"), false);
});

test("Safari on the shelf offers the hint once", () => {
  const offer = {
    userAgent: SAFARI,
    standalone: false,
    pathname: "/",
    dismissed: false,
  };
  assert.equal(shouldOfferHomeScreenHint(offer), true);
  assert.equal(shouldOfferHomeScreenHint({ ...offer, pathname: "/read/cranford" }), false);
  assert.equal(shouldOfferHomeScreenHint({ ...offer, standalone: true }), false);
  assert.equal(shouldOfferHomeScreenHint({ ...offer, dismissed: true }), false);
  assert.equal(shouldOfferHomeScreenHint({ ...offer, userAgent: CHROME }), false);
});

test("dismissing writes a flag that stays", () => {
  const bag = new Map<string, string>();
  const storage = {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
  };
  assert.equal(homeScreenHintDismissed(storage), false);
  dismissHomeScreenHint(storage);
  assert.equal(bag.get(HOME_SCREEN_HINT_KEY), "dismissed");
  assert.equal(homeScreenHintDismissed(storage), true);
});
