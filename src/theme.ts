import { Dimensions, PixelRatio, Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * AIRMAIL — the design system. See DESIGN.md for the world it serves.
 *
 * THESIS: household money is a set of envelopes you fill, spend from, and hand
 * between people. Refuses the fintech dashboard — no rounded card stack on
 * grey, no donut, no pastel category pills.
 * OWN-WORLD: paper ground, near-white envelopes lifted on short warm shadows,
 * manila for recessed planes; airmail red for money out, airmail blue for
 * money in, express orange for a limit in reach. A die-cut window is the
 * meter; the flap diagonal replaces the rounded corner. Archivo for the
 * printed register, Courier Prime for serials and stamps.
 * STORY: the user reads what is left in each envelope, drops an amount into
 * one in seconds, and settles up with a receipt carrying a serial.
 * FIRST VIEWPORT: Home is a foreshortened stack of envelopes, the month's
 * balance franked large across the top one, the edges of the rest showing
 * behind it. Add sits dead-centre in the bar.
 * FORM: the postal envelope system, candidate 4 of the grounded list, staged
 * as the pivot-fan collapsed to a phone stack. Seed key e34639d2.
 */

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
 * `background` is the ground a piece of mail lies on; `card` is the envelope
 * itself, which sits above it on a short shadow. They are deliberately close
 * in value and separated by light rather than by a heavy rule — that lift is
 * the whole difference between this world and the flat one it replaced.
 *
 * `manila` is a recessed plane: the inside of an envelope, a window's unfilled
 * track, a stamp's perforation ground.
 */
export interface ThemeColors {
  background: string;
  card: string;
  /** The envelope body when it must read as official stock rather than wove */
  manila: string;
  primary: string;
  primarySoft: string;
  income: string;
  incomeSoft: string;
  expense: string;
  expenseSoft: string;
  warning: string;
  text: string;
  textSecondary: string;
  /** Hairline rule dividing items inside one envelope */
  border: string;
  /** Structural rule dividing one plane from the next */
  rule: string;
  /** A window's pane, laid over whatever shows through it */
  glassine: string;
  /** Cast by paper onto paper — warm, never neutral grey */
  shadow: string;
  white: string;
}

export const lightColors: ThemeColors = {
  background: '#F2EFE6',
  card: '#FFFDF8',
  manila: '#E8DCC0',
  primary: '#1F4E9C',
  primarySoft: '#E4EAF5',
  income: '#1F4E9C',
  incomeSoft: '#E4EAF5',
  expense: '#D0212B',
  expenseSoft: '#F7E3E4',
  // A meter fill sits inside a manila aperture, so it answers to the track it
  // is read against rather than to the envelope. The brighter express orange
  // this started at was 2.55:1 on manila — invisible in the one place the
  // colour exists to be seen.
  warning: '#CC5A14',
  text: '#1A1A18',
  // Dark enough to clear 4.5:1 on manila as well as on paper and the envelope:
  // inactive segmented-control labels sit on manila, and the lighter grey this
  // started at read at 3.9 there.
  textSecondary: '#5F5C52',
  border: '#D8D2C2',
  rule: '#1A1A18',
  glassine: 'rgba(255,255,255,0.62)',
  shadow: '#4A3F28',
  white: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  background: '#14130F',
  card: '#201E17',
  manila: '#2E2A1C',
  primary: '#6E9BE8',
  primarySoft: '#1C2432',
  income: '#6E9BE8',
  incomeSoft: '#1C2432',
  expense: '#F2564F',
  expenseSoft: '#2E1C1B',
  warning: '#F08A3C',
  text: '#F4F2EA',
  textSecondary: '#9B978A',
  border: '#3A3628',
  rule: '#F4F2EA',
  glassine: 'rgba(255,255,255,0.10)',
  shadow: '#000000',
  white: '#FFFFFF',
};

/**
 * Stamp inks. These print as the marker beside a person, a category or an
 * account, and that marker has to be visible on the light envelope and on the
 * dark one, from a single list — a stamp is not re-inked when the lamp goes
 * off. So every one of them is held to a luminance band that clears 3:1
 * against both grounds; the deeper navy, forest and plum this started with
 * read at 2.1–2.7 on the dark envelope and simply vanished at night.
 *
 * None of them is a pastel, and none is a tint of another.
 */
export const personColors = [
  '#3E6FC4',
  '#D0212B',
  '#E0651A',
  '#459970',
  '#8B5FC4',
  '#2AA0B0',
  '#B08A28',
  '#C4487A',
];

/**
 * Ink or paper, whichever actually reads on a given fill. Stamps and filled
 * buttons take a person or category colour, and hard-coding white on those
 * fails contrast on the lighter ones.
 */
export function onColor(fill: string): string {
  const hex = fill.replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // 0.18 is where contrast against near-black overtakes contrast against white.
  return luminance > 0.18 ? '#1A1A18' : '#FFFFFF';
}

export const spacing = {
  xs: scale(4),
  s: scale(8),
  m: scale(12),
  l: scale(16),
  xl: scale(24),
  xxl: scale(32),
};

/**
 * The die-cut. A real envelope die leaves a small softening at the corner and
 * nothing more, so `m` is the working radius for an envelope and `s` for the
 * small parts cut from it. There is no pill and no 16px card corner in this
 * world; `l` exists only for the one full-bleed sheet that meets the screen
 * edge.
 */
export const radius = {
  s: scale(2),
  m: scale(4),
  l: scale(8),
  xl: scale(8),
};

/**
 * The only two rule weights. `hairline` divides items inside one envelope,
 * `structure` divides one plane from the next. A third weight means the
 * layout was not decided.
 */
export const rules = {
  hairline: StyleSheet.hairlineWidth,
  structure: scale(2),
};

/**
 * Paper lying on paper. Every level carries a real offset and a soft blur —
 * a zero-offset halo is decoration, not depth — and the colour is warm so the
 * lift reads as a shadow in room light rather than as a grey glow.
 *
 * Android draws this from `elevation` and honours `shadowColor` from API 28;
 * iOS takes the explicit offset and radius. Both are given, so neither
 * platform falls back to a default nobody chose.
 */
export function lift(level: 1 | 2 | 3, colors: ThemeColors): ViewStyle {
  const spec = {
    1: { height: 1, radius: 3, opacity: 0.1, elevation: 2 },
    2: { height: 3, radius: 8, opacity: 0.14, elevation: 5 },
    3: { height: 8, radius: 18, opacity: 0.2, elevation: 12 },
  }[level];
  return {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: scale(spec.height) },
    shadowRadius: scale(spec.radius),
    shadowOpacity: spec.opacity,
    ...Platform.select({ android: { elevation: spec.elevation }, default: {} }),
  };
}

