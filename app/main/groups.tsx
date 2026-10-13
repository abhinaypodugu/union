import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { IconTile, ListCard, ListRow, Notice, Screen, ScreenHeader, SectionLabel, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Groups() {
  const { groups } = useStore();
  return (
    <Screen>
      <ScreenHeader title="Groups" />
      {groups.map((s) => (
        <View key={s.section}>
          <SectionLabel>{s.section}</SectionLabel>
          {s.note ? (
            <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              {s.note}
            </Txt>
          ) : null}
          {s.items.length === 0 ? (
            <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16 }}>None yet.</Txt>
          ) : (
            <ListCard style={{ marginHorizontal: 12 }}>
              {s.items.map((g) => (
                <ListRow
                  key={g.id}
                  title={g.name}
                  subtitle={g.kind}
                  left={<IconTile icon={g.icon} tone={g.tone} />}
                  onPress={() => router.push({ pathname: '/group', params: { scope: g.scope, value: g.value ?? '', name: g.name } } as never)}
                />
              ))}
            </ListCard>
          )}
        </View>
      ))}
      <View style={{ padding: 12, paddingTop: 18 }}>
        <Notice tone="private" title="Committee channels are private">
          You see a committee’s channel only while your appointment is active.
        </Notice>
      </View>
    </Screen>
  );
}
