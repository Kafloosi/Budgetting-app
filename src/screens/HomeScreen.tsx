/**
 * DIRECTION CONTRACT — see DESIGN.md for the system this implements.
 *
 * THESIS: one set of money, partitioned. Home refuses the finance-app card
 * stack: no floating containers, no rounded corners, no elevation. Planes butt
 * against one another and a drawn rule does the separating.
 *
 * OWN-WORLD: the Rietveld Schröder house. Neutral planes of ground, black
 * structural ink, and red/blue/yellow rationed to edges that carry meaning —
 * blue in, red out, yellow near a limit. Category colour is a 4px edge marker
 * against the rule, never a filled chip.
 *
 * STORY: the user opens Home mid-errand and reads one number — what is left —
 * then the two flows that produced it, then where each budget stands.
 *
 * FIRST VIEWPORT: person selector, then the balance plane: lowercase label
 * flush left, the balance in large tabular figures beneath it, and `in` / `out`
 * as two hairline-ruled rows with the digits aligned to the right edge.
 *
 * FORM: Rietveld Sliding House, pinned by the user over the assigned roll
 * (seed 11689070, which dealt candidate 5 of the grounded list, The Passbook).
 * No staging was committed from the dealt set — composition follows the world's
 * own plane grammar rather than an imported one.
 */
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
import { font, radius, rules, scale, spacing, ThemeColors } from '../theme';
import {
  currentMonthKey,
  formatCents,
  formatDate,
  formatMonth,
  monthKey,
} from '../utils/money';
import { accountBalances, EVERYONE, monthTotals, personScope } from '../utils/aggregate';
import { effectiveBudgets, effectiveTagBudgets } from '../utils/budgets';
import { knownTags } from '../utils/tags';
import { goalProgress } from '../utils/goals';
import { topLevelCategories } from '../categories';
import { NEAR_THRESHOLD } from '../utils/alerts';
import { parseAmountToCents } from '../utils/money';
import {
  Card,
  Chip,
  Dot,
  EmptyState,
  Figure,
  Input,
  Label,
  LedgerRow,
  MeterRow,
  PeriodNav,
  PrimaryButton,
  Row,
  screenChrome,
  SegmentedControl,
  SlidingPlane,
  useThemedStyles,
} from '../components/ui';
import { TransactionForm, TransactionValues } from '../components/TransactionForm';
import { Goal, Transaction } from '../types';



type TypeFilter = 'all' | 'income' | 'expense';
type SearchScope = 'month' | 'all';

/** Newest first. ISO dates compare bytewise, so no locale collation needed. */
const byDateDesc = (a: Transaction, b: Transaction) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

/**
 * A card of budget meters. Category budgets and tag budgets render
 * identically — same fullness colours, same carry-over caption — so they
 * share this rather than keeping two copies that had already drifted.
 */
function BudgetMeterCard({
  label,
  rows,
  colors,
}: {
  label: string;
  rows: {
    key: string;
    label: string;
    dotColor?: string;
    limitCents: number;
    spentCents: number;
    carryCents: number;
  }[];
  colors: ThemeColors;
}) {
  return (
    <Card>
      <Label>{label}</Label>
      {rows.map(({ key, label: name, dotColor, limitCents, spentCents, carryCents }) => {
        const ratio = limitCents > 0 ? spentCents / limitCents : 1;
        const over = spentCents > limitCents;
        return (
          <MeterRow
            key={key}
            label={name}
            dotColor={dotColor}
            right={`${formatCents(spentCents)} / ${formatCents(limitCents)}`}
            rightColor={over ? colors.expense : undefined}
            ratio={ratio}
            barColor={
              over
                ? colors.expense
                : ratio >= NEAR_THRESHOLD
                  ? colors.warning
                  : colors.income
            }
            below={
              carryCents === 0
                ? undefined
                : carryCents > 0
                  ? `+${formatCents(carryCents)} carried over`
                  : `${formatCents(carryCents)} carried over from overspending`
            }
          />
        );
      })}
    </Card>
  );
}

