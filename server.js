// server.js — Express + Square (PRODUCTION) + static frontend
// Adds Apple Pay domain registration (auto + endpoint)

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { Client, Environment } from 'square';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Square client (PRODUCTION) ---
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production
});

// ---- Helpers ----
function cryptoRandom(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8); return v.toString(16);
  });
}

function hostDomain(req){
  // prefer forwarded host (behind proxy), then Host header; strip port
  const h = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  return h.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase();
}

// ---- Apple Pay domain registration ----
async function registerAppleDomain(domain){
  if (!domain) throw new Error('Missing domain');
  try {
    const { result } = await client.applePayApi.registerDomain({ domainName: domain });
    console.log('[applePay] registered:', domain, result);
    return { ok: true, result };
  } catch (err) {
    // If already registered, Square returns a 409 — treat as success-ish
    const code = err?.statusCode || err?.code;
    const msg = err?.message || err?.errors?.[0]?.detail || 'Apple Pay register error';
    if (code === 409 || /already registered/i.test(msg)) {
      console.log('[applePay] already registered:', domain);
      return { ok: true, already: true };
    }
    console.error('[applePay] register failed:', msg);
    throw err;
  }
}

// Optional: auto-register on boot if env flags are set
(async () => {
  if (process.env.REGISTER_APPLE_DOMAIN === 'true') {
    const domain = process.env.APPLE_PAY_DOMAIN;
    if (domain) {
      try {
        await registerAppleDomain(domain);
      } catch (e) {
        console.error('[applePay] auto-register failed for', domain, e?.message || e);
      }
    } else {
      console.warn('[applePay] Skipping auto-register: APPLE_PAY_DOMAIN not set.');
    }
  }
})();

// Secure endpoint to register current host’s domain (once)
// Use an admin key to avoid random hits.
app.post('/api/register-apple-domain', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ ok:false, error:'Unauthorized' });
    }
    const domain = hostDomain(req);
    if (!domain) return res.status(400).json({ ok:false, error:'Cannot detect host' });

    const out = await registerAppleDomain(domain);
    return res.json({ ok:true, domain, ...out });
  } catch (err) {
    const msg = err?.message || err?.errors?.[0]?.detail || 'Apple Pay register error';
    return res.status(500).json({ ok:false, error: msg });
  }
});

// ---- Create Payment (works for Card + all Wallets) ----
app.post('/api/pay', async (req, res) => {
  try {
    const {
      sourceId,               // token from Web Payments SDK (card, apple, google, cash app, afterpay, ach)
      amount,                 // integer cents
      currency = 'USD',
      locationId,             // from frontend meta tag
      fund, fundLabel,
      buyerName, buyerEmail
    } = req.body;

    if (!sourceId || !amount || !locationId) {
      return res.status(400).json({ ok:false, error:'Missing sourceId, amount, or locationId' });
    }

    // (Optional) light logging (no PII)
    console.log('[payment] amount=', amount, 'currency=', currency, 'fund=', fundLabel, 'loc=', locationId);

    const idempotencyKey = cryptoRandom();
    const { result } = await client.paymentsApi.createPayment({
      idempotencyKey,
      sourceId,
      locationId,
      amountMoney: { amount: Number(amount), currency },
      autocomplete: true,
      note: fundLabel ? `HOLI Gift — ${fundLabel}` : 'HOLI Gift',
      buyerEmailAddress: buyerEmail || undefined,
      referenceId: fund || undefined
    });

    return res.json({ ok:true, payment: result.payment });
  } catch (err) {
    const msg = err?.message || err?.errors?.[0]?.detail || 'Payment error';
    console.error('[payment] error:', msg);
    return res.status(500).json({ ok:false, error: msg });
  }
});

// Health
app.get('/healthz', (_req, res) => res.json({ ok:true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HOLI payments listening on :${PORT}`));
