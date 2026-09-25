import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { DeferredRemoteSync } from "@/components/deferred-remote-sync";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { APP_DESCRIPTION, APP_NAME, WORDMARK, withBase } from "@/lib/site";
import { attachVisualViewport } from "@/lib/vvh";
import appCss from "../styles.css?url";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Outfit:wght@300;400;500&display=swap";

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

/** Apply the reading faces after first paint so they cannot block the shell. */
function DeferredFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
    return () => link.remove();
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
      { rel: "icon", type: "image/svg+xml", href: withBase("/favicon.svg") },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", href: FONT_HREF, as: "style" },
      { rel: "manifest", href: withBase("/__grok/manifest.webmanifest") },
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
        <DeferredFonts />
        <DeferredRemoteSync />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
