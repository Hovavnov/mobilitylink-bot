// שרת היצירה של "איתן אברהם יצירות עושים בשירותים".
// מקבל תמונה + נושא מהאפליקציה, ומייצר 4 קריקטורות דרך OpenAI Images API (עריכת תמונה).
// מפתח ה-API נשאר בשרת בלבד ולעולם לא נשלח לטלפון.

require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { buildPrompts, THEME_IDS } = require('./prompts');

const {
  OPENAI_API_KEY,
  IMAGE_MODEL = 'gpt-image-1',
  IMAGE_QUALITY = 'high',
  IMAGE_SIZE = '1024x1536',
  INPUT_FIDELITY = 'high',
  APP_TOKEN = '',
  PORT = 8787,
  RATE_LIMIT_PER_HOUR = '20',
} = process.env;

if (!OPENAI_API_KEY) {
  console.error('חסר OPENAI_API_KEY בקובץ .env');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '25mb' }));

// הגבלת קצב פשוטה לפי IP - מונעת שריפת תקציב
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (list.length >= Number(RATE_LIMIT_PER_HOUR)) {
    return res.status(429).json({ error: 'הגעתם למגבלת היצירות לשעה. נסו שוב מאוחר יותר.' });
  }
  list.push(now);
  hits.set(ip, list);
  next();
}

function auth(req, res, next) {
  if (APP_TOKEN && req.headers['x-app-token'] !== APP_TOKEN) {
    return res.status(401).json({ error: 'אין הרשאה' });
  }
  next();
}

async function generateOne(imageBuffer, mimeType, prompt) {
  const form = new FormData();
  form.append('model', IMAGE_MODEL);
  form.append('prompt', prompt);
  form.append('size', IMAGE_SIZE);
  form.append('quality', IMAGE_QUALITY);
  form.append('n', '1');
  if (INPUT_FIDELITY) form.append('input_fidelity', INPUT_FIDELITY);
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  form.append('image', new Blob([imageBuffer], { type: mimeType }), `photo.${ext}`);

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = data?.error?.code;
    throw err;
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned');
  return b64;
}

app.get('/health', (_req, res) => res.json({ ok: true, model: IMAGE_MODEL }));

app.post('/api/generate', auth, rateLimit, async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', themeId = 'random' } = req.body || {};
  const count = Math.min(Math.max(Number(req.body?.count) || 4, 1), 4);

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'לא התקבלה תמונה' });
  }
  if (!THEME_IDS.includes(themeId)) {
    return res.status(400).json({ error: 'נושא לא מוכר' });
  }
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(mimeType)) {
    return res.status(400).json({ error: 'סוג קובץ לא נתמך. השתמשו ב-JPG או PNG.' });
  }

  const buffer = Buffer.from(imageBase64, 'base64');
  const prompts = buildPrompts(themeId, count);
  const started = Date.now();

  // 4 יצירות במקביל - כל אחת עם תרחיש וסגנון שונים
  const settled = await Promise.allSettled(prompts.map((p) => generateOne(buffer, mimeType, p.prompt)));

  const images = [];
  const errors = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      images.push({ id: crypto.randomUUID(), themeId: prompts[i].themeId, variant: prompts[i].variant, base64: r.value });
    } else {
      errors.push(r.reason);
      console.error(`[generate] image ${i + 1} failed:`, r.reason?.message);
    }
  });

  console.log(`[generate] theme=${themeId} ok=${images.length}/${count} in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  if (!images.length) {
    const blocked = errors.some((e) => e?.code === 'moderation_blocked');
    return res.status(blocked ? 422 : 502).json({
      error: blocked
        ? 'מערכת הבטיחות חסמה את התמונה. נסו תמונה אחרת.'
        : 'היצירה נכשלה. נסו שוב בעוד רגע.',
    });
  }
  res.json({ images });
});

app.listen(PORT, () => console.log(`Caricature server listening on :${PORT} (model ${IMAGE_MODEL})`));
