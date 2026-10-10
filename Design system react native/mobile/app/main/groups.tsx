import React from 'react';
import { View } from 'react-native';
import { Count, IconButton, IconTile, ListCard, ListRow, Notice, Screen, ScreenHeader, SectionLabel, Txt } from '../../src/components';
import { colors } from '../../src/theme';
import { GROUPS } from '../../src/data/mock';

export default function Groups() {
  return (
    <Screen>
      <ScreenHeader title="Groups" right={<IconButton icon="search" label="Search groups" size="lg" />} />
      {GROUPS.map((s) => (
        <View key={s.section}>
          <SectionLabel>{s.section}</SectionLabel>
          {s.note ? <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>{s.note}</Txt> : null}
          <ListCard style={{ marginHorizontal: 12 }}>
            {s.items.map((g) => (
              <ListRow key={g.id} title={g.name} subtitle={g.kind} left={<IconTile icon={g.icon} tone={g.tone} />} right={'unread' in g && g.unread ? <Count>{g.unread}</Count> : null} onPress={() => {}} />
            ))}
          </ListCard>
        </View>
      ))}
      <View style={{ padding: 12, paddingTop: 18 }}>
        <Notice tone="private" title="Committee channels are private">You see a committee’s channel only while you’re appointed to it.</Notice>
      </View>
    </Screen>
  );
}
