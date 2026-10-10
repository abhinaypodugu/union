import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar, Badge, Button, Card, IconTile, KeyValue, ListCard, ListRow, Screen, SectionLabel, StackHeader, Switch, Txt } from '../src/components';
import { colors } from '../src/theme';
import { ME } from '../src/data/mock';

const PREFS: Array<[string, boolean, boolean]> = [['Official announcements', true, false], ['Replies & mentions', true, false], ['Group activity', false, false], ['Case updates', true, true]];

export default function Profile() {
  const [prefs, setPrefs] = React.useState(PREFS.map((p) => p[1]));
  return (
    <Screen>
      <StackHeader onBack={() => router.back()} />
      <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
        <Avatar name={ME.name} size={80} />
        <Txt variant="displayM" style={{ marginTop: 6 }}>{ME.name}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge tone="success" dot>Verified member</Badge>
          <Txt variant="mono" color={colors.textSecondary}>{ME.memberId}</Txt>
        </View>
      </View>
      {ME.isLeader ? (
        <>
          <SectionLabel>Management</SectionLabel>
          <ListCard style={{ marginHorizontal: 12 }}>
            <ListRow title="Leadership tools" subtitle={ME.leaderScope} left={<IconTile icon="shield" tone="committee" />} onPress={() => router.push('/manage')} />
          </ListCard>
        </>
      ) : null}
      <SectionLabel>Membership</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        <KeyValue first k="Location" v={ME.unit + ' · ' + ME.region} />
        <KeyValue k="Functional groups" v={ME.groups.join(', ')} />
        <KeyValue k="Member since" v={ME.since} />
      </Card>
      <SectionLabel>Notifications</SectionLabel>
      <Card padding={14} style={{ marginHorizontal: 12, paddingVertical: 2 }}>
        {PREFS.map(([label, , locked], i) => (
          <View key={label} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.borderSubtle }}>
            <Switch label={label} description={locked ? 'Required by your organization' : undefined} value={prefs[i]} disabled={locked} onChange={(val) => setPrefs(prefs.map((p, j) => (j === i ? val : p)))} />
          </View>
        ))}
      </Card>
      <View style={{ padding: 12, paddingTop: 20 }}><Button variant="secondary" block icon="log-out">Sign out</Button></View>
    </Screen>
  );
}
