// Commons design tokens — React Native (iOS + Android).
// Generated from ../tokens/*.css (oklch → sRGB hex). Keep in sync with the web token spec.

export const palette = {
  paper0: "#fefdfb",
  paper50: "#fbf9f5",
  paper100: "#f4f2ee",
  paper150: "#efece8",
  paper200: "#e6e4de",
  paper300: "#d6d3cd",
  ink400: "#9b9891",
  ink500: "#78746d",
  ink600: "#5e5a53",
  ink700: "#433f39",
  ink800: "#2c2822",
  ink900: "#1b1812",
  blue50: "#eff7ff",
  blue100: "#dbecff",
  blue200: "#b7d8ff",
  blue300: "#86b7f6",
  blue400: "#4f8edc",
  blue500: "#266cbd",
  blue600: "#14569f",
  blue700: "#0d437f",
  blue800: "#09305c",
  redFg: "#a5332e",
  redSolid: "#c44039",
  redBg: "#ffedeb",
  redBorder: "#fac6bf",
  amberFg: "#8d5406",
  amberSolid: "#e19b34",
  amberBg: "#fff2dc",
  amberBorder: "#f2ce9d",
  greenFg: "#1b6c3a",
  greenSolid: "#318850",
  greenBg: "#e7f8ea",
  greenBorder: "#b6dfc0",
  violetFg: "#6c44a4",
  violetSolid: "#7e53bc",
  violetBg: "#f4efff",
  violetBorder: "#daccf7"
} as const;

export const colors = {
  bgApp: palette.paper50,
  bgSunken: palette.paper100,
  surfaceCard: palette.paper0,
  surfaceRaised: palette.paper0,
  surfaceHover: palette.paper100,
  surfacePressed: palette.paper150,
  surfaceSelected: palette.blue50,
  surfacePrivate: palette.paper100,
  surfaceInverse: palette.ink900,

  textPrimary: palette.ink900,
  textBody: palette.ink800,
  textSecondary: palette.ink600,
  textMuted: palette.ink500,
  textPlaceholder: palette.ink400,
  textInverse: palette.paper0,
  textAccent: palette.blue600,

  borderSubtle: palette.paper200,
  borderDefault: palette.paper300,
  borderStrong: palette.ink400,
  borderFocus: palette.blue500,

  accent: palette.blue600,
  accentPressed: palette.blue700,
  accentSoft: palette.blue50,
  accentSoftBorder: palette.blue200,
  focusRing: palette.blue200,

  officialFg: palette.blue600,
  officialBg: palette.blue50,
  officialBorder: palette.blue200,
  privateFg: palette.ink700,
  privateBorder: palette.ink400,

  scrim: 'rgba(24,22,17,0.42)',
} as const;

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'escalated';

/** Workflow status colors. fg = text/icon, bg = soft fill, border, solid = strong fill */
export const tones: Record<Tone, { fg: string; bg: string; border: string; solid: string; onSolid: string }> = {
  neutral: { fg: palette.ink700, bg: palette.paper150, border: palette.paper300, solid: palette.ink800, onSolid: palette.paper0 },
  info: { fg: palette.blue600, bg: palette.blue50, border: palette.blue200, solid: palette.blue600, onSolid: palette.paper0 },
  success: { fg: palette.greenFg, bg: palette.greenBg, border: palette.greenBorder, solid: palette.greenSolid, onSolid: palette.paper0 },
  warning: { fg: palette.amberFg, bg: palette.amberBg, border: palette.amberBorder, solid: palette.amberSolid, onSolid: palette.ink900 },
  danger: { fg: palette.redFg, bg: palette.redBg, border: palette.redBorder, solid: palette.redSolid, onSolid: palette.paper0 },
  escalated: { fg: palette.violetFg, bg: palette.violetBg, border: palette.violetBorder, solid: palette.violetSolid, onSolid: palette.paper0 },
};

export const space = { 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { xs: 3, s: 6, m: 8, l: 12, xl: 16, xxl: 24, pill: 999 } as const;
export const control = { sm: 32, md: 40, lg: 48, tap: 44 } as const;

/** boxShadow strings (React Native New Architecture, iOS + Android) */
export const shadow = {
  card: '0px 1px 0px rgba(51,45,35,0.04)',
  raised: '0px 1px 2px rgba(51,45,35,0.06), 0px 4px 12px -4px rgba(51,45,35,0.1)',
  popover: '0px 2px 6px rgba(51,45,35,0.06), 0px 12px 32px -8px rgba(51,45,35,0.2)',
  sheet: '0px -8px 40px -12px rgba(51,45,35,0.25)',
  focus: '0px 0px 0px 3px ' + palette.blue200,
  focusDanger: '0px 0px 0px 3px ' + palette.redBorder,
} as const;

export const motion = { fast: 120, base: 200, slow: 320 } as const;
