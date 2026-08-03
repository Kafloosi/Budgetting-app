import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { useApp } from '../../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../../theme';
import { centsToInput, formatMonth, parseAmountToCents } from '../../utils/money';
import { topLevelCategories } from '../../categories';
import { EVERYONE } from '../../utils/aggregate';
import { Category } from '../../types';
import {
  Card,
  Dot,
  Input,
  Label,
  Row,
  SegmentedControl,
  useThemedStyles,
} from '../../components/ui';
import { ToggleRow, useSettingsStyles } from './common';

/** One category's monthly limit, committed when the field loses focus. */
function BudgetRow({
  category,
  limitCents,
  placeholder,
  onCommit,
}: {
  category: Category;
  limitCents?: number;
  /** Shown when this scope has no limit of its own — the value it inherits */
  placeholder?: string;
  onCommit: (cents: number | null) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState(limitCents ? centsToInput(limitCents) : '');

  const commit = () => {
    if (text.trim() === '') {
      onCommit(null);
      return;
    }
    const cents = parseAmountToCents(text);
    if (cents === null) {
      Alert.alert('Invalid limit', 'Enter an amount like 400 or leave it empty.');
      setText(limitCents ? centsToInput(limitCents) : '');
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
        placeholder={placeholder ?? 'no limit'}
        keyboardType="decimal-pad"
        returnKeyType="done"
      />
    </Row>
  );
}

/** Per-category monthly limits and the carry-over switch. */
export function BudgetsSection() {
  const { state, setBudget, setPersonBudget, setBudgetRollover } = useApp();
  const shared = useSettingsStyles();
  const topCategories = useMemo(
    () => topLevelCategories(state.customCategories),
    [state.customCategories],
  );
  const rolloverFrom = state.settings.budgetRolloverFrom;

  // Whose limits are being edited. The household column is the default and
  // the fallback: a person only overrides the categories they set.
  const [scope, setScope] = useState<string>(EVERYONE);
  const editingPerson = scope !== EVERYONE;
  const own = state.personBudgets[scope] ?? {};

  return (
    <>
      <Label>Monthly budgets</Label>
      <Card>
        <Text style={[shared.mutedSmall, { marginBottom: spacing.m }]}>
          Set a monthly spending limit per category. Subcategory spending counts
          towards its parent. Progress shows on the Home tab.
        </Text>
        {state.people.length > 1 ? (
          <View style={{ marginBottom: spacing.m }}>
            <SegmentedControl
              options={[
                { value: EVERYONE, label: 'Everyone' },
                ...state.people.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={scope}
              onChange={setScope}
            />
          </View>
        ) : null}
        {topCategories.map((c) => (
          <BudgetRow
            key={`${scope}:${c.id}`}
            category={c}
            limitCents={editingPerson ? own[c.id] : state.budgets[c.id]}
            placeholder={
              editingPerson && state.budgets[c.id]
                ? centsToInput(state.budgets[c.id])
                : undefined
            }
            onCommit={(cents) =>
              editingPerson ? setPersonBudget(scope, c.id, cents) : setBudget(c.id, cents)
            }
          />
        ))}
        {editingPerson ? (
          <Text style={[shared.mutedSmall, { marginTop: spacing.s }]}>
            A limit here replaces the shared one for this person, and only
            their own spending counts against it. Leave a category empty to
            keep using the household limit.
          </Text>
        ) : null}
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
