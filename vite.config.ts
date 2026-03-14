import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, readFileSync, writeFileSync, cpSync, mkdirSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/views/content/content.ts'),
        popup: resolve(__dirname, 'src/views/popup/popup.ts'),
        background: resolve(__dirname, 'src/background/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // Use IIFE format to avoid module issues in content scripts
        format: 'iife'
      }
    }
  },
  plugins: [
    {
      name: 'copy-assets',
      closeBundle() {
        // Copy popup.html to dist/
        const srcHtml = resolve(__dirname, 'src/views/popup/popup.html');
        const destHtml = resolve(__dirname, 'dist/popup.html');

        if (existsSync(srcHtml)) {
          copyFileSync(srcHtml, destHtml);
        }

        // Copy assets folder to dist/
        const assetsSrc = resolve(__dirname, 'assets');
        const assetsDest = resolve(__dirname, 'dist/assets');

        if (existsSync(assetsSrc)) {
          mkdirSync(assetsDest, { recursive: true });
          cpSync(assetsSrc, assetsDest, { recursive: true });
        }

        // Copy and update manifest.json to dist/
        const srcManifest = resolve(__dirname, 'manifest.json');
        const destManifest = resolve(__dirname, 'dist/manifest.json');

        if (existsSync(srcManifest)) {
          const manifestContent = readFileSync(srcManifest, 'utf-8');
          const manifest = JSON.parse(manifestContent);

          // Update paths to be relative to dist/
          manifest.action.default_popup = 'popup.html';
          manifest.content_scripts[0].js = ['content.js'];
          manifest.background.service_worker = 'background.js';

          writeFileSync(destManifest, JSON.stringify(manifest, null, 2));
        }
      }
    }
  ]
});