export default function HomeScreen() {
  const { state, removeTransaction, updateTransaction, addToGoal } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { byId: categoryById, rootOf } = useCategories();
  const personById = usePeopleById();
  const [month, setMonth] = useState(currentMonthKey());
  const [selectedPerson, setSelectedPerson] = useState<string>(EVERYONE);
  const [search, setSearch] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [fundingGoal, setFundingGoal] = useState<Goal | null>(null);
  const [fundAmount, setFundAmount] = useState('');

  const multiPerson = state.people.length > 1;
  const activePersonId =
    !multiPerson && state.people.length === 1 ? state.people[0].id : selectedPerson;
  // Combined sits at 0 and each person after it, so switching left or right
  // moves the plane the way the selector did.
  const personIndex =
    activePersonId === EVERYONE
      ? 0
      : state.people.findIndex((p) => p.id === activePersonId) + 1;

  // Unsorted: ISO dates sort bytewise, and only the slices actually shown
  // need ordering — sorting all history on every save would be wasted work.
  const forPerson = useMemo(
    () =>
      state.transactions.filter(
        (t) => activePersonId === EVERYONE || t.personId === activePersonId,
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
    (categoryFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (minCents ? 1 : 0) + (maxCents ? 1 : 0);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (allTimeSearch ? allTimeSorted : monthTransactions).filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter && rootOf(t.categoryId) !== categoryFilter) return false;
      if (tagFilter && !t.tags?.includes(tagFilter)) return false;
      if (minCents && t.amountCents < minCents) return false;
      if (maxCents && t.amountCents > maxCents) return false;
      if (!query) return true;
      return (
        t.note.toLowerCase().includes(query) ||
        categoryById(t.categoryId).name.toLowerCase().includes(query) ||
        (t.tags ?? []).some((tag) => tag.includes(query))
      );
    });
  }, [
    allTimeSearch,
    allTimeSorted,
    monthTransactions,
    search,
    typeFilter,
    categoryFilter,
    tagFilter,
    minCents,
    maxCents,
    rootOf,
    categoryById,
  ]);

  // Suggested from everything, not just this month, so a tag stays reachable
  // after the project it belongs to has moved into the past.
  const tagOptions = useMemo(() => knownTags(state.transactions, 12), [state.transactions]);

  const balances = useMemo(
    () =>
      state.accounts.length === 0
        ? new Map<string, number>()
        : accountBalances(state.accounts, state.transactions, state.accountTransfers),
    [state.accounts, state.transactions, state.accountTransfers],
  );

  // Budgets and goals live here, next to the money they describe. Keyed on
  // the four inputs that actually move a budget — depending on the whole
  // state object would re-scan a year of history on every theme toggle.
  const { customCategories, budgets, personBudgets, tagBudgets } = state;
  const rolloverFrom = state.settings.budgetRolloverFrom;
  const budgetRows = useMemo(
    () =>
      [
        ...effectiveBudgets(
          {
            // `forPerson` is already filtered, so the util is handed the
            // narrowed list rather than filtering full history a second time.
            transactions: forPerson,
            customCategories,
            budgets,
            personBudgets,
            settings: { budgetRolloverFrom: rolloverFrom },
          },
          month,
          // Viewing one person shows their own limits against their own
          // spending; Combined stays the household budget. The list is
          // pre-filtered, so this only selects which limits apply.
          personScope(activePersonId),
          true,
        ),
      ]
        .map(([categoryId, budget]) => ({
          category: categoryById(categoryId),
          ...budget,
          // Fullest first. A zero limit — an envelope emptied by carry-over —
          // can't be divided by, and belongs at the top once anything is
          // spent against it.
          fullness:
            budget.limitCents === 0
              ? budget.spentCents > 0
                ? Number.MAX_SAFE_INTEGER
                : 0
              : budget.spentCents / budget.limitCents,
        }))
        .sort((a, b) => b.fullness - a.fullness),
    [
      forPerson,
      customCategories,
      budgets,
      personBudgets,
      activePersonId,
      rolloverFrom,
      month,
      categoryById,
    ],
  );

  // Tag budgets are a second, independent view of the same spending, so they
  // get their own meters rather than being mixed into the category list.
  const tagBudgetRows = useMemo(
    () =>
      [
        ...effectiveTagBudgets(
          {
            transactions: forPerson,
            tagBudgets,
            settings: { budgetRolloverFrom: rolloverFrom },
          },
          month,
          undefined,
        ),
      ].sort(([a], [b]) => a.localeCompare(b)),
    [forPerson, tagBudgets, rolloverFrom, month],
  );

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
        <View style={styles.txRow}>
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
                  <Dot color={person.color} />
                  <Text style={styles.txMeta}>{person.name} · </Text>
                </>
              ) : null}
              <Text style={styles.txMeta} numberOfLines={1}>
                {formatDate(item.date, allTimeSearch)}
                {!isIncome ? ` · ${category.name}` : ''}
                {item.tags?.length ? ` · ${item.tags.join(' · ')}` : ''}
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
        </View>
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
                  selected={selectedPerson === EVERYONE}
                  onPress={() => setSelectedPerson(EVERYONE)}
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

            <SlidingPlane
              index={personIndex}
              edgeColor={personById.get(activePersonId)?.color}
            >
              <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                {activePersonId === EVERYONE
                  ? 'combined balance'
                  : `${personById.get(activePersonId)?.name ?? ''} balance`}
              </Text>
              <Figure
                size="balance"
                color={netCents >= 0 ? colors.income : colors.expense}
                style={styles.summaryNet}
              >
                {formatCents(netCents)}
              </Figure>
              <LedgerRow
                label="in"
                value={`+${formatCents(incomeCents)}`}
                valueColor={colors.income}
              />
              <LedgerRow
                label="out"
                value={`-${formatCents(expenseCents)}`}
                valueColor={colors.expense}
              />
              </Card>
            </SlidingPlane>

            {state.accounts.length > 0 ? (
              <Card>
                <Label>Accounts</Label>
                {state.accounts.map((a) => {
                  const balance = balances.get(a.id) ?? 0;
                  return (
                    <LedgerRow
                      key={a.id}
                      label={a.name}
                      markerColor={a.color}
                      value={formatCents(balance)}
                      valueColor={balance >= 0 ? colors.text : colors.expense}
                    />
                  );
                })}
              </Card>
            ) : null}

            {tagBudgetRows.length > 0 ? (
              <BudgetMeterCard
                label={`Tag budgets · ${formatMonth(month)}`}
                rows={tagBudgetRows.map(([tag, b]) => ({ key: tag, label: tag, ...b }))}
                colors={colors}
              />
            ) : null}

            {budgetRows.length > 0 ? (
              <BudgetMeterCard
                label={`Budgets · ${formatMonth(month)}`}
                rows={budgetRows.map((r) => ({
                  key: r.category.id,
                  label: r.category.name,
                  dotColor: r.category.color,
                  ...r,
                }))}
                colors={colors}
              />
            ) : null}

            {state.goals.length > 0 ? (
              <Card>
                <Label>Savings goals</Label>
                {state.goals.map((goal) => {
                  const { ratio, done } = goalProgress(goal);
                  return (
                    <MeterRow
                      key={goal.id}
                      label={goal.name}
                      right={`${formatCents(goal.savedCents)} / ${formatCents(goal.targetCents)}`}
                      ratio={ratio}
                      barColor={done ? colors.income : colors.primary}
                      below={
                        done ? undefined : (
                          <Pressable onPress={() => setFundingGoal(goal)} hitSlop={8}>
                            <Text style={styles.fundLink}>Add money</Text>
                          </Pressable>
                        )
                      }
                    />
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
                        setTagFilter(null);
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
                    {tagOptions.length > 0 ? (
                      <>
                        <Label>Tag</Label>
                        <View style={styles.chipsWrap}>
                          <Chip
                            label="Any"
                            selected={tagFilter === null}
                            onPress={() => setTagFilter(null)}
                          />
                          {tagOptions.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              selected={tagFilter === tag}
                              onPress={() => setTagFilter(tag)}
                            />
                          ))}
                        </View>
                      </>
                    ) : null}
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
    // Flush to the plane edge, not centred: the balance is the thesis and the
    // two flows sit beneath it as ledger rows with the digits aligned.
    summaryCard: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.s,
    },
    summaryLabel: {
      fontSize: font.body,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    summaryNet: {
      marginTop: spacing.xs,
      marginBottom: spacing.l,
    },
    filterToggle: { fontSize: font.body, fontWeight: '600', color: colors.primary },
    filterClear: { fontSize: font.body, fontWeight: '600', color: colors.expense },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.s },
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
      backgroundColor: 'transparent',
      borderRadius: radius.s,
      borderBottomWidth: rules.hairline,
      borderColor: colors.border,
      paddingHorizontal: 0,
      paddingVertical: scale(10),
      fontSize: font.body,
      color: colors.text,
      marginBottom: spacing.m,
    },
    // Rows live inside one plane and are divided by hairlines; the plane's own
    // structural rule closes the list, so a row never draws one of its own.
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      marginHorizontal: -spacing.l,
      paddingHorizontal: spacing.l,
      paddingVertical: spacing.m,
      borderBottomWidth: rules.hairline,
      borderBottomColor: colors.border,
    },
    txDot: {
      width: scale(4),
      height: scale(16),
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
