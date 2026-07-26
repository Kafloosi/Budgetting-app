import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp, useCategories, usePeopleById, useTheme } from '../context/AppContext';
import { font, radius, scale, spacing, ThemeColors } from '../theme';
import {
  currentMonthKey,
  formatCents,
  formatDate,
  formatMonth,
  monthKey,
} from '../utils/money';
import { accountBalances, monthTotals, expenseCentsByCategory } from '../utils/aggregate';
import { goalProgress } from '../utils/goals';
import { topLevelCategories } from '../categories';
import { NEAR_THRESHOLD } from '../utils/alerts';
import { parseAmountToCents } from '../utils/money';
import {
  Card,
  Chip,
  EmptyState,
  Input,
  Label,
  PeriodNav,
  PrimaryButton,
  Row,
  screenChrome,
  SegmentedControl,
  useThemedStyles,
} from '../components/ui';
import { TransactionForm, TransactionValues } from '../components/TransactionForm';
import { Goal, Transaction } from '../types';

const COMBINED = 'combined';

type TypeFilter = 'all' | 'income' | 'expense';
type SearchScope = 'month' | 'all';

/** Newest first. ISO dates compare bytewise, so no locale collation needed. */
const byDateDesc = (a: Transaction, b: Transaction) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

export default function HomeScreen() {
  const { state, removeTransaction, updateTransaction, addToGoal } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { byId: categoryById, rootOf } = useCategories();
  const personById = usePeopleById();
  const [month, setMonth] = useState(currentMonthKey());
  const [selectedPerson, setSelectedPerson] = useState<string>(COMBINED);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);
  const [fundAmount, setFundAmount] = useState('');

  const multiPerson = state.people.length > 1;
  const activePersonId =
    !multiPerson && state.people.length === 1 ? state.people[0].id : selectedPerson;

  // Unsorted: ISO dates sort bytewise, and only the slices actually shown
  // need ordering — sorting all history on every save would be wasted work.
  const forPerson = useMemo(
    () =>
      state.transactions.filter(
        (t) => activePersonId === COMBINED || t.personId === activePersonId,
      ),
    [state.transactions, activePersonId],
  );

  const monthTransactions = useMemo(
    () => forPerson.filter((t) => monthKey(t.date) === month).sort(byDateDesc),
    [forPerson, month],
  );

  // Totals ignore search/type filters so the summary always shows the month
  const { incomeCents, expenseCents, netCents } = useMemo(
    () => monthTotals(forPerson, month),
    [forPerson, month],
  );

  // Searching all time ignores the month, so an entry from any month is
  // findable without paging back through the month navigator.
  const searching = search.trim() !== '';
  const allTimeSearch = searchScope === 'all';
  const allTimeSorted = useMemo(
    () => (allTimeSearch ? [...forPerson].sort(byDateDesc) : []),
    [allTimeSearch, forPerson],
  );
  const minCents = parseAmountToCents(minAmount);
  const maxCents = parseAmountToCents(maxAmount);
  const extraFilterCount =
    (categoryFilter ? 1 : 0) + (minCents ? 1 : 0) + (maxCents ? 1 : 0);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (allTimeSearch ? allTimeSorted : monthTransactions).filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter && rootOf(t.categoryId) !== categoryFilter) return false;
      if (minCents && t.amountCents < minCents) return false;
      if (maxCents && t.amountCents > maxCents) return false;
      if (!query) return true;
      return (
        t.note.toLowerCase().includes(query) ||
        categoryById(t.categoryId).name.toLowerCase().includes(query)
      );
    });
  }, [
    allTimeSearch,
    allTimeSorted,
    monthTransactions,
    search,
    typeFilter,
    categoryFilter,
    minCents,
    maxCents,
    rootOf,
    categoryById,
  ]);

  const balances = useMemo(
    () =>
      state.accounts.length === 0
        ? new Map<string, number>()
        : accountBalances(state.accounts, state.transactions, state.accountTransfers),
    [state.accounts, state.transactions, state.accountTransfers],
  );

  // Budgets and goals live here, next to the money they describe
  const budgetRows = useMemo(() => {
    if (Object.keys(state.budgets).length === 0) return [];
    const spentByCategory = expenseCentsByCategory(
      state.transactions,
      state.customCategories,
      'month',
      month,
    );
    return Object.entries(state.budgets)
      .map(([categoryId, limitCents]) => ({
        category: categoryById(categoryId),
        limitCents,
        spent: spentByCategory.get(categoryId) ?? 0,
      }))
      .sort((a, b) => b.spent / b.limitCents - a.spent / a.limitCents);
  }, [state.transactions, state.customCategories, state.budgets, month, categoryById]);

  const confirmFund = () => {
    if (!fundingGoal) return;
    const cents = parseAmountToCents(fundAmount);
    if (!cents) {
      Alert.alert('Invalid amount', 'Enter an amount like 50');
      return;
    }
    addToGoal(fundingGoal.id, cents);
    setFundingGoal(null);
    setFundAmount('');
  };

  const confirmDelete = (t: Transaction) => {
    Alert.alert('Delete entry', `Delete "${t.note || 'this entry'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTransaction(t.id) },
    ]);
  };

  const saveEdit = (values: TransactionValues) => {
    if (!editing) return;
    const { repeat: _repeat, ...patch } = values;
    updateTransaction(editing.id, patch);
    setEditing(null);
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const person = personById.get(item.personId);
    const isIncome = item.type === 'income';
    const category = categoryById(isIncome ? undefined : item.categoryId);
    return (
      <Pressable onPress={() => setEditing(item)} onLongPress={() => confirmDelete(item)}>
        <Card style={styles.txCard}>
          <View
            style={[
              styles.txDot,
              { backgroundColor: isIncome ? colors.income : category.color },
            ]}
          />
          <View style={{ flex: 1, marginHorizontal: spacing.m }}>
            <Text style={styles.txNote} numberOfLines={1}>
              {item.note || (isIncome ? 'Income' : category.name)}
            </Text>
            <Row>
              {person && multiPerson ? (
                <>
                  <View style={[styles.dot, { backgroundColor: person.color }]} />
                  <Text style={styles.txMeta}>{person.name} · </Text>
                </>
              ) : null}
              <Text style={styles.txMeta} numberOfLines={1}>
                {formatDate(item.date, allTimeSearch)}
                {!isIncome ? ` · ${category.name}` : ''}
                {item.recurringId ? ' · repeats' : ''}
                {item.photoUri ? ' · receipt' : ''}
                {item.type === 'expense' && multiPerson
                  ? item.shared
                    ? ' · shared'
                    : ' · personal'
                  : ''}
              </Text>
            </Row>
          </View>
          <Text
            style={[
              styles.txAmount,
              { color: isIncome ? colors.income : colors.expense },
            ]}
          >
            {isIncome ? '+' : '-'}
            {formatCents(item.amountCents)}
          </Text>
        </Card>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleTransactions}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <PeriodNav periodType="month" period={month} onChange={setMonth} />

            {multiPerson ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.s }}
              >
                <Chip
                  label="Combined"
                  selected={selectedPerson === COMBINED}
                  onPress={() => setSelectedPerson(COMBINED)}
                />
                {state.people.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={selectedPerson === p.id}
                    onPress={() => setSelectedPerson(p.id)}
                    color={p.color}
                  />
                ))}
              </ScrollView>
            ) : null}

            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {activePersonId === COMBINED
                  ? 'Combined balance'
                  : `${personById.get(activePersonId)?.name ?? ''} balance`}
              </Text>
              <Text
                style={[
                  styles.summaryNet,
                  { color: netCents >= 0 ? colors.income : colors.expense },
                ]}
              >
                {formatCents(netCents)}
              </Text>
              <Row style={{ marginTop: spacing.m }}>
                <View style={styles.summaryHalf}>
                  <Text style={styles.summarySubLabel}>Income</Text>
                  <Text style={[styles.summaryValue, { color: colors.income }]}>
                    +{formatCents(incomeCents)}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryHalf}>
                  <Text style={styles.summarySubLabel}>Expenses</Text>
                  <Text style={[styles.summaryValue, { color: colors.expense }]}>
                    -{formatCents(expenseCents)}
                  </Text>
                </View>
              </Row>
            </Card>

            {state.accounts.length > 0 ? (
              <Card>
                <Label>Accounts</Label>
                {state.accounts.map((a) => {
                  const balance = balances.get(a.id) ?? 0;
                  return (
                    <Row key={a.id} style={styles.accountRow}>
                      <View style={[styles.dot, { backgroundColor: a.color }]} />
                      <Text style={styles.meterName} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text
                        style={[
                          styles.meterValue,
                          { color: balance >= 0 ? colors.text : colors.expense },
                        ]}
                      >
                        {formatCents(balance)}
                      </Text>
                    </Row>
                  );
                })}
              </Card>
            ) : null}

            {budgetRows.length > 0 ? (
              <Card>
                <Label>Budgets · {formatMonth(month)}</Label>
                {budgetRows.map(({ category, limitCents, spent }) => {
                  const ratio = spent / limitCents;
                  const over = ratio > 1;
                  return (
                    <View key={category.id} style={styles.meterRow}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Row style={{ flex: 1, marginRight: spacing.s }}>
                          <View style={[styles.dot, { backgroundColor: category.color }]} />
                          <Text style={styles.meterName} numberOfLines={1}>
                            {category.name}
                          </Text>
                        </Row>
                        <Text
                          style={[styles.meterValue, over ? { color: colors.expense } : null]}
                        >
                          {formatCents(spent)} / {formatCents(limitCents)}
                        </Text>
                      </Row>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              backgroundColor: over
                                ? colors.expense
                                : ratio >= NEAR_THRESHOLD
                                  ? colors.warning
                                  : colors.income,
                              width: `${Math.min(100, Math.max(2, ratio * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {state.goals.length > 0 ? (
              <Card>
                <Label>Savings goals</Label>
                {state.goals.map((goal) => {
                  const { ratio, done } = goalProgress(goal);
                  return (
                    <View key={goal.id} style={styles.meterRow}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={styles.meterName} numberOfLines={1}>
                          {goal.name}
                        </Text>
                        <Text style={styles.meterValue}>
                          {formatCents(goal.savedCents)} / {formatCents(goal.targetCents)}
                        </Text>
                      </Row>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.fill,
                            {
                              backgroundColor: done ? colors.income : colors.primary,
                              width: `${Math.min(100, Math.max(2, ratio * 100))}%`,
                            },
                          ]}
                        />
                      </View>
                      {!done ? (
                        <Pressable onPress={() => setFundingGoal(goal)} hitSlop={8}>
                          <Text style={styles.fundLink}>Add money</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {forPerson.length > 0 ? (
              <>
                <TextInput
                  style={styles.search}
                  value={search}
                  onChangeText={(value) => {
                    setSearch(value);
                    // Scope is only meaningful while searching; clearing the
                    // query returns to the month so it can't apply invisibly.
                    if (!value.trim()) setSearchScope('month');
                  }}
                  placeholder="Search entries"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="search"
                />
                {searching ? (
                  <View style={{ marginBottom: spacing.m }}>
                    <SegmentedControl
                      options={[
                        { value: 'month', label: formatMonth(month) },
                        { value: 'all', label: 'All time' },
                      ]}
                      value={searchScope}
                      onChange={setSearchScope}
                    />
                  </View>
                ) : null}
                <View style={{ marginBottom: spacing.m }}>
                  <SegmentedControl
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'income', label: 'Income' },
                      { value: 'expense', label: 'Expenses' },
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                  />
                </View>

                <Row style={{ justifyContent: 'space-between', marginBottom: spacing.m }}>
                  <Pressable onPress={() => setFiltersOpen((open) => !open)} hitSlop={8}>
                    <Text style={styles.filterToggle}>
                      {filtersOpen ? 'Hide filters' : 'More filters'}
                      {extraFilterCount > 0 ? ` (${extraFilterCount})` : ''}
                    </Text>
                  </Pressable>
                  {extraFilterCount > 0 ? (
                    <Pressable
                      onPress={() => {
                        setCategoryFilter(null);
                        setMinAmount('');
                        setMaxAmount('');
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.filterClear}>Clear</Text>
                    </Pressable>
                  ) : null}
                </Row>

                {filtersOpen ? (
                  <Card>
                    <Label>Category</Label>
                    <View style={styles.chipsWrap}>
                      <Chip
                        label="Any"
                        selected={categoryFilter === null}
                        onPress={() => setCategoryFilter(null)}
                      />
                      {topLevelCategories(state.customCategories).map((c) => (
                        <Chip
                          key={c.id}
                          label={c.name}
                          selected={categoryFilter === c.id}
                          onPress={() => setCategoryFilter(c.id)}
                          color={c.color}
                        />
                      ))}
                    </View>
                    <Label>Amount between</Label>
                    <Row>
                      <Input
                        style={{ flex: 1, marginRight: spacing.s }}
                        value={minAmount}
                        onChangeText={setMinAmount}
                        placeholder="min"
                        keyboardType="decimal-pad"
                      />
                      <Input
                        style={{ flex: 1 }}
                        value={maxAmount}
                        onChangeText={setMaxAmount}
                        placeholder="max"
                        keyboardType="decimal-pad"
                      />
                    </Row>
                  </Card>
                ) : null}
                {allTimeSearch ? (
                  <Text style={styles.resultCount}>
                    {visibleTransactions.length}{' '}
                    {visibleTransactions.length === 1 ? 'match' : 'matches'} across all months
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            message={
              state.people.length === 0
                ? 'Add a person in the Settings tab, then add your first income or expense.'
                : searching || extraFilterCount > 0
                  ? allTimeSearch
                    ? 'Nothing matches these filters in any month.'
                    : 'No matches this month — try “All time” or clear a filter.'
                  : 'No entries this month yet. Tap + to add an income or expense.'
            }
          />
        }
      />

      {fundingGoal ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFundingGoal(null)}>
          <View style={styles.modalBackdrop}>
            <Card style={{ marginBottom: 0 }}>
              <Label>Add to “{fundingGoal.name}”</Label>
              <Input
                value={fundAmount}
                onChangeText={setFundAmount}
                placeholder="0,00"
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus
                onSubmitEditing={confirmFund}
              />
              <Row style={{ marginTop: spacing.m }}>
                <PrimaryButton
                  label="Cancel"
                  onPress={() => setFundingGoal(null)}
                  color={colors.textSecondary}
                  style={{ flex: 1, marginRight: spacing.s }}
                />
                <PrimaryButton label="Add" onPress={confirmFund} style={{ flex: 1 }} />
              </Row>
            </Card>
          </View>
        </Modal>
      ) : null}

      {editing ? (
        <Modal visible animationType="slide" onRequestClose={() => setEditing(null)}>
          <View style={styles.modal}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Row style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit entry</Text>
                <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                  <Text style={styles.modalClose}>Close</Text>
                </Pressable>
              </Row>
              <TransactionForm
                initial={editing}
                showRepeat={false}
                submitLabel="Save changes"
                onSubmit={saveEdit}
              />
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  const target = editing;
                  setEditing(null);
                  confirmDelete(target);
                }}
              >
                <Text style={styles.deleteLabel}>Delete entry</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    ...screenChrome(colors),
    listContent: screenChrome(colors).content,
    summaryCard: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    summaryLabel: {
      fontSize: font.small,
      color: colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    summaryNet: {
      fontSize: font.huge,
      fontWeight: '800',
      marginTop: spacing.s,
    },
    summaryHalf: { flex: 1, alignItems: 'center' },
    summaryDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      alignSelf: 'stretch',
    },
    summarySubLabel: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    summaryValue: {
      fontSize: font.medium,
      fontWeight: '700',
    },
    filterToggle: { fontSize: font.body, fontWeight: '600', color: colors.primary },
    filterClear: { fontSize: font.body, fontWeight: '600', color: colors.expense },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.s },
    accountRow: { marginBottom: spacing.s },
    meterRow: { marginBottom: spacing.m },
    meterName: { flex: 1, fontSize: font.body, fontWeight: '600', color: colors.text },
    meterValue: { fontSize: font.body, fontWeight: '700', color: colors.text },
    track: {
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: colors.background,
      marginTop: spacing.xs,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: scale(4) },
    fundLink: {
      marginTop: spacing.xs,
      fontSize: font.small,
      fontWeight: '700',
      color: colors.primary,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    resultCount: {
      fontSize: font.small,
      color: colors.textSecondary,
      marginBottom: spacing.m,
    },
    search: {
      backgroundColor: colors.card,
      borderRadius: radius.m,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.m,
      paddingVertical: scale(10),
      fontSize: font.body,
      color: colors.text,
      marginBottom: spacing.m,
    },
    txCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.m,
    },
    txDot: {
      width: scale(10),
      height: scale(10),
      borderRadius: scale(5),
    },
    txNote: {
      fontSize: font.body,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    txMeta: {
      fontSize: font.small,
      color: colors.textSecondary,
    },
    dot: {
      width: scale(8),
      height: scale(8),
      borderRadius: scale(4),
      marginRight: spacing.xs,
    },
    txAmount: {
      fontSize: font.body,
      fontWeight: '700',
    },
    modal: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContent: {
      padding: spacing.l,
      paddingTop: spacing.xxl,
      paddingBottom: scale(60),
    },
    modalHeader: {
      justifyContent: 'space-between',
      marginBottom: spacing.l,
    },
    modalTitle: {
      fontSize: font.large,
      fontWeight: '700',
      color: colors.text,
    },
    modalClose: {
      fontSize: font.body,
      fontWeight: '600',
      color: colors.primary,
    },
    deleteButton: {
      marginTop: spacing.m,
      alignItems: 'center',
      paddingVertical: spacing.m,
    },
    deleteLabel: {
      color: colors.expense,
      fontSize: font.body,
      fontWeight: '700',
    },
  });
