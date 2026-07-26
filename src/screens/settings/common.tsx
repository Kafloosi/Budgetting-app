import React from 'react';
import { StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/AppContext';
import { font, spacing, ThemeColors } from '../../theme';
import { Row, useThemedStyles } from '../../components/ui';

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
