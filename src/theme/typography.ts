import { TextStyle } from 'react-native';

/** Font family names as registered by useFonts() in app/_layout.tsx. Custom fonts on RN need one family per weight. */
export const fonts = {
  display500: 'SourceSerif4_500Medium',
  display600: 'SourceSerif4_600SemiBold',
  display700: 'SourceSerif4_700Bold',
  sans400: 'PublicSans_400Regular',
  sans400i: 'PublicSans_400Regular_Italic',
  sans500: 'PublicSans_500Medium',
  sans600: 'PublicSans_600SemiBold',
  sans700: 'PublicSans_700Bold',
  mono400: 'IBMPlexMono_400Regular',
  mono500: 'IBMPlexMono_500Medium',
  mono600: 'IBMPlexMono_600SemiBold',
} as const;

const t = (fontFamily: string, fontSize: number, lh: number, letterSpacing = 0): TextStyle => ({ fontFamily, fontSize, lineHeight: Math.round(fontSize * lh), letterSpacing });

/** Type scale — mirrors tokens/typography.css. Display tracking −0.015em. */
export const type = {
  displayXL: t(fonts.display600, 48, 1.05, -0.72),
  displayL: t(fonts.display600, 36, 1.1, -0.54),
  displayM: t(fonts.display600, 28, 1.15, -0.42),
  displayS: t(fonts.display600, 22, 1.2, -0.33),
  titleL: t(fonts.sans700, 20, 1.3),
  titleM: t(fonts.sans600, 17, 1.35),
  titleS: t(fonts.sans600, 15, 1.35),
  bodyL: t(fonts.sans400, 17, 1.55),
  body: t(fonts.sans400, 15, 1.5),
  bodyStrong: t(fonts.sans600, 15, 1.5),
  bodyS: t(fonts.sans400, 13, 1.45),
  bodySStrong: t(fonts.sans600, 13, 1.45),
  caption: t(fonts.sans500, 12, 1.35),
  label: t(fonts.sans600, 13, 1.3),
  overline: { ...t(fonts.mono600, 11, 1.2, 0.88), textTransform: 'uppercase' } as TextStyle,
  mono: t(fonts.mono500, 12.5, 1.35),
  metric: t(fonts.display600, 32, 1, -0.64),
} as const;

export type TypeVariant = keyof typeof type;
