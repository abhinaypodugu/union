import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Badge, Card, Input, Screen, StackHeader, Txt } from '../../src/components';
import { Restricted } from '../../src/components/Restricted';
import { colors } from '../../src/theme';
import { useStore } from '../../src/store/AppStore';

/** Read-only audit trail (PRD §12.4, AC #15, #17). Rows are append-only in the database. */
export default function Audit() {
  const { isOrgAdmin, isPlatformSuperAdmin, auditLogs, refresh } = useStore();
  const [q, setQ] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  if (!isOrgAdmin && !isPlatformSuperAdmin) return <Restricted what="The audit trail" />;
  const needle = q.trim().toLowerCase();
  const list = auditLogs.filter((a) => !needle || `${a.actor} ${a.action} ${a.details} ${a.entityId} ${a.reason || ''}`.toLowerCase().includes(needle));
  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}>
      <StackHeader onBack={() => router.back()} title="Audit trail" />
      <View style={{ paddingHorizontal: 16 }}>
        <Input icon="search" size="sm" value={q} onChangeText={setQ} placeholder="Search actor, action, case ID…" />
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        {list.length === 0 ? <Txt variant="bodyS" color={colors.textMuted}>No audit events.</Txt> : list.map((a) => (
          <Card key={a.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Txt variant="bodySStrong" style={{ flex: 1 }}>{a.action}</Txt>
              {a.isOverride ? <Badge size="sm" tone="danger" variant="outline" icon="shield">Platform admin</Badge> : null}
              <Txt variant="bodyS" color={colors.textMuted}>{a.time}</Txt>
            </View>
            <Txt variant="bodyS">{a.details}</Txt>
            <Txt variant="bodyS" color={colors.textMuted}>{`${a.actor} (${a.actorRole}) · ${a.entityId}`}</Txt>
            {a.reason ? <Txt variant="bodyS" color={colors.textMuted}>{'Reason: ' + a.reason}</Txt> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
