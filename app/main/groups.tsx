import React from 'react';
import { Share, View } from 'react-native';
import { router } from 'expo-router';
import {
  ActionItem, ActionSheet, AppPressable, EmptyState, Icon, IconTile, Input, ListCard, ListRow, Notice, Screen, ScreenHeader, Txt, copyText,
} from '../../src/components';
import { colors } from '../../src/theme';
import { useStore, GroupItem } from '../../src/store/AppStore';

export default function Groups() {
  const { groups, refresh, toast } = useStore();
  const [q, setQ] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [menuGroup, setMenuGroup] = React.useState<GroupItem | null>(null);
  const needle = q.trim().toLowerCase();

  const filtered = React.useMemo(
    () => groups
      .map((section) => ({
        ...section,
        items: needle
          ? section.items.filter((g) => `${g.name} ${g.kind} ${section.section}`.toLowerCase().includes(needle))
          : section.items,
      }))
      .filter((section) => !needle || section.items.length > 0),
    [groups, needle],
  );
  const resultCount = filtered.reduce((count, section) => count + section.items.length, 0);

  const openGroup = (group: GroupItem) => {
    router.push({ pathname: '/group', params: { scope: group.scope, value: group.value ?? '', name: group.name } } as never);
  };
  const copyGroupName = async (group: GroupItem) => {
    if (await copyText(group.name)) toast({ title: 'Group name copied', description: group.name });
    else toast({ title: 'Could not copy group name', tone: 'danger' });
  };
  const shareGroupName = async (group: GroupItem) => {
    try {
      await Share.share({
        title: group.name,
        message: `${group.name} · ${group.kind}\nOpen BPEF → Groups to join the conversation.`,
      });
    } catch {
      toast({ title: 'Could not share group', tone: 'danger' });
    }
  };
  const groupActions: ActionItem[] = menuGroup ? [
    { label: 'Open', icon: 'arrow-up-right', onPress: () => openGroup(menuGroup) },
    { label: 'Copy group name', icon: 'copy', onPress: () => { void copyGroupName(menuGroup); } },
    { label: 'Share group name', icon: 'share-2', onPress: () => { void shareGroupName(menuGroup); } },
  ] : [];

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}
    >
      <ScreenHeader title="Groups" />
      <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <Input
          icon="search"
          value={q}
          onChangeText={setQ}
          placeholder="Search channels and associations"
          returnKeyType="search"
          clearable
        />
        {needle ? (
          <Txt variant="caption" color={colors.textMuted} style={{ paddingTop: 6 }}>
            {`${resultCount} ${resultCount === 1 ? 'match' : 'matches'} for “${q.trim()}”`}
          </Txt>
        ) : null}
      </View>

      {groups.length === 0 ? (
        <View style={{ padding: 16 }}>
          <EmptyState
            icon="users"
            title="No groups yet"
            description="Your division, circle and federation channels will appear here."
            actionLabel="Refresh"
            onAction={() => { setRefreshing(true); void refresh().finally(() => setRefreshing(false)); }}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ padding: 16 }}>
          <EmptyState
            icon="search"
            title="No groups match"
            description={`No channel matches “${q.trim()}”. Try a different name or clear the search.`}
            actionLabel="Clear search"
            onAction={() => setQ('')}
          />
        </View>
      ) : (
        filtered.map((section) => {
          const expanded = Boolean(needle) || !collapsed[section.section];
          return (
            <View key={section.section}>
              <AppPressable
                haptic="selection"
                disabled={Boolean(needle)}
                accessibilityRole="button"
                accessibilityLabel={`${section.section}, ${expanded ? 'expanded' : 'collapsed'}`}
                accessibilityState={{ expanded, disabled: Boolean(needle) }}
                onPress={() => setCollapsed((prev) => ({ ...prev, [section.section]: !prev[section.section] }))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 48,
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 6,
                  backgroundColor: pressed ? colors.surfaceHover : 'transparent',
                })}
              >
                <Txt variant="overline" color={colors.textMuted} style={{ flex: 1 }}>{section.section}</Txt>
                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </AppPressable>
              {expanded ? (
                <>
                  {section.note ? (
                    <Txt variant="bodyS" color={colors.textMuted} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                      {section.note}
                    </Txt>
                  ) : null}
                  {section.items.length === 0 ? (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                      <EmptyState
                        icon="folder-open"
                        title="No channels in this section"
                        description="Channels will appear here as they become available to you."
                      />
                    </View>
                  ) : (
                    <ListCard style={{ marginHorizontal: 12 }}>
                      {section.items.map((group) => (
                        <ListRow
                          key={group.id}
                          title={group.name}
                          subtitle={group.kind}
                          left={<IconTile icon={group.icon} tone={group.tone} />}
                          accessibilityHint="Opens the channel. Long press for group actions."
                          onPress={() => openGroup(group)}
                          onLongPress={() => setMenuGroup(group)}
                        />
                      ))}
                    </ListCard>
                  )}
                </>
              ) : null}
            </View>
          );
        })
      )}

      <View style={{ padding: 12, paddingTop: 18 }}>
        <Notice tone="info" title="Tier-Based Communication">
          Division channels are open for all workplace members to chat. Circle and All-India Union channels carry official updates from elected leadership.
        </Notice>
      </View>

      <ActionSheet
        visible={!!menuGroup}
        onClose={() => setMenuGroup(null)}
        title="Group actions"
        message={menuGroup?.name}
        actions={groupActions}
      />
    </Screen>
  );
}
