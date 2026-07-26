import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp, useCategories, usePeopleById, useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors, ThemeMode } from '../theme';
import {
  centsToInput,
  currentMonthKey,
  FREQUENCY_LABEL,
  formatCents,
  formatDate,
  formatMonth,
  parseAmountToCents,
  shiftMonth,
} from '../utils/money';
import { ensureNotificationPermission } from '../utils/alerts';
import { goalProgress } from '../utils/goals';
import { DEFAULT_CATEGORIES } from '../categories';
import {
  Card,
  CurrencyChips,
  EmptyState,
  Input,
  Label,
  PeriodNav,
  PrimaryButton,
  Row,
  screenChrome,
  ScreenTitle,
  SegmentedControl,
  useThemedStyles,
} from '../components/ui';
import { PersonForm } from '../components/PersonForm';
import {
  backupFilename,
  csvFilename,
  parseBackup,
  serializeBackup,
  transactionsToCsv,
} from '../storage';
import { Category, Person, RecurringRule } from '../types';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

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
      <Text style={styles.budgetName} numberOfLines={1}>
        {category.emoji} {category.name}
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

export default function SettingsScreen() {
  const {
    state,
    addPerson,
    updatePerson,
    removePerson,
    removeRecurring,
    addCategory,
    removeCategory,
    setBudget,
    setAppLock,
    setBudgetAlerts,
    addGoal,
    removeGoal,
    replaceState,
  } = useApp();
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { all: categories } = useCategories();
  const personById = usePeopleById();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState<string | undefined>();

  const submitGoal = () => {
    const name = goalName.trim();
    const targetCents = parseAmountToCents(goalTarget);
    if (!name || !targetCents) {
      Alert.alert('Missing details', 'Enter a goal name and a target amount like 3000.');
      return;
    }
    addGoal({ name, targetCents, deadline: goalDeadline });
    setGoalName('');
    setGoalTarget('');
    setGoalDeadline(undefined);
  };

  const toggleBudgetAlerts = async (enabled: boolean) => {
    if (!enabled) {
      setBudgetAlerts(false);
      return;
    }
    if (await ensureNotificationPermission()) {
      setBudgetAlerts(true);
    } else {
      Alert.alert(
        'Notifications blocked',
        'Allow notifications for this app in your phone settings to get budget alerts.',
      );
    }
  };

  const confirmRemovePerson = (person: Person) => {
    Alert.alert(
      'Remove person',
      `Remove ${person.name}? Their incomes and expenses will be deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removePerson(person.id) },
      ],
    );
  };

  const confirmRemoveRecurring = (rule: RecurringRule) => {
    Alert.alert(
      'Stop repeating',
      `Stop "${rule.note || 'this entry'}" from repeating? Entries it already created can be kept or deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep entries', onPress: () => removeRecurring(rule.id, false) },
        {
          text: 'Delete entries too',
          style: 'destructive',
          onPress: () => removeRecurring(rule.id, true),
        },
      ],
    );
  };

  const submitCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already exists', `A category called "${name}" already exists.`);
      return;
    }
    addCategory(name, newCatEmoji);
    setNewCatName('');
    setNewCatEmoji('');
  };

  const toggleAppLock = async (enabled: boolean) => {
    if (!enabled) {
      setAppLock(false);
      return;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert(
        'Not available',
        'Set up a fingerprint, face unlock, or screen lock on your phone first.',
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirm to enable app lock',
    });
    if (result.success) setAppLock(true);
  };

  const shareFile = async (filename: string, contents: string, mimeType: string) => {
    try {
      const uri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(uri, contents);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  const importJson = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const next = parseBackup(text);
      if (!next) {
        Alert.alert('Invalid file', 'This does not look like a budget backup.');
        return;
      }
      Alert.alert(
        'Import backup',
        `Replace everything with this backup? It contains ${next.people.length} people and ${next.transactions.length} entries. Your current data will be overwritten.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Import', style: 'destructive', onPress: () => replaceState(next) },
        ],
      );
    } catch (e) {
      Alert.alert('Import failed', String(e));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTitle title="Settings" subtitle="People, budgets, and app options" />

      <Label>People</Label>
      {state.people.length === 0 ? (
        <EmptyState icon="👤" message="No people yet. Add yourself to get started." />
      ) : (
        state.people.map((item) => {
          const editing = editingId === item.id;
          return (
            <Card key={item.id}>
              <Row>
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{item.name}</Text>
                  <Text style={styles.mutedSmall}>
                    {item.incomeCents > 0
                      ? `${formatCents(item.incomeCents)} / ${FREQUENCY_LABEL[item.incomeFrequency]}`
                      : 'No income set'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditingId(editing ? null : item.id)}
                  hitSlop={8}
                  style={{ marginRight: spacing.l }}
                >
                  <Text style={styles.link}>{editing ? 'Cancel' : 'Edit'}</Text>
                </Pressable>
                <Pressable onPress={() => confirmRemovePerson(item)} hitSlop={8}>
                  <Text style={styles.danger}>Remove</Text>
                </Pressable>
              </Row>
              {editing ? (
                <View style={styles.editBox}>
                  <PersonForm
                    existingNames={[]}
                    hideName
                    initial={item}
                    submitLabel="Save"
                    onSubmit={({ incomeCents, incomeFrequency }) => {
                      updatePerson(item.id, { incomeCents, incomeFrequency });
                      setEditingId(null);
                    }}
                  />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
      <Card>
        <Label>Add a person</Label>
        <PersonForm
          existingNames={state.people.map((p) => p.name)}
          submitLabel="Add person"
          onSubmit={addPerson}
        />
      </Card>

      <Label>Recurring entries</Label>
      <Card>
        {state.recurring.length === 0 ? (
          <Text style={styles.mutedBody}>
            Nothing repeats yet. When adding an entry, set “Repeat” to weekly,
            bi-weekly, or monthly — rent, salary, and subscriptions will then be
            added automatically.
          </Text>
        ) : (
          state.recurring.map((rule) => (
            <Row key={rule.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {rule.note || (rule.type === 'income' ? 'Income' : 'Expense')}
                </Text>
                <Text style={styles.mutedSmall}>
                  {rule.type === 'income' ? '+' : '-'}
                  {formatCents(rule.amountCents)} · every{' '}
                  {FREQUENCY_LABEL[rule.frequency]} ·{' '}
                  {personById.get(rule.personId)?.name ?? '?'} · since{' '}
                  {formatDate(rule.anchorDate)}
                </Text>
              </View>
              <Pressable onPress={() => confirmRemoveRecurring(rule)} hitSlop={8}>
                <Text style={styles.danger}>Stop</Text>
              </Pressable>
            </Row>
          ))
        )}
      </Card>

      <Label>Monthly budgets</Label>
      <Card>
        <Text style={[styles.mutedSmall, { marginBottom: spacing.m }]}>
          Set a monthly spending limit per category. Progress shows in the Stats tab.
        </Text>
        {categories.map((c) => (
          <BudgetRow
            key={c.id}
            category={c}
            limitCents={state.budgets[c.id]}
            onCommit={(cents) => setBudget(c.id, cents)}
          />
        ))}
      </Card>

      <Label>Savings goals</Label>
      <Card>
        {state.goals.map((goal) => (
          <Row key={goal.id} style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {goalProgress(goal).done ? '🏆' : '🎯'} {goal.name}
              </Text>
              <Text style={styles.mutedSmall}>
                {formatCents(goal.savedCents)} of {formatCents(goal.targetCents)}
                {goal.deadline ? ` · by ${formatMonth(goal.deadline)}` : ''}
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
        <PrimaryButton label="Add goal" onPress={submitGoal} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          Track progress and add money in the Stats tab.
        </Text>
      </Card>

      <Label>Custom categories</Label>
      <Card>
        {state.customCategories.map((c) => (
          <Row key={c.id} style={styles.listRow}>
            <Text style={[styles.rowTitle, { flex: 1 }]}>
              {c.emoji} {c.name}
            </Text>
            <Pressable onPress={() => removeCategory(c.id)} hitSlop={8}>
              <Text style={styles.danger}>Remove</Text>
            </Pressable>
          </Row>
        ))}
        <Row>
          <Input
            style={styles.emojiInput}
            value={newCatEmoji}
            onChangeText={setNewCatEmoji}
            placeholder="🏷️"
          />
          <Input
            style={styles.catNameInput}
            value={newCatName}
            onChangeText={setNewCatName}
            placeholder="Category name"
            onSubmitEditing={submitCategory}
            returnKeyType="done"
          />
          <PrimaryButton
            label="Add"
            onPress={submitCategory}
            style={{ paddingHorizontal: spacing.l, paddingVertical: scale(11) }}
          />
        </Row>
        <Text style={[styles.mutedSmall, { marginTop: spacing.s }]}>
          The {DEFAULT_CATEGORIES.length} built-in categories are always available.
        </Text>
      </Card>

      <Label>Appearance</Label>
      <Card>
        <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
        <Text style={[styles.mutedSmall, { marginTop: spacing.m }]}>
          Auto follows your phone's light/dark setting.
        </Text>
      </Card>

      <Label>Currency</Label>
      <Card>
        <CurrencyChips />
        <Text style={styles.mutedSmall}>
          Changes the symbol shown everywhere — amounts are not converted.
        </Text>
      </Card>

      <Label>Notifications</Label>
      <Card>
        <Row>
          <View style={{ flex: 1, paddingRight: spacing.m }}>
            <Text style={styles.rowTitle}>Budget alerts</Text>
            <Text style={styles.mutedSmall}>
              Get notified when a category reaches 85% or goes over its monthly budget.
            </Text>
          </View>
          <Switch
            value={state.settings.budgetAlerts}
            onValueChange={toggleBudgetAlerts}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </Row>
      </Card>

      <Label>Security</Label>
      <Card>
        <Row>
          <View style={{ flex: 1, paddingRight: spacing.m }}>
            <Text style={styles.rowTitle}>App lock</Text>
            <Text style={styles.mutedSmall}>
              Require fingerprint / face unlock when opening the app.
            </Text>
          </View>
          <Switch
            value={state.settings.appLock}
            onValueChange={toggleAppLock}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.white}
          />
        </Row>
      </Card>

      <Label>Data</Label>
      <Card>
        <PrimaryButton
          label="Export backup (JSON)"
          onPress={() =>
            shareFile(backupFilename(), serializeBackup(state), 'application/json')
          }
        />
        <PrimaryButton
          label="Export entries (CSV)"
          onPress={() => shareFile(csvFilename(), transactionsToCsv(state), 'text/csv')}
          style={{ marginTop: spacing.m }}
        />
        <PrimaryButton
          label="Import backup"
          onPress={importJson}
          color={colors.expense}
          style={{ marginTop: spacing.m }}
        />
        <Text style={[styles.mutedSmall, { marginTop: spacing.m }]}>
          Everything is stored on this phone only. Export a backup before
          switching phones, and share the JSON with another phone to copy your
          budget there (import replaces that phone's data). Receipt photos are
          not included in backups.
        </Text>
      </Card>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    ...screenChrome(colors),
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
    editBox: {
      marginTop: spacing.l,
      paddingTop: spacing.l,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
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
    emojiInput: {
      width: scale(56),
      marginRight: spacing.s,
    },
    catNameInput: {
      flex: 1,
      marginRight: spacing.s,
    },
  });
