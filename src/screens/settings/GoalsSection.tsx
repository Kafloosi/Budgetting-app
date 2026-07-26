import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useApp, usePremium } from '../../context/AppContext';
import { spacing } from '../../theme';
import {
  currentMonthKey,
  formatCents,
  formatMonth,
  parseAmountToCents,
  shiftMonth,
} from '../../utils/money';
import { goalProgress } from '../../utils/goals';
import { Card, Input, Label, PeriodNav, PrimaryButton, Row } from '../../components/ui';
import { useSettingsStyles } from './common';

/** Savings goals, with an optional target month and Pro auto-contributions. */
export function GoalsSection() {
  const { state, addGoal, removeGoal } = useApp();
  const premium = usePremium('goalAutos');
  const styles = useSettingsStyles();

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState<string | undefined>();
  const [goalAuto, setGoalAuto] = useState('');

  const submitGoal = () => {
    const name = goalName.trim();
    const targetCents = parseAmountToCents(goalTarget);
    if (!name || !targetCents) {
      Alert.alert('Missing details', 'Enter a goal name and a target amount like 3000.');
      return;
    }
    let monthlyAutoCents: number | undefined;
    if (premium && goalAuto.trim() !== '') {
      const parsed = parseAmountToCents(goalAuto);
      if (parsed === null) {
        Alert.alert(
          'Invalid amount',
          'Enter a monthly auto-save amount like 100, or leave it empty.',
        );
        return;
      }
      monthlyAutoCents = parsed;
    }
    addGoal({ name, targetCents, deadline: goalDeadline, monthlyAutoCents });
    setGoalName('');
    setGoalTarget('');
    setGoalDeadline(undefined);
    setGoalAuto('');
  };

  return (
    <>
      <Label>Savings goals</Label>
      <Card>
        {state.goals.map((goal) => (
          <Row key={goal.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {goal.name}
              </Text>
              <Text style={styles.mutedSmall}>
                {goalProgress(goal).done ? 'Reached · ' : ''}
                {formatCents(goal.savedCents)} of {formatCents(goal.targetCents)}
                {goal.deadline ? ` · by ${formatMonth(goal.deadline)}` : ''}
                {goal.monthlyAutoCents
                  ? ` · auto ${formatCents(goal.monthlyAutoCents)}/month`
                  : ''}
              </Text>
            </View>
            <Pressable onPress={() => removeGoal(goal.id)} hitSlop={8}>
              <Text style={styles.danger}>Remove</Text>
            </Pressable>
          </Row>
        ))}
        <Input
          style={{ marginBottom: spacing.s }}
          value={goalName}
          onChangeText={setGoalName}
          placeholder="Goal name, e.g. Vacation"
        />
        <Input
          style={{ marginBottom: spacing.s }}
          value={goalTarget}
          onChangeText={setGoalTarget}
          placeholder="Target amount, e.g. 3000"
          keyboardType="decimal-pad"
        />
        {goalDeadline ? (
          <View style={{ marginBottom: spacing.s }}>
            <PeriodNav
              periodType="month"
              period={goalDeadline}
              onChange={setGoalDeadline}
              allowFuture
              min={shiftMonth(currentMonthKey(), 1)}
              prefix="by "
            />
            <Pressable onPress={() => setGoalDeadline(undefined)} hitSlop={8}>
              <Text style={[styles.danger, { marginBottom: spacing.m }]}>
                Clear target month
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setGoalDeadline(shiftMonth(currentMonthKey(), 6))}
            style={{ marginBottom: spacing.m }}
          >
            <Text style={styles.link}>+ Set a target month (optional)</Text>
          </Pressable>
        )}
        {premium ? (
          <Input
            style={{ marginBottom: spacing.m }}
            value={goalAuto}
            onChangeText={setGoalAuto}
            placeholder="Auto-save per month, e.g. 100 (optional)"
            keyboardType="decimal-pad"
          />
        ) : (
          <Text style={[styles.mutedSmall, { marginBottom: spacing.m }]}>
            Automatic monthly contributions are part of Budget Pro.
          </Text>
        )}
        <PrimaryButton label="Add goal" onPress={submitGoal} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          Track progress and add money on the Home tab.
        </Text>
      </Card>
    </>
  );
}
