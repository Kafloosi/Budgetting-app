import React, { useMemo } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useApp, useTheme } from '../context/AppContext';
import { darkColors, font, radius, scale, spacing, ThemeColors } from '../theme';
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

/** Standard container/content styles shared by every screen */
export const screenChrome = (colors: ThemeColors) => ({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  content: { padding: spacing.l, paddingBottom: scale(100) } as ViewStyle,
});

function useStyles(): ReturnType<typeof makeStyles> {
  return useThemedStyles(makeStyles);
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useStyles();
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Small uppercase section label */
export function Label({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.label}>{children}</Text>;
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: color ?? colors.primary,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
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
      style={[
        styles.chip,
        selected
          ? { backgroundColor: activeColor, borderColor: activeColor }
          : { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: selected ? colors.white : colors.text },
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
  return (
    <View style={styles.segmentWrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              active && { backgroundColor: activeColor ?? colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? colors.white : colors.textSecondary },
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

/** Themed bordered text input used across all forms */
export function Input({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TextInput
      style={[styles.input, style as TextStyle]}
      placeholderTextColor={colors.textSecondary}
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
 * Small colour swatch marking a person, account, or category. Its geometry is
 * theme-independent, so it stays hookless — these appear once per list row.
 */
export function Dot({ color }: { color: string }) {
  return <View style={[stylesStatic.dot, { backgroundColor: color }]} />;
}

/**
 * Horizontal progress bar. The fill is clamped to 2–100% so a barely-started
 * meter still shows a sliver and an overspent one never runs past its track.
 */
export function Meter({ ratio, color }: { ratio: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.track}>
      <View
        style={[
          stylesStatic.fill,
          { backgroundColor: color, width: `${Math.min(100, Math.max(2, ratio * 100))}%` },
        ]}
      />
    </View>
  );
}

/**
 * A labelled {@link Meter}: name on the left, value on the right, bar beneath.
 * `below` is the caption slot under the bar — a plain string gets the muted
 * caption style, anything richer (a link, mixed colours) is rendered as given.
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
    <View style={stylesStatic.meterRow}>
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
      <Pressable style={styles.viewer} onPress={onClose}>
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
  dot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginRight: spacing.s,
  },
  fill: {
    height: '100%',
    borderRadius: scale(4),
  },
  meterRow: {
    marginBottom: spacing.m,
  },
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.l,
      padding: spacing.l,
      marginBottom: spacing.m,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    title: {
      fontSize: font.xlarge,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: font.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    label: {
      fontSize: font.small,
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.s,
    },
    button: {
      borderRadius: radius.m,
      paddingVertical: scale(14),
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonLabel: {
      color: colors.white,
      fontSize: font.medium,
      fontWeight: '700',
    },
    chip: {
      paddingHorizontal: spacing.l,
      paddingVertical: scale(8),
      borderRadius: radius.xl,
      borderWidth: 1,
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
      backgroundColor: colors.background,
      borderRadius: radius.m,
      padding: scale(3),
    },
    segment: {
      flex: 1,
      paddingVertical: scale(9),
      borderRadius: radius.s,
      alignItems: 'center',
    },
    segmentLabel: {
      fontSize: font.body,
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.m,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(10),
      fontSize: font.body,
      color: colors.text,
      backgroundColor: colors.background,
    },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.l,
    },
    periodArrow: {
      width: scale(40),
      height: scale(40),
      borderRadius: radius.m,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
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
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyIcon: {
      fontSize: font.huge,
      marginBottom: spacing.m,
    },
    emptyText: {
      fontSize: font.body,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    track: {
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: colors.background,
      marginTop: spacing.xs,
      overflow: 'hidden',
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
    },
    belowText: {
      marginTop: 2,
      fontSize: font.small,
      color: colors.textSecondary,
      fontWeight: '600',
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
