import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface HeaderLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const colors = useColors();
  const markSize = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;
  const markFontSize = size === 'sm' ? 17 : size === 'lg' ? 28 : 21;
  const wordFontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mark,
          {
            width: markSize,
            height: markSize,
            backgroundColor: colors.navy,
            borderRadius: Math.round(markSize * 0.26),
          },
        ]}
      >
        <Text style={[styles.markText, { fontSize: markFontSize }]}>
          P<Text style={{ color: colors.primary, fontSize: markFontSize * 0.55 }}>³</Text>
        </Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#FAFAFA',
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
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
