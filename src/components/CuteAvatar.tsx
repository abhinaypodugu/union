import React from 'react';
import { Image, View, ViewStyle } from 'react-native';

export interface CuteAvatarItem {
  id: string;
  name: string;
  url: string;
  bg: string;
}

export const CUTE_AVATARS: CuteAvatarItem[] = [
  { id: 'bot1', name: 'Robo Post', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Felix&size=200', bg: '#1E293B' },
  { id: 'fox', name: 'Courier Fox', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Bandit&size=200', bg: '#EA580C' },
  { id: 'panda', name: 'Fun Panda', url: 'https://api.dicebear.com/7.x/fun-emoji/png?seed=Bubba&size=200', bg: '#0F172A' },
  { id: 'bear', name: 'Friendly Bear', url: 'https://api.dicebear.com/7.x/lorelei/png?seed=Jasper&size=200', bg: '#78350F' },
  { id: 'milo', name: 'Courier Milo', url: 'https://api.dicebear.com/7.x/notionists/png?seed=Milo&size=200', bg: '#0284C7' },
  { id: 'sunny', name: 'Sunny Joy', url: 'https://api.dicebear.com/7.x/fun-emoji/png?seed=Sunny&size=200', bg: '#CA8A04' },
  { id: 'scout', name: 'Postal Scout', url: 'https://api.dicebear.com/7.x/adventurer/png?seed=Sammy&size=200', bg: '#15803D' },
  { id: 'bot2', name: 'Astro Bot', url: 'https://api.dicebear.com/7.x/bottts/png?seed=Sparky&size=200', bg: '#4338CA' },
  { id: 'willow', name: 'Chief Willow', url: 'https://api.dicebear.com/7.x/lorelei/png?seed=Willow&size=200', bg: '#9333EA' },
  { id: 'coco', name: 'Happy Coco', url: 'https://api.dicebear.com/7.x/big-smile/png?seed=Coco&size=200', bg: '#DB2777' },
  { id: 'steward', name: 'Steward Oliver', url: 'https://api.dicebear.com/7.x/notionists/png?seed=Oliver&size=200', bg: '#334155' },
  { id: 'spark', name: 'Flash Spark', url: 'https://api.dicebear.com/7.x/fun-emoji/png?seed=Zippy&size=200', bg: '#D97706' },
];

export const PRESET_AVATARS = CUTE_AVATARS;

export function CuteAvatar({ id, size = 48, style }: { id: string; size?: number; style?: ViewStyle }) {
  const item = CUTE_AVATARS.find((a) => a.id === id) || CUTE_AVATARS[0];

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: item.bg,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={{ uri: item.url }}
        style={{ width: size * 0.92, height: size * 0.92, borderRadius: (size * 0.92) / 2 }}
        resizeMode="contain"
      />
    </View>
  );
}

export const PresetAvatar = CuteAvatar;
