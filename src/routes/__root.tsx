import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { DeferredRemoteSync } from "@/components/deferred-remote-sync";
import { OfflineMark } from "@/components/offline-mark";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { APP_DESCRIPTION, APP_NAME, WORDMARK, withBase } from "@/lib/site";
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
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
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
