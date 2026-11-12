import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const result = await build({ stdin: { contents: `
import { createSeed } from './lib/seed.mjs';
import { applyAction } from './lib/domain.mjs';
let data = createSeed();
let revision = 0;
const realFetch = window.fetch.bind(window);
window.fetch = async (url, options = {}) => {
  if (url !== '/api/state' && url !== '/api/actions') return realFetch(url, options);
  try {
    if (url === '/api/actions') { data = applyAction(structuredClone(data), JSON.parse(options.body)); revision++; }
    return new Response(JSON.stringify({ data, revision, storageMode: 'review', serverTime: new Date().toISOString() }), { status: 200 });
  } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 400 }); }
};
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App.jsx';
createRoot(document.getElementById('root')).render(React.createElement(App));
`, resolveDir: process.cwd(), loader: 'jsx' }, bundle: true, write: false, minify: true, define: { 'process.env.NODE_ENV': '"production"' }, format: 'iife' });
const css = (await readFile('src/styles.css', 'utf8')).replace(/^@import[^;]+;\n/, '');
const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
await mkdir('../outputs', { recursive: true });
await writeFile('../outputs/CareTrack_Preview.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CareTrack — Offline Review</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log('Created ../outputs/CareTrack_Preview.html');
