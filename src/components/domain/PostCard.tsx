import React from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { compactCount } from '../../lib/format';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Txt } from '../Txt';
import { VerifiedCheck } from '../VerifiedCheck';
import { AudienceScope } from './AudienceLabel';

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
  /** Cap the body in lists; omit to show the full text (post detail). */
  bodyLines?: number;
  /** Opens the full post (tap on body / "Read more"). */
  onOpen?: () => void;
}

const AUDIENCE_ICON: Record<AudienceScope, string> = { org: 'globe', region: 'map-pin', local: 'map-pin', group: 'users-round', committee: 'lock', private: 'lock', public: 'globe' };

// Android draws dashed borders badly on rounded views (gaps/solid fallback), so private cards use a solid ink border there.
const DASHED = Platform.OS === 'ios' ? 'dashed' : 'solid';

/** Feed card. Official / committee-private / member must stay visually distinct (PRD §14.4). */
export function PostCard(p: PostCardProps) {
  const { kind = 'member', author, source, audience, time, title, body, media, pinned, likes = 0, comments = 0, liked } = p;
  const scope = audience?.scope ?? (kind === 'committee' ? 'committee' : 'org');
  const isCommittee = kind === 'committee' || scope === 'committee' || scope === 'private';
  const official = kind === 'official' && !isCommittee;
  const committee = isCommittee;
  const isUri = !!media && /^(https?:|file:|data:)/.test(media);
  const priv = committee;
  const metaColor = priv ? colors.privateFg : colors.textMuted;
  const where = source || audience?.label;

  return (
    <View style={{
      borderRadius: radius.xl, overflow: 'hidden',
      borderWidth: official ? 1.5 : 1,
      borderStyle: committee ? 'dashed' : 'solid',
      borderColor: official ? colors.officialBorder : committee ? colors.privateBorder : colors.borderSubtle,
      backgroundColor: committee ? colors.surfacePrivate : colors.surfaceCard,
    }}>
      {official ? (
        <Band bg={colors.officialBg} fg={colors.officialFg} border={colors.officialBorder} icon="badge-check" text="Official announcement" pinned={pinned} />
      ) : committee ? (
        <Band bg={colors.bgSunken} fg={colors.privateFg} border={colors.privateBorder} borderStyle="dashed" icon="lock" text="COMMITTEE ONLY · NOT VISIBLE TO MEMBERS" />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 6, paddingTop: 14 }}>
        <Avatar name={author.name} size={42} official={official || author.official} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Txt style={{ fontFamily: fonts.sans600, fontSize: 14.5, lineHeight: 19 }} color={palette.ink900}>{author.name}</Txt>
            {official || author.official ? <VerifiedCheck size={14} /> : null}
            {author.role ? <Txt style={{ fontFamily: fonts.sans400, fontSize: 12.5, lineHeight: 18 }} color={colors.textMuted}>{'· ' + author.role}</Txt> : null}
            {pinned && !official ? <Icon name="pin" size={13} color={colors.textMuted} strokeWidth={2} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible accessibilityLabel={(where ? 'Posted to ' + where + '. ' : '') + (audience ? 'Visible to ' + audience.label + '. ' : '') + (time || '')}>
            <Icon name={AUDIENCE_ICON[scope]} size={12} color={metaColor} strokeWidth={2.25} />
            {where ? <Txt style={{ fontFamily: fonts.sans500, fontSize: 12.5, lineHeight: 16, flexShrink: 1 }} color={metaColor} numberOfLines={1}>{where}</Txt> : null}
            {where && time ? <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted }} /> : null}
            {time ? <Txt style={{ fontFamily: fonts.sans400, fontSize: 12.5, lineHeight: 16 }} color={colors.textMuted}>{time}</Txt> : null}
          </View>
        </View>
        <IconButton icon="ellipsis" label="Post options" onPress={p.onMore} color={palette.ink500} />
      </View>

      <Pressable disabled={!p.onOpen} onPress={p.onOpen} style={{ paddingHorizontal: 16, paddingTop: title ? 14 : 10, gap: 6 }}>
        {title ? <Txt variant="displayS" color={palette.ink900}>{title}</Txt> : null}
        {body ? <PostBody body={body} lines={p.bodyLines} canOpen={!!p.onOpen} /> : null}
      </Pressable>

      {
        media ? (
          <View style={{ marginTop: 14, marginHorizontal: 12, borderRadius: radius.l, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: palette.paper150, alignItems: 'center', justifyContent: 'center' }}>
            {isUri ? <Image source={{ uri: media }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /> : <Txt variant="mono" color={palette.ink500}>{media}</Txt>}
          </View>
        ) : null
      }

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginHorizontal: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: committee ? palette.paper200 : colors.borderSubtle }}>
        <Action icon="heart" count={likes} on={liked} onPress={p.onLike} label={liked ? 'Unlike' : 'Like'} />
        <Action icon="message-circle" count={comments} onPress={p.onComment ?? p.onOpen} label={comments ? comments + ' comments' : 'Comment'} />
        {!committee && p.onShare ? <Action icon="share-2" onPress={p.onShare} label="Share" /> : null}
      </View>
    </View >
  );
}

