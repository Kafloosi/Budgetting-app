import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { useApp, useTheme } from '../context/AppContext';
import {
  darkColors,
  figures,
  font,
  indicium,
  lift,
  motion,
  onColor,
  radius,
  rules,
  scale,
  spacing,
  ThemeColors,
  type as faces,
} from '../theme';
import {
  CURRENCIES,
  currentPeriodKey,
  formatPeriod,
  NavPeriodType,
  shiftPeriod,
} from '../utils/money';

/**
 * Sheets are cached per (factory, theme) at module scope rather than per
 * component instance, so the hundred-odd primitives on a screen share one
 * built sheet instead of each constructing its own copy of the same rules.
 */
const sheetCache = new WeakMap<object, Map<ThemeColors, unknown>>();

/** Build a themed StyleSheet, built once per theme and shared app-wide. */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => {
    let byTheme = sheetCache.get(factory);
    if (!byTheme) {
      byTheme = new Map();
      sheetCache.set(factory, byTheme);
    }
    let sheet = byTheme.get(colors);
    if (!sheet) {
      sheet = factory(colors);
      byTheme.set(colors, sheet);
    }
    return sheet as T;
  }, [colors, factory]);
}

/**
 * Whether the user has asked the system to remove animations. Every authored
 * moment in this app collapses to an instant cut when this is true — motion is
 * the postal handling of a letter, and someone who has switched it off should
 * get the letter without the handling.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * Standard container/content styles shared by every screen. Envelopes are
 * inset from the screen edge and carry their own gaps, so the ground shows
 * around each one and the stack reads as separate pieces of mail.
 */
export const screenChrome = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  content: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    paddingBottom: scale(112),
  } as ViewStyle,
});

function useStyles(): ReturnType<typeof makeStyles> {
  return useThemedStyles(makeStyles);
}

/**
 * An envelope. One envelope holds one thing, it lies on the ground rather
 * than being ruled off from it, and it never nests inside another.
 */
