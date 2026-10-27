import React from 'react';
import { View } from 'react-native';
import { colors, radius } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { IconTile } from './layout';
import { Txt } from './Txt';

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View accessibilityRole="summary" style={{ alignItems: 'center', gap: 10, padding: 28, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard }}>
      <IconTile icon={icon} />
      <Txt variant="titleM" align="center">{title}</Txt>
      {description ? <Txt variant="bodyS" color={colors.textSecondary} align="center">{description}</Txt> : null}
      {actionLabel && onAction ? <Button size="sm" variant="secondary" onPress={onAction}>{actionLabel}</Button> : null}
      {secondaryLabel && onSecondary ? <Button size="sm" variant="ghost" onPress={onSecondary}>{secondaryLabel}</Button> : null}
    </View>
  );
}

export function ErrorState({
  title = 'Could not load this',
  description = 'Check your connection and try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 10, padding: 28, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }}>
        <Icon name="cloud-off" size={22} color={colors.accent} />
      </View>
      <Txt variant="titleM" align="center">{title}</Txt>
      <Txt variant="bodyS" color={colors.textSecondary} align="center">{description}</Txt>
      {onRetry ? <Button size="sm" variant="secondary" icon="refresh-cw" onPress={onRetry}>Try again</Button> : null}
    </View>
  );
}
