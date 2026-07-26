import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, font, radius, scale, spacing } from '../theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.l }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  color = colors.primary,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
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
  color = colors.primary,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: color, borderColor: color }
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
  activeColor = colors.primary,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeColor?: string;
}) {
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
              active && { backgroundColor: activeColor },
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

export function EmptyState({ icon, message }: { icon: string; message: string }) {
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
  return <View style={[styles.row, style]}>{children}</View>;
}

export const textStyles: Record<string, TextStyle> = {
  label: {
    fontSize: font.small,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.s,
  },
};

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
