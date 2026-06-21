import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <Text accessibilityLabel="Empty illustration" style={styles.icon}>□</Text>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: dimensions.xl,
  },
  content: {
    alignItems: 'center',
    gap: dimensions.sm,
  },
  icon: {
    fontSize: 48,
    lineHeight: 52,
    color: colors.textSecondary,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
