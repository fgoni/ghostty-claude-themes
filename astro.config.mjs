import { defineConfig } from 'astro/config';

// Static site. No runtime, no framework — just Astro components + vanilla JS.
export default defineConfig({
  site: 'http://localhost:4321',
  build: { format: 'file' },
  vite: {
    // ghostty-web is lazy-imported on demand; pre-bundling it deterministically
    // keeps Vite's dep optimizer from stalling the dynamic import in dev.
    optimizeDeps: { include: ['ghostty-web'] },
  },
});
