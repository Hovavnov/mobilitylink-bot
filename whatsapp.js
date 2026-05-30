const axios = require('axios');

const PHONE_ID = process.env.PHONE_NUMBER_ID;
const TOKEN    = process.env.WHATSAPP_TOKEN;
const OWNER    = process.env.OWNER_PHONE; // 972559896080

async function sendText(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text, preview_url: true }
      },
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sendText error:', err.response?.data || err.message);
  }
}

function buildLeadMessage(lead, from) {
  const time = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  return `🔔 *ליד חדש - MobilityLink*
━━━━━━━━━━━━━━━━━
👤 שם: ${lead.name || 'לא צוין'}
📱 טלפון: ${lead.phone || from}
📦 מוצר: ${lead.product || 'לא צוין'}
📝 צורך: ${lead.need || '—'}
⚡ עדיפות: ${lead.priority === 'high' ? 'גבוהה 🔴' : lead.priority === 'medium' ? 'בינונית 🟡' : 'נמוכה 🟢'}${lead.notes ? '\n💬 ' + lead.notes : ''}
🕐 ${time}${lead.links?.length ? '\n🔗 ' + lead.links.join('\n🔗 ') : ''}`;
}

async function notifyOwner(lead, from) {
  if (!OWNER) return;
  const msg = buildLeadMessage(lead, from);
  await sendText(OWNER, msg);
  console.log(`✅ Lead sent to owner for: ${from}`);
}

module.exports = { sendText, notifyOwner };
