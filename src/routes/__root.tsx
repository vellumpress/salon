import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { RemoteSync } from "@/components/remote-sync";
import { APP_DESCRIPTION, APP_NAME, WORDMARK, withBase } from "@/lib/site";
import { attachVisualViewport } from "@/lib/vvh";
import appCss from "../styles.css?url";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Outfit:wght@300;400;500&display=swap";

function VisualViewport() {
  useEffect(() => attachVisualViewport(), []);
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
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "application-name", content: APP_NAME },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: withBase("/favicon.svg") },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: FONT_HREF },
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
        <VisualViewport />
        <RemoteSync />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
