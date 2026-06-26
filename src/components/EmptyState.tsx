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
  glyph?: string;
}

export function EmptyState({ title, description, actionLabel, onAction, glyph = '□' }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconBubble}>
          <Text accessibilityLabel="Empty illustration" style={styles.icon}>{glyph}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {actionLabel && onAction ? (
          <View style={styles.action}>
            <Button label={actionLabel} variant="secondary" onPress={onAction} fullWidth={false} />
          </View>
        ) : null}
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
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: dimensions.xs,
  },
  icon: {
    fontSize: 32,
    lineHeight: 36,
    color: colors.textSecondary,
  },
  action: {
    marginTop: dimensions.sm,
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
