/**
 * health-check.js
   * סקריפט בדיקת תקינות יומי לבוט MobilityLink
   * מופעל כ-Cron Job ב-Render בכל יום בשעה 08:00
   * בודק: Anthropic API, WhatsApp API, Bot endpoint
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const BOT_URL = process.env.BOT_URL || 'https://mobilitylink-bot-1.onrender.com';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const OWNER_PHONE = process.env.OWNER_PHONE;

let errors = [];
let warnings = [];

// === בדיקה 1: Bot Health Endpoint ===
async function checkBotHealth() {
    return new Promise((resolve) => {
          const url = new URL(BOT_URL);
          const client = url.protocol === 'https:' ? https : http;
    const req = client.get(BOT_URL, { timeout: 10000 }, (res) => {
                  let data = '';
                  res.on('data', (chunk) => data += chunk);
                  res.on('end', () => {
                            if (res.statusCode === 200) {
                              console.log('✅ [1/3] Bot endpoint: תקין (HTTP 200)');
          resolve({ ok: true });
} else {
          const msg = `Bot endpoint החזיר HTTP ${res.statusCode}`;
          console.error('❌ [1/3] Bot endpoint:', msg);
          errors.push(msg);
          resolve({ ok: false, error: msg });
}
});
});
    req.on('error', (err) => {
            const msg = `Bot endpoint לא נגיש: ${err.message}`;
      console.error('❌ [1/3] Bot endpoint:', msg);
      errors.push(msg);
      resolve({ ok: false, error: msg });
      });
    req.on('timeout', () => {
            const msg = 'Bot endpoint timeout (>10 שניות)';
      console.error('❌ [1/3] Bot endpoint:', msg);
      errors.push(msg);
            req.destroy();
      resolve({ ok: false, error: msg });
      });
      });
      }

      // === בדיקה 2: Anthropic API ===
async function checkAnthropicAPI() {
        if (!ANTHROPIC_KEY) {
    const msg = 'ANTHROPIC_API_KEY לא מוגדר!';
            console.error('❌ [2/3] Anthropic API:', msg);
    errors.push(msg);
            return { ok: false, error: msg };
}

  return new Promise((resolve) => {
          const postData = JSON.stringify({
          model: 'claude-sonnet-4-5',
      max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }]
});

          const options = {
      hostname: 'api.anthropic.com',
            path: '/v1/messages',
      method: 'POST',
      headers: {
                'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
                  },
      timeout: 15000
};

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
                console.log('✅ [2/3] Anthropic API: תקין (HTTP 200)');
                  resolve({ ok: true });
} else {
                let parsed = {};
                  try { parsed = JSON.parse(data); } catch {}
          const msg = `Anthropic API שגיאה ${res.statusCode}: ${parsed?.error?.message || data.substring(0, 100)}`;
          console.error('❌ [2/3] Anthropic API:', msg);
                errors.push(msg);
          resolve({ ok: false, error: msg });
}
});
});

    req.on('error', (err) => {
            const msg = `Anthropic API שגיאת חיבור: ${err.message}`;
      console.error('❌ [2/3] Anthropic API:', msg);
      errors.push(msg);
      resolve({ ok: false, error: msg });
});

    req.on('timeout', () => {
      const msg = 'Anthropic API timeout';
      console.error('❌ [2/3] Anthropic API:', msg);
            errors.push(msg);
      req.destroy();
      resolve({ ok: false, error: msg });
});

    req.write(postData);
    req.end();
        });
        }

        // === בדיקה 3: WhatsApp API Token ===
async function checkWhatsAppToken() {
          if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    const msg = 'WHATSAPP_TOKEN או PHONE_NUMBER_ID לא מוגדרים!';
    console.error('❌ [3/3] WhatsApp API:', msg);
    errors.push(msg);
    return { ok: false, error: msg };
}

  return new Promise((resolve) => {
    const options = {
      hostname: 'graph.facebook.com',
      path: `/v19.0/${PHONE_NUMBER_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`
},
      timeout: 10000
};

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ [3/3] WhatsApp Token: תקין (HTTP 200)');
          resolve({ ok: true });
} else {
          let parsed = {};
          try { parsed = JSON.parse(data); } catch {}
          const errorMsg = parsed?.error?.message || 'שגיאה לא ידועה';
          const errorCode = parsed?.error?.code || res.statusCode;
          const msg = `WhatsApp Token שגיאה ${errorCode}: ${errorMsg}`;
          console.error('❌ [3/3] WhatsApp API:', msg);

          // בדיקה אם זה OAuth error (token פג)
          if (errorCode === 190 || errorMsg.includes('OAuth') || errorMsg.includes('token')) {
            const tokenWarning = '⚠️  WhatsApp Access Token פג תוקף! יש לחדש ב-Meta for Developers:\n   https://developers.facebook.com -> WhatsApp -> API Setup -> Generate Token';
            console.warn(tokenWarning);
            warnings.push(tokenWarning);
}

          errors.push(msg);
          resolve({ ok: false, error: msg });
}
});
});

    req.on('error', (err) => {
      const msg = `WhatsApp API שגיאת חיבור: ${err.message}`;
      console.error('❌ [3/3] WhatsApp API:', msg);
      errors.push(msg);
      resolve({ ok: false, error: msg });
});

    req.on('timeout', () => {
      const msg = 'WhatsApp API timeout';
      errors.push(msg);
      req.destroy();
      resolve({ ok: false, error: msg });
});

    req.end();
});
}

// === דוח סיכום ===
function printReport(results) {
  const now = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  console.log('\n' + '='.repeat(50));
  console.log(`📋 דוח בדיקת בוט יומי - ${now}`);
  console.log('='.repeat(50));

  const passed = results.filter(r => r.ok).length;
  const total = results.length;

  if (errors.length === 0) {
    console.log(`\n🟢 הבוט תקין לחלוטין! (${passed}/${total} בדיקות עברו)`);
} else {
    console.log(`\n🔴 נמצאו ${errors.length} בעיות (${passed}/${total} בדיקות עברו):`);
    errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
}

  if (warnings.length > 0) {
    console.log('\n⚠️  אזהרות:');
    warnings.forEach(w => console.log(`   ${w}`));
}

  console.log('\n' + '='.repeat(50) + '\n');

  // יציאה עם קוד שגיאה אם יש בעיות
  process.exit(errors.length > 0 ? 1 : 0);
}

// === הרצה ראשית ===
async function main() {
  console.log('🔍 מתחיל בדיקת תקינות יומית של MobilityLink Bot...\n');

  const results = await Promise.all([
    checkBotHealth(),
    checkAnthropicAPI(),
    checkWhatsAppToken()
  ]);

  printReport(results);
  }

main().catch((err) => {
  console.error('שגיאה קריטית בסקריפט הבדיקה:', err);
  process.exit(1);
});
