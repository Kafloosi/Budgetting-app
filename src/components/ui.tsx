import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import { PeriodType } from '../types';
import { currentPeriodKey, formatPeriod, shiftPeriod } from '../utils/money';

function useStyles(): ReturnType<typeof makeStyles> {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors]);
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
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const activeColor = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
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
 * Previous/next navigation for a month or week period.
 * The next arrow is disabled once the current period is reached,
 * so future periods can never be selected.
 */
export function PeriodNav({
  periodType,
  period,
  onChange,
}: {
  periodType: PeriodType;
  period: string;
  onChange: (period: string) => void;
}) {
  const styles = useStyles();
  const atCurrent = period >= currentPeriodKey(periodType);
  return (
    <View style={styles.periodRow}>
      <Pressable
        style={styles.periodArrow}
        onPress={() => onChange(shiftPeriod(periodType, period, -1))}
      >
        <Text style={styles.periodArrowText}>‹</Text>
      </Pressable>
      <Text style={styles.periodLabel} numberOfLines={1}>
        {formatPeriod(periodType, period)}
      </Text>
      <Pressable
        style={[styles.periodArrow, atCurrent && styles.periodArrowDisabled]}
        disabled={atCurrent}
        onPress={() => onChange(shiftPeriod(periodType, period, 1))}
      >
        <Text
          style={[styles.periodArrowText, atCurrent && styles.periodArrowTextDisabled]}
        >
          ›
        </Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[stylesStatic.row, style]}>{children}</View>;
}

const stylesStatic = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  });
