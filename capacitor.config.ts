/// <reference types="@capacitor/status-bar" />

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS shell for the same Pages client. The web build stays at /salon/;
 * scripts/build-ios.mjs stages that output under dist-ios/salon and a
 * paper-colored redirect at the web view root. Signing stays empty.
 */
const config: CapacitorConfig = {
  appId: "press.vellum.tbr",
  appName: "tbr",
  webDir: "dist-ios",
  backgroundColor: "#F3F1EB",
  ios: {
    backgroundColor: "#F3F1EB",
    // Never let UIKit pad the web view. The CSS safe-area insets already
    // clear the status bar and the home indicator, and a second inset
    // leaves a white band under a full-bleed page.
    contentInset: "never",
    // The document itself does not scroll. Inner columns do. Leaving the
    // web view scroll enabled rubber-bands the paper edge into a gap.
    scrollEnabled: false,
    preferredContentMode: "mobile",
  },
  plugins: {
    StatusBar: {
      // Content draws under the status bar, the same way the installed
      // Pages shell uses black-translucent. Glyphs stay light; the page
      // paints the strip.
      overlaysWebView: true,
      style: "DARK",
    },
  },
};

export default config;
