import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

/**
 * תמונה עם כותרת בסגנון "מם" (טקסט לבן עם קו מתאר שחור) למעלה או למטה.
 * עוטפים ב-forwardRef כדי ש-react-native-view-shot יוכל לצלם את התמונה יחד עם הכותרת.
 */
const CaptionedImage = forwardRef(function CaptionedImage(
  { uri, caption, position = 'bottom', size = 'small', style },
  ref
) {
  const big = size === 'large';
  return (
    <View ref={ref} collapsable={false} style={[styles.wrap, style]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      {!!caption && (
        <View style={[styles.captionBox, position === 'top' ? styles.top : styles.bottom]}>
          <Text
            style={[styles.caption, big ? styles.captionLarge : styles.captionSmall]}
            numberOfLines={3}
            adjustsFontSizeToFit
          >
            {caption}
          </Text>
        </View>
      )}
    </View>
  );
});

export default CaptionedImage;

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 2 / 3,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1d1d2b',
  },
  image: { ...StyleSheet.absoluteFillObject },
  captionBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: '6%',
    paddingVertical: '4%',
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
  caption: {
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  captionSmall: { fontSize: 16 },
  captionLarge: { fontSize: 32 },
});
