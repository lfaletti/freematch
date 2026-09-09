// FreeMatch local analytics dashboard — server.
//
// Runs ONLY on your machine. It proxies the two calls the dashboard needs
// against the PRODUCTION API (api.freematch.io), so you never expose your
// FreeMatch admin password to a third party and nothing leaves your machine
// except the authenticated requests to api.freematch.io itself.
//
//   UI  ->  localhost server  ->  https://api.freematch.io
//
// It stores nothing to disk: the JWT lives in memory for the server's lifetime
// and is re-fetched on login. There are no secrets in this repo.
//
// Run:  npm start   (then open http://localhost:3090)

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3090;

// Production FreeMatch API. Point this at staging too if you want to inspect a
// different environment (log in there with an account that email is whitelisted for).
const API_BASE = process.env.FREEMATCH_API || 'https://api.freematch.io';

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Login against the production API. Returns a short-lived JWT (24h in prod).
// We keep it in memory only — never written to disk.
// ---------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  try {
    const r = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.token) {
      // Pass through the real error so the UI can show login/verify issues.
      return res.status(r.status || 401).json({ error: data.error || 'Login failed' });
    }
    return res.json({ token: data.token });
  } catch (e) {
    return res.status(502).json({ error: `Could not reach ${API_BASE}: ${e.message}` });
  }
});

// ---------------------------------------------------------------------------
// Fetch the summary from production using the caller-provided token.
// The token is sent in the request body of this local call (same-origin, local
// machine only) so we don't force the browser to hold it in a header we then
// can't read. Never stored.
// ---------------------------------------------------------------------------
app.post('/api/summary', async (req, res) => {
  const { token, days } = req.body ?? {};
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const d = Math.min(365, Math.max(1, parseInt(days) || 7));
  try {
    const r = await fetch(`${API_BASE}/api/analytics/summary?days=${d}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.error || 'Summary failed' });
    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: `Could not reach ${API_BASE}: ${e.message}` });
  }
});

// ---------------------------------------------------------------------------
// Time series: aggregate each tracked event per calendar day over N days.
// Proxies a production endpoint (see backend analytics route series). If the
// deployed API doesn't have /series yet this returns 404 and the UI falls back
// to showing only the aggregate summary.
// ---------------------------------------------------------------------------
app.post('/api/series', async (req, res) => {
  const { token, days } = req.body ?? {};
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  const d = Math.min(365, Math.max(1, parseInt(days) || 7));
  try {
    const r = await fetch(`${API_BASE}/api/analytics/series?days=${d}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 404) {
      return res.status(404).json({ error: 'series endpoint not deployed yet' });
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.error || 'Series failed' });
    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: `Could not reach ${API_BASE}: ${e.message}` });
  }
});

// Static dashboard UI.
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`FreeMatch dashboard local -> http://localhost:${PORT}`);
  console.log(`Backend de datos: ${API_BASE}`);
});
