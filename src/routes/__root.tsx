import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { DeferredRemoteSync } from "@/components/deferred-remote-sync";
import { OfflineMark } from "@/components/offline-mark";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { APP_DESCRIPTION, APP_NAME, WORDMARK, withBase } from "@/lib/site";
import {
  PAGE_PAPER,
  applyStatusBarColorToDocument,
  readChromeBackground,
} from "@/lib/status-bar-color";
import { attachVisualViewport } from "@/lib/vvh";
import appCss from "../styles.css?url";

function VisualViewport() {
  useEffect(() => attachVisualViewport(), []);
  return null;
}

/**
 * The Pages boot watch (classic script in index.html) treats the shell as
 * stuck until this is set. It only runs after hydration, on every route.
 */
function BootMark() {
  useEffect(() => {
    document.documentElement.setAttribute("data-boot", "ready");
  }, []);
  return null;
}

/**
 * Safari: `theme-color` follows the page. Installed PWA: the strip paints the
 * safe area (deepened only when white status glyphs would fail). Daylight owns
 * the color while a live reader frame is on screen.
 *
 * The address changes before the leaving reader unmounts. A single pass yields
 * on that frame and never comes back, so the homepage keeps the reader tint.
 * Wait until the route is idle, then until the frame is actually gone.
 */
function StatusBarSync() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const status = useRouterState({ select: (state) => state.status });
  useEffect(() => {
    if (status !== "idle") return;
    let stopped = false;
    let observer: MutationObserver | null = null;
    const publish = () => {
      if (stopped) return;
      if (document.querySelector('[data-daylight]:not([data-daylight="off"])')) return;
      applyStatusBarColorToDocument(readChromeBackground(document) ?? PAGE_PAPER);
      stopped = true;
      observer?.disconnect();
    };
    publish();
    if (stopped) return;
    observer = new MutationObserver(publish);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-daylight"],
    });
    const timer = window.setTimeout(() => {
      publish();
      observer?.disconnect();
    }, 1500);
    return () => {
      stopped = true;
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [pathname, status]);
  return <div className="status-bar-fill" aria-hidden="true" />;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual",
      },
      { title: WORDMARK },
      { name: "description", content: APP_DESCRIPTION },
      { property: "og:title", content: WORDMARK },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:site_name", content: APP_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: WORDMARK },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "theme-color", content: "#F3F1EB" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "application-name", content: APP_NAME },
    ],
    links: [
      { rel: "icon", href: withBase("/favicon.ico"), sizes: "32x32" },
      { rel: "icon", type: "image/svg+xml", href: withBase("/favicon.svg") },
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: withBase("/fonts/outfit-latin-400-normal.woff2"),
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: withBase("/fonts/cormorant-garamond-latin-400-normal.woff2"),
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: withBase("/fonts/cormorant-garamond-latin-400-italic.woff2"),
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "manifest", href: withBase("/manifest.webmanifest") },
      { rel: "apple-touch-icon", href: withBase("/icon-180.png") },
      { rel: "apple-touch-icon", sizes: "192x192", href: withBase("/icon-192.png") },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <StatusBarSync />
        <BootMark />
        <VisualViewport />
        <DeferredRemoteSync />
        <OfflineMark />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
