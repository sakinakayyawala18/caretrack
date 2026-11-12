import http from 'node:http';
import { createServer as createViteServer, preview } from 'vite';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const { default: stateHandler } = await import('../api/state.mjs');
const { default: actionsHandler } = await import('../api/actions.mjs');
const production = process.argv.includes('--production');
const vite = production ? await preview({ preview: { port: 4174 } }) : await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
  if (req.url === '/api/state' || req.url === '/api/actions') {
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 10000) { res.status(413).json({ error: 'Request too large.' }); return; } }
      req.body = body ? JSON.parse(body) : null;
      await (req.url === '/api/state' ? stateHandler : actionsHandler)(req, res);
    } catch { res.status(400).json({ error: 'Invalid JSON request.' }); }
    return;
  }
  vite.middlewares(req, res);
});
server.listen(3000, '127.0.0.1', () => console.log('CareTrack ready at http://127.0.0.1:3000'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { server.close(); await vite.close?.(); vite.httpServer?.close(); process.exit(); });
