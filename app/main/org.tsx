import React from 'react';
import { View } from 'react-native';
import { Avatar, Card, CommitteeBadge, Icon, IconButton, ListCard, OrgTree, Screen, ScreenHeader, SectionLabel, Txt, IconTile } from '../../src/components';
import { colors, palette } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

export default function Org() {
  const { tenant, activeMember, members, committee } = useStore();
  const [sel, setSel] = React.useState('org');

  const nodes = tenant
    ? [
      {
        id: 'org',
        name: tenant.name,
        type: 'country' as const,
        kind: 'Organization',
        children: committee
          ? [
            {
              id: 'com',
              name: committee.name,
              type: 'committee' as const,
              kind: 'Executive Committee',
              meta: `${members.length} officers`,
            },
          ]
          : [],
      },
    ]
    : [];

  return (
    <Screen>
      <ScreenHeader
        overline={tenant?.name || 'Organization'}
        title="Organization"
        right={<IconButton icon="search" label="Search people" size="lg" />}
      />

      <SectionLabel>Your representatives</SectionLabel>
      {members.length === 0 ? (
        <View style={{ paddingHorizontal: 12 }}>
          <Card style={{ padding: 20, alignItems: 'center', gap: 8 }}>
            <IconTile icon="users" tone="committee" />
            <Txt variant="titleS">No representatives appointed yet</Txt>
            <Txt variant="bodyS" color={colors.textSecondary} align="center">
              Officers and stewards appointed by leadership will be listed here.
            </Txt>
          </Card>
        </View>
      ) : (
        <ListCard style={{ marginHorizontal: 12 }}>
          {members.map((r) => (
            <View
              key={r.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
              }}
            >
              <Avatar name={r.name} size={40} />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt variant="titleS">
                  {r.name}
                  <Txt variant="body" color={colors.textMuted}>
                    {' · ' + r.role}
                  </Txt>
                </Txt>
                <CommitteeBadge name={committee?.name || 'Committee'} level={1} size="sm" />
              </View>
              <IconButton icon="message-circle" label={'Message ' + r.name} />
            </View>
          ))}
        </ListCard>
      )}

      <SectionLabel>
        {'Your escalation route · ' + (activeMember?.groups?.[0] || 'Members')}
      </SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
        <CommitteeBadge name={activeMember?.unit || 'Local Unit'} level={1} size="sm" />
        <Icon name="arrow-right" size={14} color={palette.ink400} />
        <CommitteeBadge name="Regional Committee" level={2} size="sm" />
        <Icon name="arrow-right" size={14} color={palette.ink400} />
        <CommitteeBadge name="National Council" level={3} size="sm" />
      </View>

      <SectionLabel>Structure</SectionLabel>
      <Card padding={6} style={{ marginHorizontal: 12 }}>
        <OrgTree nodes={nodes} defaultExpanded={['org', 'com']} selected={sel} onSelect={(n) => setSel(n.id)} />
      </Card>
    </Screen>
  );
}
