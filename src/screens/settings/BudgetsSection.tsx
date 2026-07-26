import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useApp } from '../../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../../theme';
import { centsToInput, formatMonth, parseAmountToCents } from '../../utils/money';
import { topLevelCategories } from '../../categories';
import { Category } from '../../types';
import { Card, Dot, Input, Label, Row, useThemedStyles } from '../../components/ui';
import { ToggleRow, useSettingsStyles } from './common';

/** One category's monthly limit, committed when the field loses focus. */
function BudgetRow({
  category,
  limitCents,
  onCommit,
}: {
  category: Category;
  limitCents?: number;
  onCommit: (cents: number | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState(centsToInput(limitCents ?? 0));

  const commit = () => {
    if (text.trim() === '') {
      onCommit(null);
      return;
    }
    const cents = parseAmountToCents(text);
    if (cents === null) {
      Alert.alert('Invalid limit', 'Enter an amount like 400 or leave it empty.');
      setText(centsToInput(limitCents ?? 0));
      return;
    }
    onCommit(cents);
  };

  return (
    <Row style={styles.budgetRow}>
      <Dot color={category.color} />
      <Text style={styles.budgetName} numberOfLines={1}>
        {category.name}
      </Text>
      <Input
        style={styles.budgetInput}
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        placeholder="no limit"
        keyboardType="decimal-pad"
        returnKeyType="done"
      />
    </Row>
  );
}

/** Per-category monthly limits and the carry-over switch. */
export function BudgetsSection() {
  const { state, setBudget, setBudgetRollover } = useApp();
  const shared = useSettingsStyles();
  const topCategories = useMemo(
    () => topLevelCategories(state.customCategories),
    [state.customCategories],
  );
  const rolloverFrom = state.settings.budgetRolloverFrom;

  return (
    <>
      <Label>Monthly budgets</Label>
      <Card>
        <Text style={[shared.mutedSmall, { marginBottom: spacing.m }]}>
          Set a monthly spending limit per category. Subcategory spending counts
          towards its parent. Progress shows on the Home tab.
        </Text>
        {topCategories.map((c) => (
          <BudgetRow
            key={c.id}
            category={c}
            limitCents={state.budgets[c.id]}
            onCommit={(cents) => setBudget(c.id, cents)}
          />
        ))}
        <ToggleRow
          divider
          title="Carry over what's left"
          description={
            rolloverFrom
              ? `Unspent budget moves to the next month, and overspending comes off it. Counting since ${formatMonth(rolloverFrom)}.`
              : 'Unspent budget moves to the next month, and overspending comes off it. Counts from the month you switch it on.'
          }
          value={!!rolloverFrom}
          onValueChange={setBudgetRollover}
        />
      </Card>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    budgetRow: {
      justifyContent: 'space-between',
      marginBottom: spacing.s,
    },
    budgetName: {
      flex: 1,
      fontSize: font.body,
      color: colors.text,
      fontWeight: '600',
      marginRight: spacing.m,
    },
    budgetInput: {
      width: scale(110),
      borderRadius: radius.s,
      paddingVertical: scale(6),
      paddingHorizontal: spacing.s,
      textAlign: 'right',
    },
  });
