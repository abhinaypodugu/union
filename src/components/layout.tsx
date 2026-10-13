import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, ScrollViewProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette } from '../theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

/** Scrollable screen on paper-50 with safe-area top padding. */
export function Screen({ children, header, stickyHeaderIndices, refreshing, onRefresh, avoidKeyboard = true, ...rest }: ScrollViewProps & { header?: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; avoidKeyboard?: boolean }) {
  const insets = useSafeAreaInsets();
  const scroll = (
    <ScrollView
      {...rest}
      stickyHeaderIndices={stickyHeaderIndices}
      keyboardShouldPersistTaps="handled"
      // Keyboard must never cover the focused field (PRD §14.4): standard iOS/Android stack.
      keyboardDismissMode={avoidKeyboard ? 'interactive' : rest.keyboardDismissMode}
      automaticallyAdjustKeyboardInsets={avoidKeyboard ? true : rest.automaticallyAdjustKeyboardInsets}
      contentContainerStyle={[{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 24 }, rest.contentContainerStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} /> : undefined}
    >
      {header}
      {children}
    </ScrollView>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgApp }}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          style={{ flex: 1 }}
        >
          {scroll}
        </KeyboardAvoidingView>
      ) : scroll}
    </View>
  );
}

export function ScreenHeader({ title, overline, right }: { title: string; overline?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: colors.bgApp }}>
      <View style={{ flex: 1 }}>
        {overline ? <Txt variant="overline" color={colors.textMuted} style={{ marginBottom: 6 }} numberOfLines={1}>{overline}</Txt> : null}
        <Txt variant="displayM" numberOfLines={1}>{title}</Txt>
      </View>
      {right ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>{right}</View> : null}
    </View>
  );
}

/** Back-button header for pushed screens. */
export function StackHeader({ title, mono, onBack, right }: { title?: string; mono?: boolean; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 4, minHeight: 48 }}>
      <IconButton icon="chevron-left" label="Back" size="lg" onPress={onBack} />
      <Txt variant={mono ? 'mono' : 'titleM'} color={mono ? colors.textSecondary : colors.textPrimary} align="center" style={{ flex: 1 }} numberOfLines={1}>{title || ''}</Txt>
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
      <Txt variant="overline" color={colors.textMuted} style={{ flex: 1 }}>{children}</Txt>
      {right}
    </View>
  );
}

/** Tappable list row for ListCard. */
export function ListRow({ title, subtitle, left, right, chevron = true, onPress }: { title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode; chevron?: boolean; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
      {left}
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant="titleS" numberOfLines={1}>{title}</Txt>
        {subtitle ? <Txt variant="bodyS" color={colors.textMuted} numberOfLines={2}>{subtitle}</Txt> : null}
      </View>
      {right}
      {chevron && onPress ? <Icon name="chevron-right" size={18} color={palette.ink400} /> : null}
    </Pressable>
  );
}

/** Square icon tile used in group / org rows. */
export function IconTile({ icon, size = 36, tone = 'geo' }: { icon: string; size?: number; tone?: 'geo' | 'group' | 'committee' }) {
  const t = tone === 'committee' ? { bg: palette.blue50, fg: colors.accent, bd: 'transparent' } : tone === 'group' ? { bg: palette.paper0, fg: palette.ink700, bd: colors.borderDefault } : { bg: palette.paper150, fg: palette.ink700, bd: 'transparent' };
  return <View style={{ width: size, height: size, borderRadius: size / 4, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, borderWidth: 1, borderColor: t.bd }}><Icon name={icon} size={size / 2} color={t.fg} /></View>;
}

/** Key/value row for detail cards. */
export function KeyValue({ k, v, first }: { k: string; v: React.ReactNode; first?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.borderSubtle }}>
      <Txt variant="body" color={colors.textSecondary} style={{ flex: 1 }}>{k}</Txt>
      {typeof v === 'string' ? <Txt variant="bodyStrong" align="right" style={{ flexShrink: 1 }}>{v}</Txt> : v}
    </View>
  );
}
