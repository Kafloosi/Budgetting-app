import { Dimensions, PixelRatio, StyleSheet, TextStyle } from 'react-native';

// Guideline width: iPhone 12/13/14 class device. Everything scales from this
// so the layout looks proportionally the same on small and large phones.
const GUIDELINE_WIDTH = 375;

export function scale(size: number): number {
  const { width, height } = Dimensions.get('window');
  const shortSide = Math.min(width, height);
  const factor = Math.min(Math.max(shortSide / GUIDELINE_WIDTH, 0.85), 1.35);
  return PixelRatio.roundToNearestPixel(size * factor);
}

/** Moderate scale: scales fonts a bit less aggressively than layout */
export function ms(size: number, resistance = 0.5): number {
  return PixelRatio.roundToNearestPixel(size + (scale(size) - size) * resistance);
}

export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Rietveld Schröder world (see DESIGN.md): neutral planes, structural ink
 * rules, and the three primaries rationed to edges that carry meaning.
 *
 * `card` is a plane and `background` is the ground it sits against, so the
 * page reads as planes butted together rather than as floating containers.
 * The `*Soft` roles stay neutral on purpose — this world separates with a
 * drawn rule, never with a tinted region.
 */
export interface ThemeColors {
  background: string;
  card: string;
  primary: string;
  primarySoft: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  warning: string;
  text: string;
  textSecondary: string;
  /** Hairline rule dividing items inside one plane */
  border: string;
  /** Structural rule dividing one plane from the next */
  rule: string;
  white: string;
}

export const lightColors: ThemeColors = {
  background: '#F2F2F0',
  card: '#FFFFFF',
  primary: '#1D4ED8',
  primarySoft: '#F2F2F0',
  income: '#1D4ED8',
  incomeSoft: '#F2F2F0',
  expense: '#D62828',
  expenseSoft: '#F2F2F0',
  warning: '#F4B400',
  text: '#111111',
  textSecondary: '#6B6B6B',
  border: '#C9C9C5',
  rule: '#111111',
  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  background: '#111111',
  card: '#1B1B1B',
  primary: '#5B8DEF',
  primarySoft: '#111111',
  income: '#5B8DEF',
  incomeSoft: '#111111',
  expense: '#F0524B',
  expenseSoft: '#111111',
  warning: '#F4C13C',
  text: '#F4F4F2',
  textSecondary: '#9A9A98',
  border: '#3A3A38',
  rule: '#F4F4F2',
  white: '#FFFFFF',
};

/**
 * Person markers. The three primaries lead, because those are the household's
 * first people; the rest stay within the world's neutral-and-primary range
 * rather than introducing a second palette.
 */
export const personColors = [
  '#1D4ED8',
  '#D62828',
  '#F4B400',
  '#111111',
  '#6B6B6B',
  '#5B8DEF',
  '#8A1C1C',
  '#B08800',
];

export const spacing = {
  xs: scale(4),
  s: scale(8),
  m: scale(12),
  l: scale(16),
  xl: scale(24),
  xxl: scale(32),
};

/**
 * Everything in this world is orthogonal — see DESIGN.md. The scale is kept
 * so call sites stay readable, but every step is 0: a rounded corner anywhere
 * is a break from the world, not a local styling choice.
 */
export const radius = {
  s: 0,
  m: 0,
  l: 0,
  xl: 0,
};

/**
 * The only two rule weights. `hairline` divides items inside one plane,
 * `structure` divides one plane from the next. A third weight means the
 * layout was not decided.
 */
export const rules = {
  hairline: StyleSheet.hairlineWidth,
  structure: scale(2),
};

/**
 * Money is always set in tabular figures so columns of digits line up down
 * the screen. Spread this into any Text style that renders an amount.
 */
export const figures: Pick<TextStyle, 'fontVariant'> = {
  fontVariant: ['tabular-nums'],
};

export const font = {
  small: ms(12),
  body: ms(14),
  medium: ms(16),
  large: ms(20),
  xlarge: ms(26),
  huge: ms(34),
};
