import { updateState, storageMode } from '../lib/store.mjs';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const action = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!action || JSON.stringify(action).length > 10000) return res.status(400).json({ error: 'Invalid request.' });
    const result = await updateState(action);
    return res.status(200).json({ ...result, storageMode, serverTime: new Date().toISOString() });
  } catch (error) { return res.status(400).json({ error: error.message }); }
}
