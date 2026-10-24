import type { ImageSourcePropType } from 'react-native';

const SOURCES: Record<string, ImageSourcePropType> = {
  sculpted_01: require('../../assets/avatars/sculpted_01.png'),
  sculpted_02: require('../../assets/avatars/sculpted_02.png'),
  sculpted_03: require('../../assets/avatars/sculpted_03.png'),
  sculpted_04: require('../../assets/avatars/sculpted_04.png'),
  sculpted_05: require('../../assets/avatars/sculpted_05.png'),
  sculpted_06: require('../../assets/avatars/sculpted_06.png'),
  sculpted_07: require('../../assets/avatars/sculpted_07.png'),
  sculpted_08: require('../../assets/avatars/sculpted_08.png'),
  sculpted_09: require('../../assets/avatars/sculpted_09.png'),
  sculpted_10: require('../../assets/avatars/sculpted_10.png'),
  sculpted_11: require('../../assets/avatars/sculpted_11.png'),
  sculpted_12: require('../../assets/avatars/sculpted_12.png'),
  sculpted_13: require('../../assets/avatars/sculpted_13.png'),
  sculpted_14: require('../../assets/avatars/sculpted_14.png'),
  sculpted_15: require('../../assets/avatars/sculpted_15.png'),
  sculpted_16: require('../../assets/avatars/sculpted_16.png'),
};

export function presetAvatarSource(id: string): ImageSourcePropType {
  return SOURCES[id] || SOURCES.sculpted_01;
}
