import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

interface HeaderLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const colors = useColors();
  const markSize = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;
  const borderRadius = Math.round(markSize * 0.22);
  const pFontSize = size === 'sm' ? 20 : size === 'lg' ? 31 : 25;
  const supFontSize = Math.round(pFontSize * 0.47);
  const wordFontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  return (
    <View style={styles.container}>
      {/* Mark */}
      <LinearGradient
        colors={['#1a3050', '#0b1825']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            borderRadius,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.38,
            shadowRadius: 4,
            elevation: 5,
          },
        ]}
      >
        {/* P — positioned slightly left so superscript fits */}
        <Text
          style={[
            styles.pLetter,
            { fontSize: pFontSize, bottom: markSize * 0.08, left: markSize * 0.15 },
          ]}
        >
          P
        </Text>
        {/* Superscript 3 */}
        <Text
          style={[
            styles.sup,
            {
              fontSize: supFontSize,
              color: colors.primary,
              top: markSize * 0.12,
              right: markSize * 0.12,
            },
          ]}
        >
          3
        </Text>
      </LinearGradient>

      {/* Wordmark */}
      <View style={styles.words}>
        <Text style={[styles.wordLine, { fontSize: wordFontSize, color: colors.foreground }]}>
          <Text style={{ color: colors.primary }}>People</Text>
          {', Padel,'}
        </Text>
        <Text style={[styles.wordLine, { fontSize: wordFontSize, color: colors.foreground }]}>
          <Text style={{ color: colors.primary }}>Places</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    position: 'relative',
    overflow: 'hidden',
  },
  pLetter: {
    position: 'absolute',
    color: '#F4F7FB',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1.5,
    lineHeight: undefined,
  },
  sup: {
    position: 'absolute',
    fontFamily: 'Inter_700Bold',
  },
  words: {
    flexDirection: 'column',
  },
  wordLine: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
    lineHeight: 16,
  },
});
