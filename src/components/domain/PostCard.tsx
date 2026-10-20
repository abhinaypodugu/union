import React from 'react';
import { Animated, Image, Platform, Pressable, View } from 'react-native';
import { colors, fonts, palette, radius } from '../../theme';
import { compactCount } from '../../lib/format';
import { Avatar } from '../Avatar';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { Txt } from '../Txt';
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
 onOpen?: () => void;
 bodyLines?: number;
}

/**
 * Feed card matching design system feed.card.html:
 * - Official / committee / member flags at top
 * - 40px Avatar, clear author name + role, meta line with icon
 * - Editorial serif title
 * - Spacious text body with optional Read more
 * - Minimal, spacious inline action row without divider line
 */
export function PostCard(p: PostCardProps) {
 const { kind = 'member', author, source, audience, time, title, body, media, pinned, likes = 0, comments = 0, liked } = p;
 const scope = audience?.scope ?? (kind === 'committee' ? 'committee' : 'org');
 const isCommittee = kind === 'committee' || scope === 'committee' || scope === 'private';
 const official = kind === 'official' && !isCommittee;
 const committee = isCommittee;
 const isUri = !!media && /^(https?:|file:|data:)/.test(media);

 const metaSource = source || audience?.label;

 const getAudienceBadge = () => {
  if (isCommittee) {
   return { icon: 'lock', label: 'Committee private' };
  }
  if (scope === 'region') {
   const raw = audience?.label || metaSource || '';
   const label = raw ? (raw.toLowerCase().includes('region') ? raw : `${raw} · Region`) : 'Region';
   return { icon: 'map-pin', label };
  }
  if (scope === 'local') {
   const raw = audience?.label || metaSource || '';
   const label = raw ? (raw.toLowerCase().includes('unit') || raw.toLowerCase().includes('branch') || raw.toLowerCase().includes('city') ? raw : `${raw} · Unit`) : 'Unit';
   return { icon: 'building-2', label };
  }
  if (scope === 'group') {
   const raw = audience?.label || metaSource || '';
   const label = raw ? (raw.toLowerCase().includes('cadre') || raw.toLowerCase().includes('group') ? raw : `${raw} · Cadre`) : 'Cadre';
   return { icon: 'briefcase', label };
  }
  const raw = audience?.label || metaSource;
  const label = raw ? (raw.toLowerCase().includes('all members') || raw.toLowerCase().includes('organization') ? raw : `${raw} · All members`) : 'Organization-wide';
  return { icon: 'globe', label };
 };

 const badge = getAudienceBadge();
 const likeScale = React.useRef(new Animated.Value(1)).current;

 const handleLike = () => {
  Animated.sequence([
   Animated.timing(likeScale, {
    toValue: 1.2,
    duration: 100,
    useNativeDriver: true,
   }),
   Animated.spring(likeScale, {
    toValue: 1.0,
    friction: 4,
    tension: 160,
    useNativeDriver: true,
   }),
  ]).start();
  p.onLike?.();
 };

 return (
  <View style={{
   borderRadius: radius.l,
   overflow: 'hidden',
   borderWidth: 1,
   borderStyle: committee ? (Platform.OS === 'android' ? 'solid' : 'dashed') : 'solid',
   borderColor: official ? colors.officialBorder : committee ? (Platform.OS === 'android' ? colors.borderSubtle : colors.privateBorder) : colors.borderSubtle,
   backgroundColor: committee ? colors.surfacePrivate : colors.surfaceCard,
  }}>
   {/* 1. Top Flag Banner matching Image #1 */}
   {official ? (
    <View style={{
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 16,
     height: 36,
     backgroundColor: colors.officialBg,
     borderBottomWidth: 1,
     borderBottomColor: colors.officialBorder,
    }}>
     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name="check" size={13} strokeWidth={2.75} color={colors.officialFg} />
      <Txt style={{ fontFamily: fonts.mono500, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }} color={colors.officialFg}>
       OFFICIAL ANNOUNCEMENT
      </Txt>
     </View>
     {pinned ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
       <Icon name="pin" size={12} strokeWidth={2.25} color={colors.officialFg} />
       <Txt style={{ fontFamily: fonts.mono500, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }} color={colors.officialFg}>
        PINNED
       </Txt>
      </View>
     ) : null}
    </View>
   ) : committee ? (
    <View style={{
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
     paddingHorizontal: 16,
     height: 36,
     backgroundColor: colors.bgSunken,
     borderBottomWidth: 1,
     borderStyle: Platform.OS === 'android' ? 'solid' : 'dashed',
     borderBottomColor: Platform.OS === 'android' ? colors.borderSubtle : colors.privateBorder,
    }}>
     <Icon name="lock" size={12} strokeWidth={2.25} color={colors.privateFg} />
     <Txt style={{ fontFamily: fonts.mono500, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', flex: 1 }} color={colors.privateFg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
      COMMITTEE ONLY · NOT VISIBLE TO MEMBERS
     </Txt>
    </View>
   ) : null}

   {/* 2. Header: Avatar (moved top-left), reactive Who block, top-anchored options button */}
   <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 12, paddingRight: 8, paddingTop: 10 }}>
    <Avatar name={author.name} size={40} official={official || author.official} />

    <View style={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', gap: 2, paddingRight: 4 }}>
     {/* Line 1: Author Name + Role */}
     <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
      <Txt style={{ fontFamily: fonts.sans600, fontSize: 15, lineHeight: 19 }} color={palette.ink900}>
       {author.name}
      </Txt>
      {author.role && !['member', 'official announcement', 'official'].includes(author.role.toLowerCase()) ? (
       <Txt style={{ fontFamily: fonts.sans400, fontSize: 12.5, lineHeight: 18 }} color={colors.textMuted}>
        {author.role}
       </Txt>
      ) : null}
     </View>

     {/* Line 2: Audience Visibility Badge + Time */}
     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
      <View
       style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: radius.pill,
        backgroundColor: isCommittee ? colors.surfacePrivate : palette.paper150,
        maxWidth: '85%',
       }}
       accessibilityLabel={`Visible to ${badge.label}`}
      >
       <Icon name={badge.icon} size={11} color={isCommittee ? colors.privateFg : palette.ink700} strokeWidth={2} />
       <Txt
        style={{ fontFamily: fonts.sans500, fontSize: 11.5, lineHeight: 15 }}
        color={isCommittee ? colors.privateFg : palette.ink800}
        numberOfLines={1}
        ellipsizeMode="tail"
       >
        {badge.label}
       </Txt>
      </View>
      {time ? (
       <Txt style={{ fontFamily: fonts.sans400, fontSize: 11.5, lineHeight: 15 }} color={colors.textMuted} numberOfLines={1}>
        · {time}
       </Txt>
      ) : null}
     </View>
    </View>

    {/* Options button: always anchored to top-right beside author name on all screen sizes */}
    <IconButton
     icon="ellipsis"
     label="Post options"
     size="sm"
     onPress={p.onMore}
     color={palette.ink500}
     style={{ alignSelf: 'flex-start', marginTop: -2 }}
    />
   </View>

   {/* 3. Title (Editorial Serif Font) */}
   {title ? (
    <Pressable disabled={!p.onOpen} onPress={p.onOpen} style={{ paddingHorizontal: 12, paddingTop: 8 }}>
     <Txt style={{ fontFamily: fonts.display600, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 }} color={palette.ink900}>
      {title}
     </Txt>
    </Pressable>
   ) : null}

   {/* 4. Body Text */}
   {body ? (
    <Pressable disabled={!p.onOpen} onPress={p.onOpen} style={{ paddingHorizontal: 12, paddingTop: title ? 6 : 8 }}>
     <PostBody body={body} lines={p.bodyLines} canOpen={!!p.onOpen} onOpen={p.onOpen} />
    </Pressable>
   ) : null}

   {/* 5. Optional Media */}
   {media ? (
    <View style={{ marginTop: 10, marginHorizontal: 12, borderRadius: radius.m, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: palette.paper150, alignItems: 'center', justifyContent: 'center' }}>
     {isUri ? (
      <Image source={{ uri: media }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
     ) : (
      <Txt variant="mono" color={palette.ink500}>{media}</Txt>
     )}
    </View>
   ) : null}

   {/* 6. Action Row: Responsive padding aligned with card content */}
   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 }}>
    {/* Like */}
    <Pressable
     accessibilityRole="button"
     accessibilityLabel="Like"
     hitSlop={6}
     onPress={handleLike}
     style={({ pressed }) => ({
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      opacity: pressed ? 0.7 : 1,
     })}
    >
     <Animated.View style={{ transform: [{ scale: likeScale }] }}>
      <Icon name="heart" size={18} color={liked ? palette.redSolid : palette.ink700} fill={liked ? palette.redSolid : 'none'} strokeWidth={1.8} />
     </Animated.View>
     {likes > 0 ? (
      <Txt style={{ fontFamily: fonts.sans600, fontSize: 13.5, lineHeight: 18 }} color={liked ? palette.redSolid : palette.ink800}>
       {compactCount(likes)}
      </Txt>
     ) : null}
    </Pressable>

    {/* Comment */}
    <Pressable
     accessibilityRole="button"
     accessibilityLabel="Comment"
     hitSlop={6}
     onPress={p.onComment ?? p.onOpen}
     style={({ pressed }) => ({
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      opacity: pressed ? 0.7 : 1,
     })}
    >
     <Icon name="message-circle" size={18} color={palette.ink700} strokeWidth={1.8} />
     {comments > 0 ? (
      <Txt style={{ fontFamily: fonts.sans600, fontSize: 13.5, lineHeight: 18 }} color={palette.ink800}>
       {compactCount(comments)}
      </Txt>
     ) : null}
    </Pressable>

    {/* Share */}
    {!committee && p.onShare ? (
     <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share"
      hitSlop={6}
      onPress={p.onShare}
      style={({ pressed }) => ({
       minHeight: 44,
       minWidth: 44,
       justifyContent: 'center',
       flexDirection: 'row',
       alignItems: 'center',
       opacity: pressed ? 0.7 : 1,
      })}
     >
      <Icon name="share-2" size={18} color={palette.ink700} strokeWidth={1.8} />
     </Pressable>
    ) : null}
   </View>
  </View>
 );
}

/** Body text; when capped and actually truncated, shows "Read more" (PRD §8.1: posts must stay readable). */
function PostBody({ body, lines = 5, canOpen, onOpen }: { body: string; lines?: number; canOpen: boolean; onOpen?: () => void }) {
 const [truncated, setTruncated] = React.useState(false);
 const heuristic = !!lines && (body.length > lines * 55 || body.split('\n').length > lines);
 return (
  <View>
   <Txt
    style={{ fontFamily: fonts.sans400, fontSize: 15, lineHeight: 22 }}
    color={palette.ink800}
    numberOfLines={lines}
    onTextLayout={lines ? (e) => setTruncated(e.nativeEvent.lines.length > lines) : undefined}
   >
    {body}
   </Txt>
   {(truncated || heuristic) && canOpen ? (
    <Pressable onPress={onOpen} hitSlop={6} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
     <Txt style={{ fontFamily: fonts.sans600, fontSize: 14, color: palette.blue600 }}>Read more</Txt>
    </Pressable>
   ) : null}
  </View>
 );
}
