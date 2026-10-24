export interface CuteAvatarItem {
  id: string;
  name: string;
}

// Bundled BPEF sculpted avatars. Stored in avatar_url as `default:<id>`.
// The image modules live in avatarAssets.ts so this metadata stays importable
// by Node tests without React Native/PNG loaders.
export const CUTE_AVATARS: CuteAvatarItem[] = [
  { id: 'sculpted_01', name: 'Sculpted 01' },
  { id: 'sculpted_02', name: 'Sculpted 02' },
  { id: 'sculpted_03', name: 'Sculpted 03' },
  { id: 'sculpted_04', name: 'Sculpted 04' },
  { id: 'sculpted_05', name: 'Sculpted 05' },
  { id: 'sculpted_06', name: 'Sculpted 06' },
  { id: 'sculpted_07', name: 'Sculpted 07' },
  { id: 'sculpted_08', name: 'Sculpted 08' },
  { id: 'sculpted_09', name: 'Sculpted 09' },
  { id: 'sculpted_10', name: 'Sculpted 10' },
  { id: 'sculpted_11', name: 'Sculpted 11' },
  { id: 'sculpted_12', name: 'Sculpted 12' },
  { id: 'sculpted_13', name: 'Sculpted 13' },
  { id: 'sculpted_14', name: 'Sculpted 14' },
  { id: 'sculpted_15', name: 'Sculpted 15' },
  { id: 'sculpted_16', name: 'Sculpted 16' },
];

export const PRESET_AVATARS = CUTE_AVATARS;