/**
 * Money is always set in tabular figures so columns of digits line up down
 * the screen. Spread this into any Text style that renders an amount.
 */
export const figures: Pick<TextStyle, 'fontVariant'> = {
  fontVariant: ['tabular-nums'],
};

/**
 * The two bundled faces. `register` is the printed voice of the system and
 * carries everything; `typed` is the typewriter voice and appears only where
 * the postal world types rather than prints — serials, reference codes, stamp
 * impressions, receipts. Monospaced, so those columns align structurally
 * rather than by OpenType feature support.
 *
 * Weight is chosen by picking the family, not by `fontWeight`: Android
 * synthesises a fake bold from the regular file when a weight is asked for
 * that the loaded family does not carry, which is why every weight is a
 * separate entry here.
 */
export const type = {
  register: 'Archivo_400Regular',
  registerMedium: 'Archivo_500Medium',
  registerSemi: 'Archivo_600SemiBold',
  registerBold: 'Archivo_700Bold',
  typed: 'CourierPrime_400Regular',
  typedBold: 'CourierPrime_700Bold',
} as const;

/** A postal indicium: the few all-caps marks, tracked and never above 11sp. */
export const indicium: TextStyle = {
  fontFamily: type.registerSemi,
  fontSize: ms(10),
  letterSpacing: ms(10) * 0.12,
  textTransform: 'uppercase',
};

export const font = {
  small: ms(12),
  body: ms(14),
  medium: ms(16),
  large: ms(20),
  xlarge: ms(26),
  huge: ms(38),
};

/**
 * Four authored moments, named for what the post office does with a letter.
 * See DESIGN.md; anything not on this list does not animate.
 */
export const motion = {
  /** The stamp landing on a committed entry — the app's signature moment */
  frank: 180,
  /** Per-row stagger as a list is sorted into place */
  sort: 28,
  /** A sheet opening along its flap */
  flap: 220,
  /** A window's contents moving to a new ratio */
  fill: 400,
  /** The longest a list will stagger before the rest arrive together */
  sortCap: 8,
};
