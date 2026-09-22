/**
 * Side-effect import. Must be the first import in vite.config.ts, before
 * `@tanstack/react-start`. `dehydrateSsrMatchId` is cached on first import;
 * patching the file afterward does not change the copy prerender already holds.
 */
import { patchInstalledDehydrateSsrMatchId } from "./ssr-nul.mjs";

const patched = patchInstalledDehydrateSsrMatchId();
if (patched.length > 0) {
  console.error(
    `[ssr-match-id-no-nul] patched ${patched.length} router-core file(s) before TanStack loaded`,
  );
}
