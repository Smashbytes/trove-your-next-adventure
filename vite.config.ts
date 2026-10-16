// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { execSync } from "node:child_process";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Build stamp: the commit this bundle was built from (plus "-dirty" for
// uncommitted changes). Rendered as <meta name="trove-build"> so anyone can
// check which version is live.
function buildStamp(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    // Real content changes only: line-ending churn (e.g. the regenerated route
    // tree on Windows) doesn't count as dirty.
    let dirty = false;
    try {
      execSync("git diff --quiet --ignore-cr-at-eol HEAD --", { stdio: "ignore" });
    } catch {
      dirty = true;
    }
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  vite: {
    define: {
      __TROVE_BUILD__: JSON.stringify(`${buildStamp()} ${new Date().toISOString()}`),
    },
  },
});
