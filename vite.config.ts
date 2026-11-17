import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';

// Emits sw.js with a precache list of every built file so the game works offline after first load.
function serviceWorker(): Plugin {
  return {
    name: 'lc-service-worker',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const extra = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
      const list = [...extra, ...files.map((f) => f)];
      const version = Date.now().toString(36);
      const src = readFileSync('src/engine/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__ASSETS__', JSON.stringify(list));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  server: { host: true },
});
