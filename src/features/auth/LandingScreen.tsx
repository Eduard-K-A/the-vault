import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BrandMark } from '@/components/BrandMark';
import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function LandingScreen() {
  const navigation = useNavigation<Navigation>();

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <BrandMark compact />
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.title}>The Vault</Text>
          <Text style={styles.body}>Accept payments, track inventory, and grow your team - even offline.</Text>
        </View>
      </View>

      <Card style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.actionStack}>
          <Button label="Get started" onPress={() => navigation.navigate('Signup')} />
          <Button label="I already have an account" variant="secondary" onPress={() => navigation.navigate('Login')} />
        </View>
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
          <Text style={styles.linkPrompt}>Need to recover an account?</Text>
          <Text style={styles.link}>Sign in</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  hero: {
    flex: 1,
    paddingHorizontal: dimensions.screenPaddingH,
    paddingTop: 120,
    paddingBottom: dimensions.xl,
    justifyContent: 'flex-start',
    gap: dimensions.sectionGap,
    overflow: 'hidden',
  },
  heroTop: {
    alignItems: 'center',
  },
  heroContent: {
    gap: dimensions.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.caption,
    color: colors.textMuted,
    maxWidth: 440,
    textAlign: 'center',
  },
  sheet: {
    marginHorizontal: dimensions.screenPaddingH,
    marginBottom: dimensions.screenPaddingV,
    marginTop: -dimensions.xl,
    padding: dimensions.md,
    borderRadius: dimensions.radiusXl,
    gap: dimensions.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: dimensions.sheetHandleWidth,
    height: dimensions.sheetHandleHeight,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.borderStrong,
    marginBottom: dimensions.xs,
  },
  actionStack: {
    gap: dimensions.sm,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  linkPrompt: {
    ...typography.caption,
    color: colors.textMuted,
  },
  link: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
});