export function Card({
  children,
  style,
  divider = 'structure',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * `structure` is a whole envelope. `hairline` continues the envelope above
   * it — the two are one piece of mail split by a fold, so a long form reads
   * as one document rather than as a stack of containers.
   */
  divider?: 'structure' | 'hairline';
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[
        styles.card,
        divider === 'hairline' ? styles.cardJoined : lift(1, colors),
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.screenTitle}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Section label, set lowercase and flush left above the envelope it names */
export function Label({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.label}>{children}</Text>;
}

/**
 * A figure. Money is always tabular so digits line up down the screen; this is
 * the single most load-bearing type decision in the app.
 */
export function Figure({
  children,
  size = 'body',
  color,
  style,
}: {
  children: React.ReactNode;
  size?: 'body' | 'medium' | 'large' | 'balance';
  color?: string;
  style?: TextStyle;
}) {
  const styles = useStyles();
  return (
    <Text style={[styles.figure, styles[size], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

/**
 * A postal indicium: the small tracked caps a piece of mail is marked with.
 * Rationed deliberately — an eyebrow over every section is grammar nobody
 * chose, so this exists for genuine marks like PAID or a tab label.
 */
export function Indicium({ children, color }: { children: React.ReactNode; color?: string }) {
  const styles = useStyles();
  return <Text style={[styles.indicium, color ? { color } : null]}>{children}</Text>;
}

/**
 * The typewriter register: serials, reference codes, receipt lines. Monospaced,
 * so these columns align structurally rather than by font-feature support.
 */
export function Typed({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
}) {
  const styles = useStyles();
  return <Text style={[styles.typed, color ? { color } : null, style]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  color,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fill = color ?? colors.primary;
  const press = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  const settle = (to: number) => {
    if (reduced) {
      press.setValue(to);
      return;
    }
    Animated.timing(press, {
      toValue: to,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={() => settle(1)}
      onPressOut={() => settle(0)}
    >
      <Animated.View
        style={[
          styles.button,
          lift(2, colors),
          {
            backgroundColor: fill,
            opacity: disabled ? 0.4 : 1,
            // Pressing a stamp down onto paper: it seats, it does not shrink.
            transform: [
              { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] }) },
            ],
          },
          style,
        ]}
      >
        <Text style={[styles.buttonLabel, { color: onColor(fill) }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const activeColor = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : { backgroundColor: colors.card, borderColor: colors.border },
        pressed && !selected ? { backgroundColor: colors.manila } : null,
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? onColor(activeColor) : colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeColor?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fill = activeColor ?? colors.primary;
  return (
    <View style={styles.segmentWrap} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: fill }]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? onColor(fill) : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Previous/next navigation for a month, week, or year period.
 * By default the next arrow disables at the current period, so future
 * periods can't be selected; pass `allowFuture` (with an optional `min`
 * floor) for pickers that point forward, like goal deadlines.
 */
export function PeriodNav({
  periodType,
  period,
  onChange,
  allowFuture = false,
  min,
  prefix,
}: {
  periodType: NavPeriodType;
  period: string;
  onChange: (period: string) => void;
  allowFuture?: boolean;
  min?: string;
  prefix?: string;
}) {
  const styles = useStyles();
  const nextDisabled = !allowFuture && period >= currentPeriodKey(periodType);
  const prevDisabled = min !== undefined && period <= min;
  return (
    <View style={styles.periodRow}>
      <Pressable
        style={[styles.periodArrow, prevDisabled && styles.periodArrowDisabled]}
        disabled={prevDisabled}
        accessibilityRole="button"
        accessibilityLabel="Previous period"
        accessibilityState={{ disabled: prevDisabled }}
        onPress={() => onChange(shiftPeriod(periodType, period, -1))}
      >
        <Text
          style={[styles.periodArrowText, prevDisabled && styles.periodArrowTextDisabled]}
        >
          ‹
        </Text>
      </Pressable>
      <Text style={styles.periodLabel} numberOfLines={1}>
        {prefix ?? ''}
        {formatPeriod(periodType, period)}
      </Text>
      <Pressable
        style={[styles.periodArrow, nextDisabled && styles.periodArrowDisabled]}
        disabled={nextDisabled}
        accessibilityRole="button"
        accessibilityLabel="Next period"
        accessibilityState={{ disabled: nextDisabled }}
        onPress={() => onChange(shiftPeriod(periodType, period, 1))}
      >
        <Text
          style={[styles.periodArrowText, nextDisabled && styles.periodArrowTextDisabled]}
        >
          ›
        </Text>
      </Pressable>
    </View>
  );
}

/** Themed text input; the ruled line a form is filled in on. */
export function Input({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[styles.input, focused ? { borderBottomColor: colors.primary } : null, style as TextStyle]}
      placeholderTextColor={colors.textSecondary}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      {...props}
    />
  );
}

/** Currency selector chips; `limit` shows only the most common ones */
export function CurrencyChips({ limit }: { limit?: number }) {
  const { state, setCurrencyCode } = useApp();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {CURRENCIES.slice(0, limit ?? CURRENCIES.length).map((c) => (
        <Chip
          key={c.code}
          label={`${c.symbol} ${c.code}`}
          selected={state.settings.currencyCode === c.code}
          onPress={() => setCurrencyCode(c.code)}
        />
      ))}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

/**
 * THE SORT — a row arriving into place. Rows enter staggered by their index,
 * capped so a long list never crawls: past the cap everything lands together.
 */
export function SortIn({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const driver = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      driver.setValue(1);
      return;
    }
    const animation = Animated.timing(driver, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index, motion.sortCap) * motion.sort,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [driver, index, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: driver,
          transform: [
            {
              translateY: driver.interpolate({
                inputRange: [0, 1],
                outputRange: [scale(10), 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * THE FRANK — the app's signature moment. A stamp impression lands on a
 * committed entry: down from oversize with a small rotation, one overshoot,
 * then rest. It fires when `trigger` changes to a new truthy value and at no
 * other time, because a stamp that lands on every render is not a stamp.
 */
export function Frank({
  trigger,
  label = 'Recorded',
  color,
}: {
  trigger: number;
  label?: string;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const driver = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    if (reduced) {
      driver.setValue(1);
      const cut = setTimeout(() => setVisible(false), 900);
      return () => clearTimeout(cut);
    }
    driver.setValue(0);
    const run = Animated.sequence([
      Animated.timing(driver, {
        toValue: 1,
        duration: motion.frank,
        easing: Easing.out(Easing.back(2.2)),
        useNativeDriver: true,
      }),
      Animated.delay(620),
      Animated.timing(driver, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    run.start(({ finished }) => {
      if (finished) setVisible(false);
    });
    return () => run.stop();
  }, [trigger, driver, reduced]);

  if (!visible) return null;
  const ink = color ?? colors.expense;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.frank,
        {
          borderColor: ink,
          opacity: driver,
          transform: [
            { rotate: '-8deg' },
            { scale: driver.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] }) },
          ],
        },
      ]}
    >
      <Text style={[styles.frankText, { color: ink }]}>{label}</Text>
    </Animated.View>
  );
}

/** How far a plane travels when the view re-partitions. */
const SLIDE_DISTANCE = scale(28);

/**
 * When the view re-partitions — a different person, a different period — the
 * plane travels into its new position on an exponential ease-out and the edge
 * it came from carries colour for the length of the movement.
 *
 * `index` is the position of whatever is showing, so the plane knows which way
 * to travel; passing the same index twice is a no-op.
 */
export function SlidingPlane({
  index,
  edgeColor,
  children,
  style,
}: {
  index: number;
  edgeColor?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  // One driver runs 1 -> 0: the plane's travel is that value interpolated, and
  // the edge's opacity is the value itself, so both resolve on one curve.
  const progress = useRef<Animated.Value | null>(null);
  if (!progress.current) progress.current = new Animated.Value(0);
  const driver = progress.current;
  const previous = useRef(index);
  const direction = useRef(1);

  useEffect(() => {
    if (previous.current === index) return;
    direction.current = index > previous.current ? 1 : -1;
    previous.current = index;
    if (reduced) {
      driver.setValue(0);
      return;
    }
    driver.setValue(1);
    Animated.timing(driver, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [index, driver, reduced]);

  const travel = useMemo(
    () => ({
      transform: [
        {
          translateX: driver.interpolate({
            inputRange: [0, 1],
            outputRange: [0, direction.current * SLIDE_DISTANCE],
          }),
        },
      ],
    }),
    [driver, index],
  );

  return (
    <View style={[styles.slidingPlane, style]}>
      <Animated.View style={travel}>{children}</Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.movingEdge,
          { backgroundColor: edgeColor ?? colors.primary, opacity: driver },
        ]}
      />
    </View>
  );
}

/**
 * The address block: who it is for on the left, the figure banked right
 * against a drawn line. Postal addressing is why every list of
 * name-and-amount in this app reads as one column of digits.
 */
export function LedgerRow({
  label,
  sub,
  value,
  valueColor,
  markerColor,
}: {
  label: string;
  sub?: string;
  value: string;
  valueColor?: string;
  markerColor?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.ledgerRow}>
      {markerColor ? <Dot color={markerColor} /> : null}
      <View style={styles.ledgerLabel}>
        <Text style={styles.ledgerName} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.ledgerSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={styles.ledgerFigure}>
        <Figure color={valueColor}>{value}</Figure>
      </View>
    </View>
  );
}

export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[stylesStatic.row, style]}>{children}</View>;
}

/**
 * Category, person and account colour as the stamp block — a small franked
 * square in the corner of the row, the way a stamp identifies a piece of mail.
 * Never a tinted background and never a pill.
 */
export function Dot({ color }: { color: string }) {
  const styles = useStyles();
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

/**
 * THE WINDOW — a die-cut aperture with the contents showing through it. This
 * is the app's meter: the fill is inside the envelope rather than a bar laid
 * on top of it, which is why the aperture carries an inner edge and the fill
 * has none of its own.
 *
 * The fill is clamped to 2–100% so a barely-started budget still shows a
 * sliver and an overspent one never runs past its aperture. It animates on a
 * transform rather than on width, so the movement stays on the UI thread.
 */
export function Meter({ ratio, color }: { ratio: number; color: string }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const clamped = Math.min(1, Math.max(0.02, ratio));
  const driver = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (reduced) {
      driver.setValue(clamped);
      return;
    }
    const run = Animated.timing(driver, {
      toValue: clamped,
      duration: motion.fill,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [clamped, driver, reduced]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, transform: [{ scaleX: driver }] },
        ]}
      />
    </View>
  );
}

/**
 * A labelled {@link Meter}: name on the left, value on the right, window
 * beneath. `below` is the caption slot under the window — a plain string gets
 * the muted caption style, anything richer is rendered as given.
 */
export function MeterRow({
  label,
  dotColor,
  right,
  rightColor,
  ratio,
  barColor,
  below,
}: {
  label: string;
  dotColor?: string;
  right: string;
  rightColor?: string;
  ratio: number;
  barColor: string;
  below?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.meterRow}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ flex: 1, marginRight: spacing.s }}>
          {dotColor ? <Dot color={dotColor} /> : null}
          <Text style={styles.meterName} numberOfLines={1}>
            {label}
          </Text>
        </Row>
        <Text style={[styles.meterValue, rightColor ? { color: rightColor } : null]}>
          {right}
        </Text>
      </Row>
      <Meter ratio={ratio} color={barColor} />
      {typeof below === 'string' ? <Text style={styles.belowText}>{below}</Text> : below}
    </View>
  );
}

/** Full-screen photo viewer for receipts; tap anywhere to close. */
export function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const styles = useStyles();
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.viewer}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close photo"
      >
        <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" />
        <Text style={styles.viewerHint}>Tap to close</Text>
      </Pressable>
    </Modal>
  );
}

/** Rules that read no theme colours, so they are built once for the app. */
const stylesStatic = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // An envelope: lifted off the ground, die-cut at the corner, and carrying
    // its own gap so the ground shows between one piece of mail and the next.
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.m,
      paddingHorizontal: spacing.l,
      paddingVertical: spacing.l,
      marginBottom: spacing.m,
    },
    // A continuation of the envelope above: no gap, no lift of its own, and a
    // fold line where the two meet.
    cardJoined: {
      marginTop: -spacing.m - rules.hairline,
      borderTopWidth: rules.hairline,
      borderTopColor: colors.border,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      paddingVertical: spacing.m,
    },
    screenTitle: {
      paddingTop: spacing.l,
      paddingBottom: spacing.m,
    },
    title: {
      fontSize: font.xlarge,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: font.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    // Lowercase, flush left. No tracked uppercase eyebrows.
    label: {
      fontSize: font.small,
      color: colors.textSecondary,
      fontWeight: '600',
      marginTop: spacing.s,
      marginBottom: spacing.s,
    },
    indicium: {
      ...indicium,
      color: colors.textSecondary,
    },
    typed: {
      fontFamily: faces.typed,
      fontSize: font.small,
      color: colors.textSecondary,
    },
    figure: {
      ...figures,
      color: colors.text,
      fontWeight: '600',
    },
    body: { fontSize: font.body },
    medium: { fontSize: font.medium },
    large: { fontSize: font.large, fontWeight: '700' },
    balance: {
      fontSize: font.huge,
      fontWeight: '700',
      letterSpacing: -1.6,
    },
    // The primary action seats like a stamp pressed onto paper.
    button: {
      borderRadius: radius.m,
      paddingVertical: scale(14),
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: scale(48),
    },
    buttonLabel: {
      fontSize: font.medium,
      fontWeight: '700',
    },
    chip: {
      paddingHorizontal: spacing.m,
      minHeight: scale(38),
      justifyContent: 'center',
      borderRadius: radius.m,
      borderWidth: rules.hairline,
      marginRight: spacing.s,
      marginBottom: spacing.s,
      maxWidth: scale(160),
    },
    chipLabel: {
      fontSize: font.body,
      fontWeight: '600',
    },
    segmentWrap: {
      flexDirection: 'row',
      borderRadius: radius.m,
      backgroundColor: colors.manila,
      padding: scale(3),
      overflow: 'hidden',
    },
    segment: {
      flex: 1,
      paddingVertical: scale(9),
      minHeight: scale(40),
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: radius.s,
    },
    segmentLabel: {
      fontSize: font.body,
      fontWeight: '600',
    },
    // A ruled line to write on, not a boxed field.
    input: {
      borderWidth: 0,
      borderBottomWidth: rules.structure,
      borderBottomColor: colors.border,
      paddingHorizontal: 0,
      paddingVertical: scale(10),
      minHeight: scale(46),
      fontSize: font.medium,
      fontFamily: faces.register,
      color: colors.text,
      backgroundColor: 'transparent',
      ...figures,
    },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.m,
    },
    periodArrow: {
      width: scale(44),
      height: scale(44),
      borderRadius: radius.m,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.manila,
    },
    periodArrowDisabled: {
      opacity: 0.35,
    },
    periodArrowText: {
      fontSize: font.large,
      color: colors.text,
      lineHeight: font.large + 2,
    },
    periodArrowTextDisabled: {
      color: colors.textSecondary,
    },
    periodLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: font.medium,
      fontWeight: '700',
      color: colors.text,
      paddingHorizontal: spacing.s,
    },
    empty: {
      paddingVertical: spacing.xl,
    },
    emptyText: {
      fontSize: font.body,
      color: colors.textSecondary,
      lineHeight: font.body * 1.5,
    },
    // The stamp block: a franked square identifying whose mail this is. The
    // outline is the perforated edge, and it is load-bearing — colours saved
    // before this palette existed can sit almost on top of the ground they are
    // drawn against, and the edge is what keeps the marker findable at all.
    dot: {
      width: scale(12),
      height: scale(12),
      borderRadius: radius.s,
      borderWidth: rules.hairline,
      borderColor: colors.border,
      marginRight: spacing.m,
    },
    // The die-cut aperture. The inner edge is the cut; the fill sits behind it.
    track: {
      height: scale(10),
      backgroundColor: colors.manila,
      borderRadius: radius.s,
      marginTop: spacing.s,
      overflow: 'hidden',
    },
    // Full width and scaled from the left, so the movement runs on a transform
    // rather than on layout.
    fill: {
      height: '100%',
      width: '100%',
      borderRadius: radius.s,
      transformOrigin: 'left',
    },
    meterRow: {
      marginBottom: spacing.l,
    },
    meterName: {
      flex: 1,
      fontSize: font.body,
      fontWeight: '600',
      color: colors.text,
      marginRight: spacing.s,
    },
    meterValue: {
      fontSize: font.body,
      fontWeight: '700',
      color: colors.text,
      ...figures,
    },
    belowText: {
      marginTop: spacing.xs,
      fontSize: font.small,
      color: colors.textSecondary,
    },
    slidingPlane: {
      marginHorizontal: -spacing.l,
      paddingHorizontal: spacing.l,
    },
    movingEdge: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: rules.structure,
    },
    // The address block: label left, figure banked right against a drawn line.
    ledgerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.m,
      borderTopWidth: rules.hairline,
      borderTopColor: colors.border,
    },
    ledgerLabel: {
      flex: 1,
      paddingRight: spacing.m,
    },
    ledgerName: {
      fontSize: font.body,
      fontWeight: '600',
      color: colors.text,
    },
    ledgerSub: {
      marginTop: spacing.xs,
      fontSize: font.small,
      color: colors.textSecondary,
    },
    ledgerFigure: {
      minWidth: scale(96),
      alignItems: 'flex-end',
      paddingLeft: spacing.m,
      borderLeftWidth: rules.hairline,
      borderLeftColor: colors.border,
    },
    // The frank: a struck rectangle, rotated off-square the way a hand stamp
    // lands. Border and text share one ink.
    frank: {
      position: 'absolute',
      alignSelf: 'center',
      top: '42%',
      borderWidth: rules.structure,
      borderRadius: radius.s,
      paddingHorizontal: spacing.l,
      paddingVertical: spacing.s,
      backgroundColor: 'transparent',
    },
    frankText: {
      ...indicium,
      fontSize: font.medium,
      letterSpacing: font.medium * 0.14,
    },
    viewer: {
      flex: 1,
      backgroundColor: '#000000',
      justifyContent: 'center',
    },
    viewerImage: {
      width: '100%',
      height: '85%',
    },
    viewerHint: {
      color: darkColors.textSecondary,
      textAlign: 'center',
      fontSize: font.small,
      paddingBottom: spacing.xl,
    },
  });
