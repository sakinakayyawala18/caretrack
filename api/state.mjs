import { getState, storageMode } from '../lib/store.mjs';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try { const result = await getState(); return res.status(200).json({ ...result, storageMode, serverTime: new Date().toISOString() }); }
  catch (error) { return res.status(503).json({ error: error.message }); }
}
