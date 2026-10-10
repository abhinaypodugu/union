import React from 'react';
import { View } from 'react-native';
import { Avatar, Card, CommitteeBadge, Icon, IconButton, ListCard, OrgTree, Screen, ScreenHeader, SectionLabel, Txt } from '../../src/components';
import { colors, palette } from '../../src/theme';
import { REPS, TREE } from '../../src/data/mock';

export default function Org() {
  const [sel, setSel] = React.useState('hyd-it-c');
  return (
    <Screen>
      <ScreenHeader title="Organization" right={<IconButton icon="search" label="Search people" size="lg" />} />
      <SectionLabel>Your representatives</SectionLabel>
      <ListCard style={{ marginHorizontal: 12 }}>
        {REPS.map((r) => (
          <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Avatar name={r.name} size={40} />
            <View style={{ flex: 1, gap: 5 }}>
              <Txt variant="titleS">{r.name}<Txt variant="body" color={colors.textMuted}>{' · ' + r.role}</Txt></Txt>
              <CommitteeBadge name={r.committee} level={r.level} size="sm" />
            </View>
            <IconButton icon="message-circle" label={'Message ' + r.name} />
          </View>
        ))}
      </ListCard>
      <SectionLabel>Your escalation route · IT Workers</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
        <CommitteeBadge name="Hyderabad" level={1} size="sm" />
        <Icon name="arrow-right" size={14} color={palette.ink400} />
        <CommitteeBadge name="Telangana" level={2} size="sm" />
        <Icon name="arrow-right" size={14} color={palette.ink400} />
        <CommitteeBadge name="National" level={3} size="sm" />
      </View>
      <SectionLabel>Structure</SectionLabel>
      <Card padding={6} style={{ marginHorizontal: 12 }}>
        <OrgTree nodes={TREE} defaultExpanded={['in', 'tg', 'hyd', 'hyd-it']} selected={sel} onSelect={(n) => setSel(n.id)} />
      </Card>
    </Screen>
  );
}
