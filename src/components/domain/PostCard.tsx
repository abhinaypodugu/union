import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Txt } from '../Txt';
import { AudienceLabel, AudienceScope } from './AudienceLabel';

export interface PostCardProps {
  /** member = ordinary post · official = announcement · committee = private channel */
  kind?: 'member' | 'official' | 'committee';
  author: { name: string; role?: string; official?: boolean };
  source?: string;
  audience?: { scope: AudienceScope; label: string };
  time?: string;
  title?: string;
  body?: string;
  /** Image URI or a placeholder caption */
  media?: string;
  pinned?: boolean;
  likes?: number;
  comments?: number;
  liked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onMore?: () => void;
}

/** Instagram-familiar feed card. Official / committee-private / member are visually distinct (PRD §14.4). */
export function PostCard(p: PostCardProps) {
  const { kind = 'member', author, source, audience, time, title, body, media, pinned, likes = 0, comments = 0, liked } = p;
  const official = kind === 'official';
  const committee = kind === 'committee';
  const flag = (icon: string, text: string, priv?: boolean) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: priv ? 'transparent' : colors.officialBg, borderBottomWidth: 1, borderStyle: priv ? 'dashed' : 'solid', borderBottomColor: priv ? colors.privateBorder : colors.officialBorder }}>
      <Icon name={icon} size={14} strokeWidth={2} color={priv ? colors.privateFg : colors.officialFg} />
      <Txt variant="overline" color={priv ? colors.privateFg : colors.officialFg} style={{ flex: 1 }} numberOfLines={1}>{text}</Txt>
      {pinned ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="pin" size={13} strokeWidth={2} color={colors.officialFg} /><Txt variant="overline" color={colors.officialFg}>Pinned</Txt></View> : null}
    </View>
  );
  const isUri = media && /^(https?:|file:|data:)/.test(media);
  return (
    <View style={{
      borderRadius: radius.l, overflow: 'hidden', borderWidth: 1,
      backgroundColor: committee ? colors.surfacePrivate : colors.surfaceCard,
      borderColor: official ? colors.officialBorder : committee ? colors.privateBorder : colors.borderSubtle,
      borderStyle: committee ? 'dashed' : 'solid',
      boxShadow: official ? '0px 0px 0px 3px ' + colors.officialBg : undefined,
    }}>
      {official ? flag('badge-check', 'Official announcement') : null}
      {committee ? flag('lock', 'Committee-private · not visible to members', true) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14 }}>
        <Avatar name={author.name} size={40} official={official || author.official} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={{ fontFamily: fonts.sans600, fontSize: 14.5, lineHeight: 18 }} numberOfLines={1}>
            {author.name}{author.role ? <Txt style={{ fontFamily: fonts.sans400, fontSize: 14.5 }} color={colors.textMuted}>{' · ' + author.role}</Txt> : null}
          </Txt>
          <Txt style={{ fontFamily: fonts.sans400, fontSize: 12.5 }} color={colors.textMuted} numberOfLines={1}>{[source, time].filter(Boolean).join('  ·  ')}</Txt>
        </View>
        <IconButton icon="ellipsis" label="Post options" size="sm" onPress={p.onMore} />
      </View>
      {title ? <Txt variant="displayS" numberOfLines={2} style={{ marginHorizontal: 16, marginTop: 12, flexShrink: 1 }}>{title}</Txt> : null}
      {body ? <Txt variant="body" color={palette.ink800} numberOfLines={6} style={{ marginHorizontal: 16, marginTop: 8, flexShrink: 1 }}>{body}</Txt> : null}
      {media ? (
        <View style={{ marginTop: 12, aspectRatio: 4 / 3, backgroundColor: palette.paper150, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderSubtle }}>
          {isUri ? <Image source={{ uri: media }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Txt variant="mono" color={palette.ink500}>{media}</Txt>}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, marginTop: 4 }}>
        <Action icon="heart" count={likes} on={liked} onPress={p.onLike} label={liked ? 'Unlike' : 'Like'} />
        <Action icon="message-circle" count={comments} onPress={p.onComment} label="Comment" />
        {!committee ? <Action icon="share-2" onPress={p.onShare} label="Share" /> : null}
        <View style={{ marginLeft: 'auto', paddingRight: 8, flexShrink: 1 }}>{audience ? <AudienceLabel {...audience} /> : null}</View>
      </View>
    </View>
  );
}

function Action({ icon, count, on, onPress, label }: { icon: string; count?: number; on?: boolean; onPress?: () => void; label: string }) {
  const c = on ? palette.redSolid : palette.ink700;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 10, borderRadius: 20, backgroundColor: pressed ? colors.surfaceHover : 'transparent', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      <Icon name={icon} size={20} color={c} fill={on ? c : 'none'} />
      {count ? <Txt style={{ fontFamily: fonts.sans600, fontSize: 13 }} color={c}>{String(count)}</Txt> : null}
    </Pressable>
  );
}
