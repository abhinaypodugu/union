import React from 'react';
import { Image, View, ViewStyle } from 'react-native';

export interface PresetAvatarItem {
  id: string;
  name: string;
  url: string;
  bg: string;
}

export const PRESET_AVATARS: PresetAvatarItem[] = [
  { id: 'prof_1', name: 'Superintendent', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Robert&clothing=blazerAndShirt&eyes=default&size=200', bg: '#1E293B' },
  { id: 'prof_2', name: 'Secretary', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Sarah&clothing=blazerAndSweater&eyes=happy&size=200', bg: '#0F766E' },
  { id: 'prof_3', name: 'Postmaster', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Michael&clothing=collarAndSweater&top=shortFlat&size=200', bg: '#1E40AF' },
  { id: 'prof_4', name: 'Senior Assistant', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Emily&clothing=blazerAndShirt&accessories=prescription02&size=200', bg: '#831843' },
  { id: 'prof_5', name: 'Inspector', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=James&clothing=shirtCrewNeck&top=sides&size=200', bg: '#334155' },
  { id: 'prof_6', name: 'Treasurer', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Jennifer&clothing=blazerAndSweater&top=straight01&size=200', bg: '#4338CA' },
  { id: 'prof_7', name: 'Supervisor', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=David&accessories=prescription01&clothing=blazerAndShirt&size=200', bg: '#701A75' },
  { id: 'prof_8', name: 'Chief Officer', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Jessica&clothing=blazerAndShirt&size=200', bg: '#15803D' },
  { id: 'prof_9', name: 'Division Head', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Richard&clothing=collarAndSweater&top=shortRound&size=200', bg: '#991B1B' },
  { id: 'prof_10', name: 'Account Officer', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Rachel&clothing=blazerAndShirt&size=200', bg: '#0E7490' },
  { id: 'prof_11', name: 'Union Steward', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Thomas&clothing=blazerAndShirt&top=theCaesar&size=200', bg: '#374151' },
  { id: 'prof_12', name: 'Circle Director', url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Katherine&clothing=blazerAndSweater&size=200', bg: '#B45309' },
];

export const CUTE_AVATARS = PRESET_AVATARS;

export function PresetAvatar({ id, size = 48, style }: { id: string; size?: number; style?: ViewStyle }) {
  const item = PRESET_AVATARS.find((a) => a.id === id) || PRESET_AVATARS[0];

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
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  );
}

export const CuteAvatar = PresetAvatar;
