import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

interface HeaderLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const colors = useColors();

  // Dimensions scale with requested size
  const markSize    = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;
  const borderRadius = Math.round(markSize * 0.28);
  const pSize       = Math.round(markSize * 0.60);   // P fills ~60 % of the square
  const supSize     = Math.round(pSize  * 0.46);     // 3 is ~46 % of P
  const wordSize    = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  return (
    <View style={styles.container}>
      {/* ── Mark ── */}
      <LinearGradient
        colors={['#1a3050', '#0b1825']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, { width: markSize, height: markSize, borderRadius }]}
      >
        {/*
         * Layout: P sits in the bottom-left, 3 in the top-right.
         * Using a row with alignItems:'flex-end' keeps P pinned to the
         * baseline and 3 floated to the top via alignSelf:'flex-start'.
         * No absolute positioning → works identically on web + native.
         */}
        <View style={styles.glyphRow}>
          <Text
            style={[styles.glyphP, { fontSize: pSize, lineHeight: pSize * 1.05 }]}
            allowFontScaling={false}
          >
            P
          </Text>
          <Text
            style={[
              styles.glyphSup,
              {
                fontSize: supSize,
                lineHeight: supSize * 1.1,
                color: colors.primary,
              },
            ]}
            allowFontScaling={false}
          >
            3
          </Text>
        </View>
      </LinearGradient>

      {/* ── Wordmark ── */}
      <View style={styles.words}>
        <Text
          style={[styles.wordLine, { fontSize: wordSize, color: colors.foreground }]}
          allowFontScaling={false}
        >
          <Text style={{ color: colors.primary }}>People</Text>
          {', Padel,'}
        </Text>
        <Text
          style={[styles.wordLine, { fontSize: wordSize, color: colors.foreground }]}
          allowFontScaling={false}
        >
          <Text style={{ color: colors.primary }}>Places</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems:   'center',
    gap: 10,
  },
  mark: {
    alignItems:     'center',
    justifyContent: 'center',
    // shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.40,
    shadowRadius:  5,
    elevation:     6,
  },
  // Row containing P (bottom-aligned) + 3 (top-aligned)
  glyphRow: {
    flexDirection: 'row',
    alignItems:   'flex-end',   // P sits at the baseline
    paddingLeft:   2,
    paddingBottom: 2,
  },
  glyphP: {
    color:        '#F4F7FB',
    fontFamily:   'Inter_700Bold',
    letterSpacing: -1,
  },
  glyphSup: {
    fontFamily:    'Inter_700Bold',
    alignSelf:     'flex-start',  // floats 3 to the top of the row
    letterSpacing: 0,
    marginBottom:  1,             // nudge up slightly from the P baseline
  },
  words: {
    flexDirection: 'column',
  },
  wordLine: {
    fontFamily:    'Inter_700Bold',
    letterSpacing: -0.3,
    lineHeight:    17,
  },
});
