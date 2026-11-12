import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createSeed } from './seed.mjs';
import { applyAction } from './domain.mjs';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
export const storageMode = url && key ? 'online' : 'local';
const directory = join(process.cwd(), '.data');
const path = join(directory, 'demo.json');
let queue = Promise.resolve();
function headers(extra = {}) { return { apikey: key, 'Content-Type': 'application/json', ...extra }; }
async function database(query = '', options = {}) {
  const response = await fetch(`${url}/rest/v1/caretrack_demo${query}`, { ...options, headers: headers(options.headers), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('The online database is unavailable. Check the Supabase connection and run the supplied schema.');
  const body = await response.text();
  return body ? JSON.parse(body) : [];
}
async function read() {
  if (storageMode === 'online') {
    let rows = await database('?id=eq.1&select=revision,data');
    if (!rows.length) {
      await database('?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify({ id: 1, revision: 0, data: createSeed() }) });
      rows = await database('?id=eq.1&select=revision,data');
    }
    return rows[0];
  }
  if (process.env.VERCEL) throw new Error('Connect Supabase to enable shared records. Set SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel, then redeploy.');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const initial = { revision: 0, data: createSeed() };
    await saveLocal(initial);
    return initial;
  }
}
async function saveLocal(value) {
  await mkdir(directory, { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(value));
  await rename(`${path}.tmp`, path);
}
function serial(task) {
  const pending = queue.then(task, task);
  queue = pending.catch(() => {});
  return pending;
}
export function getState() { return serial(read); }
export function updateState(action) {
  return serial(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await read();
      const data = applyAction(current.data, action);
      const updated = { revision: current.revision + 1, data };
      if (storageMode === 'local') { await saveLocal(updated); return updated; }
      const rows = await database(`?id=eq.1&revision=eq.${current.revision}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(updated) });
      if (rows.length) return rows[0];
    }
    throw new Error('Another user updated the records. Please refresh and retry.');
  });
}
