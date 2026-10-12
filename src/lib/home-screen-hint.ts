import { isStandaloneDisplay } from "./status-bar-color.ts";

/** Once dismissed, the hint stays gone on this phone. */
export const HOME_SCREEN_HINT_KEY = "tbr-home-screen";

export function isIphoneSafari(userAgent: string): boolean {
  if (!/iPhone/.test(userAgent)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//.test(userAgent)) return false;
  return /Version\/[\d.]+.*Safari\//.test(userAgent);
}

export function isReadingPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";
  return /(?:^|\/)read(?:\/|$)/.test(path);
}

export function homeScreenHintDismissed(
  storage: { getItem(key: string): string | null } | null | undefined,
): boolean {
  try {
    return storage?.getItem(HOME_SCREEN_HINT_KEY) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissHomeScreenHint(
  storage: { setItem(key: string, value: string): void } | null | undefined,
): void {
  try {
    storage?.setItem(HOME_SCREEN_HINT_KEY, "dismissed");
  } catch {
    /* private mode */
  }
}

export function shouldOfferHomeScreenHint(input: {
  userAgent: string;
  standalone: boolean;
  pathname: string;
  dismissed: boolean;
}): boolean {
  if (input.dismissed || input.standalone) return false;
  if (isReadingPath(input.pathname)) return false;
  return isIphoneSafari(input.userAgent);
}

export function readHomeScreenOffer(input: {
  userAgent: string;
  pathname: string;
  nav: { standalone?: boolean } | null | undefined;
  displayModeStandalone: boolean;
  storage: { getItem(key: string): string | null } | null | undefined;
}): boolean {
  return shouldOfferHomeScreenHint({
    userAgent: input.userAgent,
    standalone: isStandaloneDisplay(input.nav, input.displayModeStandalone),
    pathname: input.pathname,
    dismissed: homeScreenHintDismissed(input.storage),
  });
}
