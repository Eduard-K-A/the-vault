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
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <View style={styles.heroTop}>
          <BrandMark compact />
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.kicker}>Mobile POS</Text>
          <Text style={styles.title}>Manage your business from your pocket</Text>
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
    backgroundColor: colors.primaryDark,
  },
  hero: {
    flex: 1,
    paddingHorizontal: dimensions.screenPaddingH,
    paddingTop: dimensions.xl,
    paddingBottom: dimensions.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroTop: {
    alignItems: 'flex-start',
  },
  heroContent: {
    gap: dimensions.md,
    maxWidth: 520,
  },
  heroGlowOne: {
    position: 'absolute',
    top: '18%',
    left: '30%',
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(75, 65, 225, 0.18)',
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: 32,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  kicker: {
    ...typography.label,
    color: '#C6C4DF',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: '#FFFFFF',
    maxWidth: 520,
  },
  body: {
    ...typography.body,
    color: '#F0F1F3',
    maxWidth: 440,
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
