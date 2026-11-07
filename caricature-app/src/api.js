import { API_URL, APP_TOKEN } from './config';

/**
 * שולח את התמונה לשרת ומקבל 4 קריקטורות.
 * @param {{ base64: string, mimeType: string, themeId: string, count?: number }} params
 * @returns {Promise<{ images: { id: string, themeId: string, variant: string, base64: string }[] }>}
 */
export async function generateCaricatures({ base64, mimeType, themeId, count = 4 }) {
  const controller = new AbortController();
  // יצירה באיכות גבוהה לוקחת זמן - עד 4 דקות.
  const timer = setTimeout(() => controller.abort(), 240000);
  try {
    const res = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}),
      },
      body: JSON.stringify({ imageBase64: base64, mimeType, themeId, count }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `שגיאת שרת (${res.status})`);
    }
    if (!data.images?.length) {
      throw new Error('לא התקבלו תמונות מהשרת');
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('היצירה לקחה יותר מדי זמן. נסו שוב.');
    if (e.message === 'Network request failed') throw new Error('אין חיבור לשרת. בדקו את החיבור לאינטרנט.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
