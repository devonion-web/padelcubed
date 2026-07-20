import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface HeaderLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function HeaderLogo({ size = 'md' }: HeaderLogoProps) {
  const colors = useColors();
  const markSize = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;
  const borderRadius = Math.round(markSize * 0.26);
  const wordFontSize = size === 'sm' ? 11 : size === 'lg' ? 15 : 13;

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo-mark.png')}
        style={[styles.mark, { width: markSize, height: markSize, borderRadius }]}
        resizeMode="cover"
      />
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
    flexShrink: 0,
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
