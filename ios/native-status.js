/**
 * Native-only status bar. Copied into the iOS web dir by scripts/build-ios.mjs.
 * The Pages build never loads this file. On the web, Capacitor is absent and
 * this returns immediately.
 */
(function () {
  var cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== "function" || !cap.isNativePlatform()) return;
  var bar = cap.Plugins && cap.Plugins.StatusBar;
  if (!bar || typeof bar.setOverlaysWebView !== "function") return;
  bar.setOverlaysWebView({ overlay: true });
  if (typeof bar.setStyle === "function") bar.setStyle({ style: "DARK" });
})();
