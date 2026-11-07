import Constants from 'expo-constants';

// כתובת השרת שמייצר את התמונות. מוגדרת ב-app.json תחת expo.extra.apiUrl
// או במשתנה הסביבה EXPO_PUBLIC_API_URL (עדיפות למשתנה הסביבה).
const extra = Constants.expoConfig?.extra || {};

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || 'http://localhost:8787').replace(/\/$/, '');

// מפתח גישה פשוט לשרת (לא מפתח ה-AI!). מונע שימוש של זרים בשרת שלך.
export const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN || extra.appToken || '';

export const APP_NAME = 'איתן אברהם יצירות עושים בשירותים';
