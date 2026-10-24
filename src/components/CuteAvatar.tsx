import React from 'react';
import { Image, View, ViewStyle } from 'react-native';

export { type CuteAvatarItem, CUTE_AVATARS, PRESET_AVATARS } from '../lib/avatarPresets';
import { CUTE_AVATARS } from '../lib/avatarPresets';
import { presetAvatarSource } from '../lib/avatarAssets';

export function CuteAvatar({ id, size = 48, style }: { id: string; size?: number; style?: ViewStyle }) {
  const item = CUTE_AVATARS.find((a) => a.id === id) || CUTE_AVATARS[0];

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#EFEAE1',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={presetAvatarSource(item.id)}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  );
}

export const PresetAvatar = CuteAvatar;
