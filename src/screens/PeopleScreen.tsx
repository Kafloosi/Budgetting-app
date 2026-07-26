import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp, useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors, ThemeMode } from '../theme';
import {
  FREQUENCY_LABEL,
  formatCents,
  parseAmountToCents,
} from '../utils/money';
import {
  Card,
  EmptyState,
  Label,
  PrimaryButton,
  Row,
  ScreenTitle,
  SegmentedControl,
} from '../components/ui';
import { PersonForm, FREQUENCY_OPTIONS } from '../components/PersonForm';
import { IncomeFrequency, Person } from '../types';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

export default function PeopleScreen() {
  const { state, addPerson, updatePerson, removePerson } = useApp();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIncome, setEditIncome] = useState('');
  const [editFrequency, setEditFrequency] = useState<IncomeFrequency>('monthly');

  const startEdit = (person: Person) => {
    setEditingId(person.id);
    setEditIncome(person.incomeCents > 0 ? String(person.incomeCents / 100) : '');
    setEditFrequency(person.incomeFrequency);
  };

  const saveEdit = (person: Person) => {
    let incomeCents = 0;
    if (editIncome.trim() !== '') {
      const parsed = parseAmountToCents(editIncome);
      if (parsed === null) {
        Alert.alert('Invalid income', 'Enter an income like 2500 or leave it empty.');
        return;
      }
      incomeCents = parsed;
    }
    updatePerson(person.id, { incomeCents, incomeFrequency: editFrequency });
    setEditingId(null);
  };

  const confirmRemove = (person: Person) => {
    Alert.alert(
      'Remove person',
      `Remove ${person.name}? Their incomes and expenses will be deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removePerson(person.id) },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={state.people}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <ScreenTitle
              title="People"
              subtitle="Track budgets separately per person, or combined"
            />
            <Card>
              <Label>Add a person</Label>
              <PersonForm
                existingNames={state.people.map((p) => p.name)}
                submitLabel="Add person"
                onSubmit={addPerson}
              />
            </Card>
          </>
        }
        renderItem={({ item }) => {
          const editing = editingId === item.id;
          return (
            <Card>
              <Row>
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{item.name}</Text>
                  <Text style={styles.personIncome}>
                    {item.incomeCents > 0
                      ? `${formatCents(item.incomeCents)} / ${FREQUENCY_LABEL[item.incomeFrequency]}`
                      : 'No income set'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => (editing ? setEditingId(null) : startEdit(item))}
                  hitSlop={8}
                  style={{ marginRight: spacing.l }}
                >
                  <Text style={styles.edit}>{editing ? 'Cancel' : 'Edit'}</Text>
                </Pressable>
                <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </Row>

              {editing ? (
                <View style={styles.editBox}>
                  <Label>Income</Label>
                  <Row style={{ marginBottom: spacing.m }}>
                    <Text style={styles.euro}>€</Text>
                    <TextInput
                      style={styles.input}
                      value={editIncome}
                      onChangeText={setEditIncome}
                      placeholder="0,00"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </Row>
                  <View style={{ marginBottom: spacing.m }}>
                    <SegmentedControl
                      options={FREQUENCY_OPTIONS}
                      value={editFrequency}
                      onChange={setEditFrequency}
                    />
                  </View>
                  <PrimaryButton label="Save" onPress={() => saveEdit(item)} />
                </View>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="👤"
            message="No people yet. Add yourself to get started — add more people to split expenses together."
          />
        }
        ListFooterComponent={
          <Card style={{ marginTop: spacing.m }}>
            <Label>Appearance</Label>
            <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
            <Text style={styles.themeHint}>
              Auto follows your phone's light/dark setting.
            </Text>
          </Card>
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.l, paddingBottom: scale(100) },
    avatar: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.m,
    },
    avatarText: {
      color: colors.white,
      fontSize: font.medium,
      fontWeight: '700',
    },
    personName: {
      fontSize: font.medium,
      fontWeight: '600',
      color: colors.text,
    },
    personIncome: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginTop: 1,
    },
    edit: {
      color: colors.primary,
      fontSize: font.body,
      fontWeight: '600',
    },
    remove: {
      color: colors.expense,
      fontSize: font.body,
      fontWeight: '600',
    },
    editBox: {
      marginTop: spacing.l,
      paddingTop: spacing.l,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    euro: {
      fontSize: font.medium,
      fontWeight: '700',
      color: colors.textSecondary,
      marginRight: spacing.s,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.m,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(10),
      fontSize: font.body,
      color: colors.text,
      backgroundColor: colors.background,
    },
    themeHint: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginTop: spacing.m,
    },
  });
