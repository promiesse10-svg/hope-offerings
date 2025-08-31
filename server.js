import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { Client, Environment } from 'square';
import validator from 'validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true);
app.use(express.json());

// --- Validate environment variables ---
const requiredEnv = ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID'];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
});

// --- HTTPS enforcement ---
app.use((req, res, next) => {
  const SQUARE_ENV = (process.env.SQUARE_ENV || 'production').toLowerCase();
  if (SQUARE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
});

// --- Static frontend ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Success page route ---
app.get('/payment-success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// --- Square client ---
const SQUARE_ENV = (process.env.SQUARE_ENV || 'production').toLowerCase();
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: SQUARE_ENV === 'sandbox' ? Environment.Sandbox : Environment.Production
});
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;

// --- Utilities ---
function cryptoRandom() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function hostDomain(req) {
  const h = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  return h.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase();
}
// BigInt-safe JSON sender
function sendJSON(res, obj, status = 200) {
  const body = JSON.stringify(obj, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
  res.status(status).type('application/json').send(body);
}

// --- Apple Pay domain registration ---
async function registerAppleDomain(domain) {
  if (!domain) throw new Error('Missing domain');
  try {
    const { result } = await client.applePayApi.registerDomain({ domainName: domain });
    console.log('[applePay] registered:', domain);
    return { ok: true, result: { status: 'registered' } };
  } catch (err) {
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

// Optional auto-register on boot
(async () => {
  if (process.env.REGISTER_APPLE_DOMAIN === 'true' && process.env.APPLE_PAY_DOMAIN) {
    try {
      await registerAppleDomain(process.env.APPLE_PAY_DOMAIN);
    } catch (e) {
      console.error('[applePay] auto-register failed:', e?.message || e);
    }
  }
})();

// Secure endpoint (requires ADMIN_KEY header)
app.post('/api/register-apple-domain', async (req, res) => {
  try {
    if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
      return sendJSON(res, { ok: false, error: 'Unauthorized' }, 401);
    }
    const domain = hostDomain(req);
    if (!domain) return sendJSON(res, { ok: false, error: 'Cannot detect host' }, 400);
    const out = await registerAppleDomain(domain);
    return sendJSON(res, { ok: true, domain, ...out });
  } catch (err) {
    const msg = err?.message || err?.errors?.[0]?.detail || 'Apple Pay register error';
    return sendJSON(res, { ok: false, error: msg }, 500);
  }
});

// --- Create Payment (Card + Wallets + ACH tokens) ---
app.post('/api/pay', async (req, res) => {
  try {
    const {
      sourceId,
      amount, // integer cents
      currency = 'USD',
      locationId, // from client; we’ll prefer env if set
      fund,
      fundLabel,
      buyerName,
      buyerEmail
    } = req.body || {};

    // Input validation
    if (!sourceId) return sendJSON(res, { ok: false, error: 'Missing sourceId' }, 400);
    if (!Number.isInteger(amount) || amount < 100) {
      return sendJSON(res, { ok: false, error: 'Amount must be >= 100 cents ($1.00)' }, 400);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return sendJSON(res, { ok: false, error: 'Invalid currency code' }, 400);
    }
    if (buyerEmail && !validator.isEmail(buyerEmail)) {
      return sendJSON(res, { ok: false, error: 'Invalid email format' }, 400);
    }

    const locId = LOCATION_ID || locationId;
    if (!locId) return sendJSON(res, { ok: false, error: 'Missing locationId' }, 400);

    const idempotencyKey = cryptoRandom();

    const { paymentsApi } = client;
    const { result } = await paymentsApi.createPayment({
      idempotencyKey,
      sourceId,
      locationId: locId,
      amountMoney: { amount: BigInt(amount), currency },
      autocomplete: true,
      note: fundLabel ? `HOLI Gift — ${fundLabel}` : 'HOLI Gift',
      buyerEmailAddress: buyerEmail || undefined,
      referenceId: fund || undefined,
    });

    const p = result.payment;
    if (p?.status === 'COMPLETED') {
      console.log('[payment] success:', { paymentId: p.id, amount, currency, status: p.status });
      return res.redirect(`/payment-success?paymentId=${p.id}&receiptUrl=${encodeURIComponent(p.receiptUrl || '')}`);
    }

    // Return minimal, BigInt-free payload if not redirecting
    return sendJSON(res, {
      ok: true,
      paymentId: p?.id || null,
      status: p?.status || null,
      receiptUrl: p?.receiptUrl || null
    });
  } catch (err) {
    const msg =
      err?.result?.errors?.[0]?.detail ||
      err?.message ||
      'Payment error';
    console.error('[payment] error:', msg);
    return sendJSON(res, { ok: false, error: msg }, 400);
  }
});

// Health
app.get('/healthz', (_req, res) => sendJSON(res, { ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HOLI payments listening on :${PORT} [${SQUARE_ENV}]`));