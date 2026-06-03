const Anthropic = require('@anthropic-ai/sdk');
const { sendText, notifyOwner } = require('./whatsapp');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// שמירת היסטוריית שיחות בזיכרון (לפי מספר טלפון)
const conversations = new Map();
const HISTORY_LIMIT = 20; // מקסימום הודעות בהיסטוריה

const QUIZ_URL = 'https://www.mobilitylink.co.il/quiz/xz-droid-v9-final.html';

const SYSTEM_PROMPT = `אתה בוט WhatsApp חכם עבור חברת MobilityLink - יבואן ומשווק של עמידנועים (XZ DROID למבוגרים, XZ DROID KIDS לילדים) וציוד שיקומי מתקדם בישראל.

🎯 משימתך: לממיין פניות ולהפוך לקוחות פוטנציאליים ללידים מוכנים.

📋 קטגוריות ושאלות מיון:
🆕 לקוח חדש / ליד:
- מה הציוד שמחפשים?\n\n1️⃣ XZ DROID — עמידנוע למבוגרים\n2️⃣ XZ DROID KIDS — עמידנוע לילדים\n3️⃣ אחר
- למי העמידנוע?\n\n1️⃣ עבורי\n2️⃣ קרוב משפחה\n3️⃣ אחר
- איך תרצה לרכוש?\n\n1️⃣ פרטי\n2️⃣ משרד הביטחון\n3️⃣ קופת חולים\n4️⃣ תאונת דרכים
- מה שמך המלא? 😊
- מה מספר הטלפון לחזרה? 📱

❓ שאלות מוצר / מחיר:
- שלח שאלון התאמה לעמידנוע (QUIZ_BUTTON)

🔧 שירות / תיקון:
- איזה ציוד צריך שירות?\n\n1️⃣ XZ DROID מבוגרים\n2️⃣ XZ DROID KIDS\n3️⃣ אחר
- מה הבעיה?\n\n1️⃣ לא נדלק\n2️⃣ בעיית סוללה\n3️⃣ בעיית נסיעה\n4️⃣ אחר

🔗 לינקים לשלוח לפי נושא:
עמידנוע למבוגרים → https://www.mobilitylink.co.il/
עמידנוע לילדים → https://mobilitylink.co.il/xz-droid-kids/
שאלון התאמה → ${QUIZ_URL}

✍️ סגנון: ידידותי ואמפתי עם אמוג'י, מתאים לקהל בעלי מוגבלויות

חוקים:
1. תמיד הצג שאלות כאפשרויות ממוספרות (1️⃣ 2️⃣ 3️⃣) — הלקוח עונה רק במספר
2. שאל לא יותר מ-2 שאלות בבת אחת
3. כשהלקוח מבקש שאלון התאמה — שלח: "📋 מלא שאלון התאמה כאן: ${QUIZ_URL}"
4. חובה לאסוף שם ומספר טלפון לפני סיום ליד

כשיש שם + טלפון + מוצר, הוסף בסוף התשובה:
LEAD:{"type":"lead","name":"שם","phone":"טלפון","need":"תיאור","product":"מוצר","priority":"high","links":["url"],"notes":"הערות"}`;

function extractLead(text) {
  const idx = text.indexOf('LEAD:{');
  if (idx === -1) return null;
  const start = idx + 5;
  let depth = 0, end = start;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  try { return JSON.parse(text.slice(start, end)); } catch { return null; }
}

function cleanResponse(text) {
  return text.replace(/\nLEAD:[\s\S]*$/, '').trim();
}

async function handleIncoming(from, text) {
  console.log(`📨 [${from}]: ${text}`);

  // קבל או צור היסטוריה
  if (!conversations.has(from)) {
    conversations.set(from, []);
  }
  const history = conversations.get(from);
  history.push({ role: 'user', content: text });

  // חתוך היסטוריה ארוכה מדי
  if (history.length > HISTORY_LIMIT) {
    history.splice(0, history.length - HISTORY_LIMIT);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: history
    });

    const rawText = response.content[0].text;
    const lead = extractLead(rawText);
    const clean = cleanResponse(rawText);

    // שמור תשובה בהיסטוריה
    history.push({ role: 'assistant', content: rawText });

    // שלח תשובה ללקוח
    await sendText(from, clean);

    // אם יש ליד — שלח לבעלים + הודעת אישור ללקוח
    if (lead) {
      await notifyOwner(lead, from);
      setTimeout(() => sendText(from, '✅ הפנייה נרשמה! נציג יחזור אליך בהקדם 💚'), 1000);
      // נקה היסטוריה אחרי ליד
      conversations.set(from, []);
    }

    console.log(`🤖 Response sent to [${from}]${lead ? ' + LEAD captured' : ''}`);
  } catch (err) {
    console.error('Claude error:', err.message);
    await sendText(from, 'מצטערים, יש תקלה זמנית. אנא נסה שוב 🙏');
  }
}

module.exports = { handleIncoming };
