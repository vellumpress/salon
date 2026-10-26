# tbr on iOS

The Capacitor project in `ios/` wraps the same static client GitHub Pages
serves. `npm run build` is unchanged. `npm run build:ios` runs that build,
copies it under `dist-ios/salon/` (the app's `/salon/` base), and syncs the
Xcode project. Signing is not configured. This repo has no certificates,
profiles, or API keys.

You need a Mac with Xcode to compile. This does not produce an App Store build
by itself.

## Build

```sh
npm run build:ios
```

Then open `ios/App/App.xcodeproj` in Xcode.

The launch screen and the web view background are the paper color `#F3F1EB`.
The checked-in app icon is still the Capacitor placeholder. Replace it before
TestFlight. UIKit does not add its own content inset (`contentInset: never`),
and the web view itself does not scroll, so a full-bleed page is not
letterboxed and does not bounce a white band into view. The status bar overlays the page with light glyphs, matching
the installed site's `black-translucent` bar. Safe-area padding stays in the
CSS the site already uses (`viewport-fit=cover` and `env(safe-area-inset-*)`).
`ios/native-status.js` applies that overlay only inside the iOS shell.

## Apple Developer account

1. Enroll the shipping account in the Apple Developer Program.
2. In Certificates, Identifiers & Profiles, register an explicit App ID for
   the bundle id `press.vellum.tbr`. To use a different id, change `appId` in
   `capacitor.config.ts` and the App target's bundle identifier together, then
   run `npm run build:ios` again. Do that before the first TestFlight upload.
   The id in this repo is a placeholder until that registration exists.
3. Signing. The Xcode project has no team and no provisioning profile. On the
   App target, open Signing & Capabilities, select the team, and turn on
   Automatically manage signing. Xcode creates the development certificate
   and profile on that Mac. Leave those files out of git.
4. App Store Connect. Create the app with the same bundle id and the name
   `tbr`.
5. TestFlight. Product → Archive, then upload from the Organizer. Internal
   testers (App Store Connect users) can install without Beta App Review.
   External testers need a short beta review. Each upload needs a new build
   number.
6. App Store. Add the privacy questionnaire, screenshots, and age rating, then
   submit the build. The app ships the public-domain reader and calls the
   existing Supabase project over HTTPS. No extra entitlements are set here.
