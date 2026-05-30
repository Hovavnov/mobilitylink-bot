require('dotenv').config();
const express = require('express');
const { handleIncoming } = require('./bot');

const app = express();
app.use(express.json());

// ── בדיקת חיות ──
app.get('/', (req, res) => {
  res.json({ status: '✅ MobilityLink Bot is running', time: new Date().toISOString() });
});

// ── אימות Webhook (Meta דורש זאת) ──
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta');
    res.status(200).send(challenge);
  } else {
    console.warn('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// ── קבלת הודעות נכנסות ──
app.post('/webhook', async (req, res) => {
  // עונים ל-Meta מיד (חייב תוך 5 שניות)
  res.sendStatus(200);

  try {
    const body  = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    const msg  = messages[0];
    const from = msg.from;
    const text = msg.type === 'text' ? msg.text?.body?.trim() : null;

    if (!text) return;

    await handleIncoming(from, text);
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MobilityLink Bot running on port ${PORT}`);
  console.log(`📱 Owner: ${process.env.OWNER_PHONE}`);
  console.log(`🔗 Webhook: POST /webhook`);
});
