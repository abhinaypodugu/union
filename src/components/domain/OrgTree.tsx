import React from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { Icon } from '../Icon';
import { Txt } from '../Txt';

export interface OrgNode {
  id: string;
  name: string;
  type: 'org' | 'country' | 'state' | 'city' | 'unit' | 'group' | 'committee';
  /** Tenant terminology, e.g. "State", "District" */
  kind?: string;
  meta?: string;
  you?: boolean;
  children?: OrgNode[];
}

const TYPE_ICON: Record<OrgNode['type'], string> = { org: 'landmark', country: 'globe', state: 'map-pin', city: 'building-2', unit: 'map-pin', group: 'briefcase', committee: 'users' };

/** Teams-style hierarchy. Geography = grey tile, functional group = outlined, committee = blue. */
export function OrgTree({ nodes, defaultExpanded = [], selected, onSelect }: { nodes: OrgNode[]; defaultExpanded?: string[]; selected?: string; onSelect?: (n: OrgNode) => void }) {
  const [open, setOpen] = React.useState<Set<string>>(() => new Set(defaultExpanded));
  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const render = (list: OrgNode[], depth: number): React.ReactNode => (
    <View style={depth ? { marginLeft: 13, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: palette.paper300 } : undefined}>
      {list.map((n) => {
        const kids = n.children ?? [];
        const isOpen = open.has(n.id);
        const sel = selected === n.id;
        const tile = n.type === 'committee' ? { bg: palette.blue50, fg: colors.accent, bd: 'transparent' } : n.type === 'group' ? { bg: palette.paper0, fg: palette.ink700, bd: colors.borderDefault } : { bg: palette.paper150, fg: palette.ink700, bd: 'transparent' };
        return (
          <View key={n.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: kids.length ? isOpen : undefined, selected: sel }}
              onPress={() => { if (kids.length) toggle(n.id); onSelect?.(n); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 4, paddingLeft: 2, paddingRight: 8, borderRadius: radius.s, backgroundColor: sel ? colors.surfaceSelected : pressed ? colors.surfaceHover : 'transparent', borderWidth: 1, borderColor: sel ? colors.accentSoftBorder : 'transparent' })}
            >
              <View style={{ width: 18, alignItems: 'center', transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>{kids.length ? <Icon name="chevron-right" size={15} color={palette.ink500} strokeWidth={2} /> : null}</View>
              <View style={{ width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: tile.bg, borderWidth: 1, borderColor: tile.bd }}><Icon name={TYPE_ICON[n.type]} size={15} color={tile.fg} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontFamily: fonts.sans600, fontSize: 14 }} numberOfLines={1}>{n.name}</Txt>
                {n.kind ? <Txt style={{ fontFamily: fonts.mono500, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase' }} color={colors.textMuted}>{n.kind}</Txt> : null}
              </View>
              {n.you ? <View style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: palette.blue50 }}><Txt style={{ fontFamily: fonts.sans600, fontSize: 10.5 }} color={colors.accent}>You</Txt></View> : null}
              {n.meta ? <Txt style={{ fontFamily: fonts.mono500, fontSize: 12 }} color={colors.textMuted}>{n.meta}</Txt> : null}
            </Pressable>
            {kids.length && isOpen ? render(kids, depth + 1) : null}
          </View>
        );
      })}
    </View>
  );
  return <View accessibilityRole="list">{render(nodes, 0)}</View>;
}
