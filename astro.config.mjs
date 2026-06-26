import { defineConfig } from 'astro/config';

// Static site. No runtime, no framework — just Astro components + vanilla JS.
// Mounted as a sub-path of the apex (facundogoni.com.ar/ghostty-themes) rather
// than a subdomain, so `base` prefixes every generated link/asset and `outDir`
// nests the build under dist/ghostty-themes/ — that way the on-disk path equals
// the URL path and Cloudflare serves it statically with no prefix-stripping code.
export default defineConfig({
  site: 'https://www.facundogoni.com.ar',
  base: '/ghostty-themes',
  outDir: './dist/ghostty-themes',
  build: { format: 'file' },
  vite: {
    // ghostty-web is lazy-imported on demand; pre-bundling it deterministically
    // keeps Vite's dep optimizer from stalling the dynamic import in dev.
    optimizeDeps: { include: ['ghostty-web'] },
  },
});
