import { Dimensions, PixelRatio } from 'react-native';

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
  border: string;
  white: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F5FA',
  card: '#FFFFFF',
  primary: '#4F63F6',
  primarySoft: '#E9ECFE',
  income: '#1FA97C',
  incomeSoft: '#E3F6EF',
  expense: '#E5484D',
  expenseSoft: '#FCEAEA',
  warning: '#E58E26',
  text: '#1B1D29',
  textSecondary: '#6E7180',
  border: '#E4E6EE',
  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  background: '#0F1017',
  card: '#1A1C26',
  primary: '#7A8AFF',
  primarySoft: '#272C48',
  income: '#37C393',
  incomeSoft: '#16322A',
  expense: '#F16A72',
  expenseSoft: '#3B2327',
  warning: '#F0A44D',
  text: '#F0F1F5',
  textSecondary: '#9A9DAD',
  border: '#2A2D3A',
  white: '#FFFFFF',
};

export const personColors = [
  '#4F63F6',
  '#1FA97C',
  '#E58E26',
  '#C245A8',
  '#2AA4C9',
  '#8557E0',
  '#D14343',
  '#5E8C31',
];

export const spacing = {
  xs: scale(4),
  s: scale(8),
  m: scale(12),
  l: scale(16),
  xl: scale(24),
  xxl: scale(32),
};

export const radius = {
  s: scale(8),
  m: scale(12),
  l: scale(16),
  xl: scale(24),
};

export const font = {
  small: ms(12),
  body: ms(14),
  medium: ms(16),
  large: ms(20),
  xlarge: ms(26),
  huge: ms(34),
};
