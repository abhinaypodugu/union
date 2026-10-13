import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, DueLabel, EscalationTimeline, Fact, Icon, IconButton, Notice, Screen, SectionLabel, StackHeader, StatusBadge, TextArea, Txt } from '../src/components';
import { colors, palette } from '../src/theme';
import { useStore } from '../src/store/AppStore';

export default function IssueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { issues, replyToIssue, toast } = useStore();
  const issue = issues.find((i) => i.id === id);
  const [reply, setReply] = React.useState('');
  if (!issue) return <Screen><StackHeader onBack={() => router.back()} /><Txt style={{ padding: 16 }}>Case not found or no longer available to you.</Txt></Screen>;
  const needs = issue.status === 'awaiting_member';

  return (
    <Screen>
      <StackHeader title={issue.id} mono onBack={() => router.back()} right={<IconButton icon="ellipsis" label="More" size="lg" />} />
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
        <StatusBadge status={issue.status} level={issue.level} label={issue.statusLabel} />
        <Txt variant="displayM">{issue.title}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
          <Fact icon="file-text">{issue.category}</Fact>
          <Fact icon="map-pin">{issue.location}</Fact>
          <Fact icon="calendar">{'Opened ' + issue.opened}</Fact>
        </View>
      </View>

      {issue.status !== 'closed' ? (
        <Card style={{ marginHorizontal: 12, marginTop: 16, gap: 10, ...(needs ? { backgroundColor: palette.amberBg, borderColor: palette.amberBorder } : null) }}>
          <Txt variant="overline" color={needs ? palette.amberFg : colors.textMuted}>{needs ? 'Action needed from you' : 'What happens next'}</Txt>
          <Txt variant="titleM">{issue.nextAction ?? ''}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="users" size={14} color={colors.textSecondary} />
            <Txt variant="bodyS" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{issue.committee}</Txt>
            <DueLabel due={issue.due} state={issue.dueState} />
          </View>
          {needs ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <TextArea value={reply} onChangeText={setReply} placeholder="Add a note for the committee…" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="secondary" icon="paperclip" style={{ flex: 1 }}>Attach</Button>
                <Button icon="send" style={{ flex: 1 }} disabled={!reply.trim()} onPress={() => { replyToIssue(issue.id, reply); setReply(''); toast({ title: 'Reply sent', description: 'The committee has been notified' }); }}>Send reply</Button>
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      <SectionLabel>Progress</SectionLabel>
      <Card style={{ marginHorizontal: 12 }}><EscalationTimeline stages={issue.stages} /></Card>
      <View style={{ padding: 12, paddingTop: 14 }}>
        <Notice tone="private" title="Private to you and assigned handlers">Internal committee notes aren’t shown here.</Notice>
      </View>
    </Screen>
  );
}
