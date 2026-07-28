import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/AppContext';
import { font, spacing, ThemeColors } from '../../theme';
import { Dot, Row, useThemedStyles } from '../../components/ui';

/**
 * Styles shared by more than one settings section. Section-specific styles
 * stay in the section that uses them.
 */
export const makeSettingsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    mutedSmall: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginTop: 1,
    },
    mutedBody: {
      fontSize: font.body,
      color: colors.textSecondary,
    },
    link: {
      color: colors.primary,
      fontSize: font.body,
      fontWeight: '600',
    },
    danger: {
      color: colors.expense,
      fontSize: font.body,
      fontWeight: '600',
    },
    listRow: {
      paddingVertical: spacing.s,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: spacing.s,
    },
    rowTitle: {
      fontSize: font.body,
      fontWeight: '600',
      color: colors.text,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.s,
    },
    rowBody: {
      flex: 1,
      paddingRight: spacing.m,
    },
    rowAction: {
      marginRight: spacing.l,
    },
    settingDivider: {
      marginTop: spacing.l,
      paddingTop: spacing.l,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });

export function useSettingsStyles() {
  return useThemedStyles(makeSettingsStyles);
}

/**
 * The settings list row: an optional colour marker, a title with a muted
 * second line, and one or two trailing actions. Open-coded in eight places
 * before this, so any change to hit area, truncation or press feedback meant
 * finding all eight.
 */
export function SettingRow({
  title,
  sub,
  markerColor,
  onEdit,
  editLabel = 'Edit',
  onRemove,
  removeLabel = 'Remove',
  trailing,
  flush,
  titleLines = 1,
}: {
  title: string;
  sub?: string;
  markerColor?: string;
  onEdit?: () => void;
  editLabel?: string;
  onRemove?: () => void;
  removeLabel?: string;
  /**
   * Lines the title may use before it truncates. One keeps a list of rows
   * even; names the user chose themselves — accounts, categories, tags —
   * take two, because truncating those is what makes two of them
   * indistinguishable.
   */
  titleLines?: number;
  /** Rendered instead of the actions, for rows that need something else */
  trailing?: React.ReactNode;
  /**
   * Drop the row's own divider and padding, for a row already inside a
   * container that draws them — an expandable row with an editor beneath it.
   */
  flush?: boolean;
}) {
  const styles = useSettingsStyles();
  return (
    <Row style={flush ? undefined : styles.listRow}>
      {markerColor ? <Dot color={markerColor} /> : null}
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={titleLines}>
          {title}
        </Text>
        {sub ? <Text style={styles.mutedSmall}>{sub}</Text> : null}
      </View>
      {trailing}
      {onEdit ? (
        // The gap belongs between two actions, not after the last one — a
        // lone Edit sits flush against the card edge like a lone Remove.
        <Pressable onPress={onEdit} hitSlop={8} style={onRemove ? styles.rowAction : undefined}>
          <Text style={styles.link}>{editLabel}</Text>
        </Pressable>
      ) : null}
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={styles.danger}>{removeLabel}</Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/**
 * A labelled switch: title, explanation, and the toggle itself. `divider`
 * draws the rule that separates stacked toggles within one card.
 */
export function ToggleRow({
  title,
  description,
  value,
  onValueChange,
  divider,
  style,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  divider?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const styles = useSettingsStyles();
  return (
    <Row style={[divider && styles.settingDivider, style]}>
      <View style={{ flex: 1, paddingRight: spacing.m }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.mutedSmall}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.white}
      />
    </Row>
  );
}
