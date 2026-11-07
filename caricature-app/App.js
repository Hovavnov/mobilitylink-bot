import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

import CaptionedImage from './src/CaptionedImage';
import { THEMES, GENERIC_CAPTIONS, getTheme, shuffle } from './src/themes';
import { generateCaricatures } from './src/api';
import { APP_NAME } from './src/config';

const COLORS = {
  bg1: '#2b1055',
  bg2: '#d53369',
  card: 'rgba(255,255,255,0.12)',
  accent: '#ffcc00',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.75)',
};

const LOADING_LINES = [
  'מחדדים את העפרונות…',
  'מגדילים את האף בעוד 300%…',
  'מוסיפים פרטים קטנים ומצחיקים…',
  'הצייר שלנו צוחק בעצמו…',
  'מלטשים כל שערה…',
  'כמעט מוכן, שווה לחכות!',
];

// מצבי כותרת: ללא, אותה כותרת לכל התמונות, כותרת אקראית שונה לכל תמונה
const CAPTION_MODES = [
  { id: 'none', label: 'בלי כותרת' },
  { id: 'same', label: 'כותרת אחת לכולן' },
  { id: 'random', label: 'כותרת אקראית לכל תמונה' },
];

export default function App() {
  const [step, setStep] = useState('home'); // home | theme | caption | loading | results
  const [photo, setPhoto] = useState(null); // { uri, base64, mimeType }
  const [themeId, setThemeId] = useState('random');
  const [captionMode, setCaptionMode] = useState('random');
  const [caption, setCaption] = useState('');
  const [captionPos, setCaptionPos] = useState('bottom');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]); // [{ id, uri, base64, caption }]
  const [loadingLine, setLoadingLine] = useState(LOADING_LINES[0]);
  const [viewer, setViewer] = useState(null); // index
  const [busy, setBusy] = useState(false);
  const exportRefs = useRef({});
  // הצעות כותרת קבועות לכל פתיחה של תמונה (לא מתערבבות בכל הקלדה)
  const viewerSuggestions = useMemo(() => shuffle(suggestions).slice(0, 4), [viewer, suggestions]);

  // ---------- שלב 1: בחירת תמונה ----------
  async function pickPhoto(fromCamera) {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('נדרשת הרשאה', fromCamera ? 'אפשרו גישה למצלמה בהגדרות.' : 'אפשרו גישה לתמונות בהגדרות.');
        return;
      }
      const opts = { mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.85, base64: true };
      const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      if (!a.base64) {
        Alert.alert('שגיאה', 'לא הצלחנו לקרוא את התמונה. נסו תמונה אחרת.');
        return;
      }
      setPhoto({ uri: a.uri, base64: a.base64, mimeType: a.mimeType || 'image/jpeg' });
      setStep('theme');
    } catch (e) {
      Alert.alert('שגיאה', e.message);
    }
  }

  // ---------- שלב 2: בחירת נושא ----------
  function chooseTheme(id) {
    setThemeId(id);
    const t = getTheme(id);
    const list = shuffle([...t.captions, ...shuffle(GENERIC_CAPTIONS).slice(0, 2)]);
    setSuggestions(list);
    setCaption(list[0]);
    setStep('caption');
  }

  function captionsFor(n) {
    if (captionMode === 'none') return Array(n).fill('');
    if (captionMode === 'same') return Array(n).fill(caption.trim());
    const pool = shuffle(suggestions.length ? suggestions : GENERIC_CAPTIONS);
    return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
  }

  // ---------- שלב 3: יצירה ----------
  async function generate() {
    setStep('loading');
    let i = 0;
    setLoadingLine(LOADING_LINES[0]);
    const timer = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      setLoadingLine(LOADING_LINES[i]);
    }, 3500);
    try {
      const data = await generateCaricatures({ base64: photo.base64, mimeType: photo.mimeType, themeId, count: 4 });
      const caps = captionsFor(data.images.length);
      setResults(
        data.images.map((img, idx) => ({
          id: img.id,
          base64: img.base64,
          uri: `data:image/png;base64,${img.base64}`,
          caption: caps[idx],
        }))
      );
      setStep('results');
    } catch (e) {
      Alert.alert('אופס', e.message);
      setStep('caption');
    } finally {
      clearInterval(timer);
    }
  }

  // ---------- שמירה ושיתוף ----------
  async function exportFile(index) {
    const item = results[index];
    if (item.caption) {
      // מצלמים את התמונה יחד עם הכותרת מתוך העותק הנסתר ברזולוציה מלאה
      return captureRef(exportRefs.current[item.id], {
        format: 'jpg',
        quality: 0.95,
        result: 'tmpfile',
        width: 1024,
        height: 1536,
      });
    }
    const file = new File(Paths.cache, `eitan-${item.id}.png`);
    await file.write(item.base64, { encoding: 'base64' });
    return file.uri;
  }

  async function saveImages(indices) {
    setBusy(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) {
        Alert.alert('נדרשת הרשאה', 'אפשרו שמירה לגלריה בהגדרות.');
        return;
      }
      for (const idx of indices) {
        const uri = await exportFile(idx);
        await MediaLibrary.Asset.create(uri);
      }
      Alert.alert('נשמר! 🎉', indices.length > 1 ? 'כל התמונות נשמרו בגלריה.' : 'התמונה נשמרה בגלריה.');
    } catch (e) {
      Alert.alert('שגיאה בשמירה', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function shareImage(index) {
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('שיתוף לא זמין במכשיר הזה');
        return;
      }
      const uri = await exportFile(index);
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: APP_NAME });
    } catch (e) {
      Alert.alert('שגיאה בשיתוף', e.message);
    } finally {
      setBusy(false);
    }
  }

  function updateCaption(index, text) {
    setResults((r) => r.map((it, i) => (i === index ? { ...it, caption: text } : it)));
  }

  function startOver() {
    setPhoto(null);
    setResults([]);
    setViewer(null);
    setStep('home');
  }

  // ---------- תצוגה ----------
  return (
    <LinearGradient colors={[COLORS.bg1, COLORS.bg2]} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.appName}>{APP_NAME}</Text>

          {step === 'home' && (
            <View style={styles.center}>
              <Text style={styles.bigEmoji}>🎨🚽😂</Text>
              <Text style={styles.h1}>הופכים כל תמונה ל-4 קריקטורות מטורפות</Text>
              <Text style={styles.p}>בוחרים תמונה, בוחרים נושא, מוסיפים כותרת – והצייר שלנו עושה את השאר.</Text>
              <Btn label="📷 בחירה מהגלריה" onPress={() => pickPhoto(false)} primary />
              <Btn label="🤳 צילום עכשיו" onPress={() => pickPhoto(true)} />
              <Text style={styles.note}>
                התמונה נשלחת לשירות בינה מלאכותית לצורך היצירה בלבד ואינה נשמרת אצלנו. השתמשו רק בתמונות של אנשים
                שהסכימו לכך.
              </Text>
            </View>
          )}

          {step === 'theme' && (
            <View>
              <View style={styles.rowRev}>
                <Image source={{ uri: photo?.uri }} style={styles.thumb} />
                <View style={styles.flex}>
                  <Text style={styles.h2}>איזה נושא בא לכם?</Text>
                  <Text style={styles.p}>בכל יצירה – 4 תמונות שונות באקראי</Text>
                </View>
              </View>
              <View style={styles.grid}>
                {THEMES.map((t) => (
                  <Pressable key={t.id} style={styles.themeCard} onPress={() => chooseTheme(t.id)}>
                    <Text style={styles.themeEmoji}>{t.emoji}</Text>
                    <Text style={styles.themeTitle}>{t.title}</Text>
                    <Text style={styles.themeSub}>{t.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
              <Btn label="↩︎ החלפת תמונה" onPress={() => setStep('home')} />
            </View>
          )}

          {step === 'caption' && (
            <View>
              <Text style={styles.h2}>
                {getTheme(themeId).emoji} {getTheme(themeId).title} – להוסיף כותרת?
              </Text>
              <View style={styles.segment}>
                {CAPTION_MODES.map((m) => (
                  <Chip key={m.id} label={m.label} active={captionMode === m.id} onPress={() => setCaptionMode(m.id)} />
                ))}
              </View>

              {captionMode === 'same' && (
                <TextInput
                  style={styles.input}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder="כתבו כותרת משלכם…"
                  placeholderTextColor="#999"
                  maxLength={80}
                  textAlign="right"
                />
              )}

              {captionMode !== 'none' && (
                <>
                  <Text style={styles.label}>
                    {captionMode === 'same' ? 'הצעות (לחצו לבחירה):' : 'הכותרות יוגרלו מתוך:'}
                  </Text>
                  <View style={styles.chips}>
                    {suggestions.map((s) => (
                      <Chip
                        key={s}
                        label={s}
                        active={captionMode === 'same' && caption === s}
                        onPress={() => {
                          setCaption(s);
                          setCaptionMode('same');
                        }}
                      />
                    ))}
                  </View>
                  <Text style={styles.label}>מיקום הכותרת:</Text>
                  <View style={styles.segment}>
                    <Chip label="⬆️ למעלה" active={captionPos === 'top'} onPress={() => setCaptionPos('top')} />
                    <Chip label="⬇️ למטה" active={captionPos === 'bottom'} onPress={() => setCaptionPos('bottom')} />
                  </View>
                </>
              )}

              <Btn label="✨ צרו לי 4 קריקטורות!" onPress={generate} primary />
              <Btn label="↩︎ חזרה לנושאים" onPress={() => setStep('theme')} />
            </View>
          )}

          {step === 'loading' && (
            <View style={styles.center}>
              <Image source={{ uri: photo?.uri }} style={styles.loadingThumb} />
              <ActivityIndicator size="large" color={COLORS.accent} style={{ marginVertical: 20 }} />
              <Text style={styles.h2}>{loadingLine}</Text>
              <Text style={styles.p}>יצירה באיכות גבוהה לוקחת בערך דקה. שווה לחכות!</Text>
            </View>
          )}

          {step === 'results' && (
            <View>
              <Text style={styles.h2}>הנה היצירות שלכם 😂</Text>
              <Text style={styles.p}>לחצו על תמונה כדי להגדיל, לערוך כותרת, לשמור או לשתף</Text>
              <View style={styles.grid}>
                {results.map((r, idx) => (
                  <Pressable key={r.id} style={styles.resultCell} onPress={() => setViewer(idx)}>
                    <CaptionedImage uri={r.uri} caption={r.caption} position={captionPos} style={styles.rounded} />
                  </Pressable>
                ))}
              </View>
              <Btn label="💾 שמירת כל ה-4 בגלריה" onPress={() => saveImages(results.map((_, i) => i))} primary />
              <Btn label="🎲 עוד סיבוב באותו נושא" onPress={generate} />
              <Btn label="🎭 נושא אחר" onPress={() => setStep('theme')} />
              <Btn label="🖼️ תמונה חדשה" onPress={startOver} />
            </View>
          )}
        </ScrollView>

        {/* עותקים נסתרים ברזולוציה מלאה לצורך שמירה עם כותרת */}
        <View style={styles.offscreen} pointerEvents="none">
          {results.map((r) => (
            <CaptionedImage
              key={r.id}
              ref={(el) => (exportRefs.current[r.id] = el)}
              uri={r.uri}
              caption={r.caption}
              position={captionPos}
              size="large"
              style={styles.exportSize}
            />
          ))}
        </View>

        <Modal visible={viewer !== null} animationType="slide" onRequestClose={() => setViewer(null)}>
          {viewer !== null && results[viewer] && (
            <LinearGradient colors={[COLORS.bg1, COLORS.bg2]} style={styles.flex}>
              <SafeAreaView style={styles.flex}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                  <CaptionedImage
                    uri={results[viewer].uri}
                    caption={results[viewer].caption}
                    position={captionPos}
                    size="large"
                    style={styles.rounded}
                  />
                  <Text style={styles.label}>כותרת:</Text>
                  <TextInput
                    style={styles.input}
                    value={results[viewer].caption}
                    onChangeText={(t) => updateCaption(viewer, t)}
                    placeholder="בלי כותרת"
                    placeholderTextColor="#999"
                    maxLength={80}
                    textAlign="right"
                  />
                  <View style={styles.chips}>
                    {viewerSuggestions.map((s) => (
                      <Chip key={s} label={s} onPress={() => updateCaption(viewer, s)} />
                    ))}
                  </View>
                  <Btn label="💾 שמירה בגלריה" onPress={() => saveImages([viewer])} primary disabled={busy} />
                  <Btn label="📤 שיתוף (וואטסאפ, אינסטגרם…)" onPress={() => shareImage(viewer)} disabled={busy} />
                  <Btn label="✖️ סגירה" onPress={() => setViewer(null)} />
                </ScrollView>
              </SafeAreaView>
            </LinearGradient>
          )}
        </Modal>

        {busy && (
          <View style={styles.busy}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function Btn({ label, onPress, primary, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, primary && styles.btnPrimary, (pressed || disabled) && { opacity: 0.7 }]}
    >
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const rtl = { textAlign: 'right', writingDirection: 'rtl' };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 48 },
  center: { alignItems: 'center' },
  appName: { color: COLORS.accent, fontSize: 20, fontWeight: '900', textAlign: 'center', marginVertical: 12 },
  bigEmoji: { fontSize: 64, marginVertical: 16 },
  h1: { color: COLORS.text, fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  h2: { color: COLORS.text, fontSize: 21, fontWeight: '800', marginBottom: 6, ...rtl },
  p: { color: COLORS.muted, fontSize: 15, marginBottom: 16, ...rtl },
  note: { color: COLORS.muted, fontSize: 12, marginTop: 24, textAlign: 'center', writingDirection: 'rtl' },
  label: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 14, marginBottom: 6, ...rtl },
  rowRev: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 12 },
  thumb: { width: 64, height: 96, borderRadius: 10 },
  loadingThumb: { width: 160, height: 240, borderRadius: 16, marginTop: 24 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  themeCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  themeEmoji: { fontSize: 34 },
  themeTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 4, ...rtl },
  themeSub: { color: COLORS.muted, fontSize: 12, marginTop: 2, ...rtl },
  resultCell: { width: '48.5%', marginBottom: 12 },
  rounded: { borderRadius: 14 },
  segment: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.text, fontSize: 14, writingDirection: 'rtl' },
  chipTextActive: { color: '#222', fontWeight: '800' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginVertical: 8,
    writingDirection: 'rtl',
  },
  btn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: COLORS.accent },
  btnText: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  btnTextPrimary: { color: '#222', fontWeight: '900' },
  offscreen: { position: 'absolute', left: -5000, top: 0 },
  exportSize: { width: 1024 / 3, height: 1536 / 3 },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
