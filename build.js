import { build } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from 'fs';

// Clean dist folder
const distDir = resolve(process.cwd(), 'dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Common build config for IIFE output
const createConfig = (entry, fileName) => ({
  root: process.cwd(),
  build: {
    outDir: distDir,
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(process.cwd(), entry),
      output: {
        entryFileNames: fileName,
        format: 'iife',
        inlineDynamicImports: true
      }
    }
  }
});

// Build each entry point
const entries = [
  { entry: 'src/views/content/content.ts', output: 'content.js' },
  { entry: 'src/views/popup/popup.ts', output: 'popup.js' },
  { entry: 'src/background/background.ts', output: 'background.js' }
];

console.log('Building Chrome extension...');

for (const { entry, output } of entries) {
  console.log(`Building ${entry} -> ${output}...`);
  await build(createConfig(entry, output));
  console.log(`✓ Built ${output}`);
}

// Copy assets
console.log('Copying assets...');

// Copy popup.html
const srcHtml = resolve(process.cwd(), 'src/views/popup/popup.html');
const destHtml = resolve(distDir, 'popup.html');
if (existsSync(srcHtml)) {
  copyFileSync(srcHtml, destHtml);
  console.log('✓ Copied popup.html');
}

// Copy assets folder
const assetsSrc = resolve(process.cwd(), 'assets');
const assetsDest = resolve(distDir, 'assets');
if (existsSync(assetsSrc)) {
  mkdirSync(assetsDest, { recursive: true });
  cpSync(assetsSrc, assetsDest, { recursive: true });
  console.log('✓ Copied assets folder');
}

// Copy and update manifest.json
const srcManifest = resolve(process.cwd(), 'manifest.json');
const destManifest = resolve(distDir, 'manifest.json');
if (existsSync(srcManifest)) {
  const manifestContent = readFileSync(srcManifest, 'utf-8');
  const manifest = JSON.parse(manifestContent);

  manifest.action.default_popup = 'popup.html';
  manifest.content_scripts[0].js = ['content.js'];
  manifest.background.service_worker = 'background.js';

  writeFileSync(destManifest, JSON.stringify(manifest, null, 2));
  console.log('✓ Copied and updated manifest.json');
}

console.log('\n✅ Build complete!');
