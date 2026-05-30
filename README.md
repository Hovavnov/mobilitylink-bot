# MobilityLink WhatsApp Bot 🤖

בוט WhatsApp חכם מבוסס Claude AI עבור חברת MobilityLink.

## שלבי התקנה

### שלב 1 — Meta Developers
1. גש ל https://developers.facebook.com
2. צור אפליקציה חדשה → בחר "Business"
3. הוסף מוצר: **WhatsApp**
4. ב-WhatsApp → Getting Started → העתק את:
   - `Phone Number ID`
   - `Temporary Access Token`

### שלב 2 — הוסף את מספר 0559896080
1. ב-WhatsApp Manager → Phone Numbers
2. הוסף מספר → הזן 0559896080
3. אמת בקוד SMS

### שלב 3 — Deploy ל-Railway (חינם)
1. גש ל https://railway.app
2. New Project → Deploy from GitHub
3. העלה את תיקיית הקוד
4. הוסף משתני סביבה (ראה למטה)
5. קבל URL → למשל: https://mobilitylink-bot.railway.app

### שלב 4 — הגדר Webhook ב-Meta
1. ב-WhatsApp → Configuration → Webhook
2. Callback URL: `https://your-app.railway.app/webhook`
3. Verify Token: `mobilitylink_secret_2024`
4. לחץ Verify
5. Subscribe ל: `messages`

## משתני סביבה (.env)

```
WHATSAPP_TOKEN=       # מ-Meta Developers
PHONE_NUMBER_ID=      # מ-Meta Developers
WEBHOOK_VERIFY_TOKEN=mobilitylink_secret_2024
ANTHROPIC_API_KEY=    # מ-console.anthropic.com
OWNER_PHONE=972559896080
PORT=3000
```

## הרצה מקומית

```bash
npm install
cp .env.example .env
# מלא את הערכים ב-.env
npm run dev
```