function Band({ bg, fg, border, borderStyle = 'solid', icon, text, pinned }: { bg: string; fg: string; border: string; borderStyle?: 'solid' | 'dashed'; icon: string; text: string; pinned?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, height: 34, backgroundColor: bg, borderBottomWidth: 1, borderStyle, borderBottomColor: border }}>
      <Icon name={icon} size={14} strokeWidth={2.25} color={fg} />
      <Txt variant="overline" color={fg} style={{ flex: 1, letterSpacing: 0.8 }} numberOfLines={1}>{text}</Txt>
      {pinned ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="pin" size={12} strokeWidth={2.25} color={fg} />
          <Txt variant="overline" color={fg}>Pinned</Txt>
        </View>
      ) : null}
    </View>
  );
}

function Action({ icon, count, on, onPress, label }: { icon: string; count?: number; on?: boolean; onPress?: () => void; label: string }) {
  const c = on ? palette.redSolid : palette.ink700;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} onPress={onPress} hitSlop={4}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 64, height: 44, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceHover : 'transparent' })}>
      {({ pressed }) => (
        <>
          <View style={{ transform: [{ scale: pressed ? 0.88 : 1 }] }}><Icon name={icon} size={21} color={c} fill={on ? c : 'none'} strokeWidth={1.9} /></View>
          {count ? <Txt style={{ fontFamily: fonts.sans600, fontSize: 13.5, lineHeight: 18, fontVariant: ['tabular-nums'] }} color={on ? c : palette.ink700}>{compactCount(count)}</Txt> : null}
        </>
      )}
    </Pressable>
  );
}

/** Body text; when capped and actually truncated, shows "Read more" (PRD §8.1: posts must stay readable). */
function PostBody({ body, lines, canOpen }: { body: string; lines?: number; canOpen: boolean }) {
  const [truncated, setTruncated] = React.useState(false);
  const heuristic = !!lines && (body.length > lines * 55 || body.split('\n').length > lines);
  return (
    <View>
      <Txt
        style={{ fontFamily: fonts.sans400, fontSize: 15.5, lineHeight: 23 }}
        color={palette.ink800}
        numberOfLines={lines}
        // iOS reports every line, Android only the visible ones — hence the length heuristic too.
        onTextLayout={lines ? (e) => setTruncated(e.nativeEvent.lines.length > lines) : undefined}
      >
        {body}
      </Txt>
      {lines && canOpen && (truncated || heuristic) ? <Txt variant="bodySStrong" color={colors.accent} style={{ marginTop: 4 }}>Read more</Txt> : null}
    </View>
  );
}
