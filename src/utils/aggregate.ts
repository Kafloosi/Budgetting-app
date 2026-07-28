import {
  Account,
  AccountKind,
  AccountTransfer,
  Category,
  NavPeriodType,
  Transaction,
} from '../types';
import { categoryById, categoryIndex } from '../categories';
import { monthKey, periodOfDate } from './money';

export interface PeriodTotals {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
}

/**
 * The single definition of "what did this month add up to". Shared by the
 * home summary, the widget, and anything else showing period totals, so the
 * surfaces can never drift apart.
 */
export function monthTotals(transactions: Transaction[], month: string): PeriodTotals {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of transactions) {
    if (monthKey(t.date) !== month) continue;
    if (t.type === 'income') incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
  }
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}

/**
 * Expense totals per top-level category, for several periods in one pass.
 * Subcategory spending rolls up to its parent, and unknown or missing
 * categories fold into "Other" — so every report groups the same way.
 *
 * Anything needing more than one period (budget carry-over, trends) goes
 * through this rather than calling the single-period version in a loop,
 * which would re-scan the whole history once per period.
 */
export function expenseCentsByCategoryPerPeriod(
  transactions: Transaction[],
  customCategories: Category[],
  periodType: NavPeriodType,
  periods: Iterable<string>,
): Map<string, Map<string, number>> {
  const { rootOf } = categoryIndex(customCategories);
  return expenseCentsByKeyPerPeriod(transactions, periodType, periods, (t) => [
    rootOf(t.categoryId),
  ]);
}

/**
 * Expense totals per period, grouped by whatever keys an entry belongs to.
 *
 * One entry maps to exactly one category but to any number of tags, so the
 * extractor returns a list. Both groupings are the same single pass over
 * history — writing the tag version separately meant "how an entry counts
 * towards a tag" was stated in three places and could drift between the
 * Stats view and the budget meters.
 */
export function expenseCentsByKeyPerPeriod(
  transactions: Transaction[],
  periodType: NavPeriodType,
  periods: Iterable<string>,
  keysOf: (t: Transaction) => string[],
): Map<string, Map<string, number>> {
  const byPeriod = new Map([...periods].map((p) => [p, new Map<string, number>()]));
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const totals = byPeriod.get(periodOfDate(periodType, t.date));
    if (!totals) continue;
    for (const key of keysOf(t)) {
      totals.set(key, (totals.get(key) ?? 0) + t.amountCents);
    }
  }
  return byPeriod;
}

/** The same totals for a single period */
export function expenseCentsByCategory(
  transactions: Transaction[],
  customCategories: Category[],
  periodType: NavPeriodType,
  period: string,
): Map<string, number> {
  return expenseCentsByCategoryPerPeriod(transactions, customCategories, periodType, [
    period,
  ]).get(period)!;
}

/** Income and expense totals per person for one period */
export function totalsByPerson(
  transactions: Transaction[],
  periodType: NavPeriodType,
  period: string,
): Map<string, PeriodTotals> {
  const totals = new Map<string, PeriodTotals>();
  for (const t of transactions) {
    if (periodOfDate(periodType, t.date) !== period) continue;
    const current = totals.get(t.personId) ?? {
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
    };
    if (t.type === 'income') current.incomeCents += t.amountCents;
    else current.expenseCents += t.amountCents;
    current.netCents = current.incomeCents - current.expenseCents;
    totals.set(t.personId, current);
  }
  return totals;
}

/** The same totals resolved to categories and sorted biggest first */
export function rankedCategorySpending(
  transactions: Transaction[],
  customCategories: Category[],
  periodType: NavPeriodType,
  period: string,
): { category: Category; cents: number }[] {
  return [...expenseCentsByCategory(transactions, customCategories, periodType, period)]
    .map(([id, cents]) => ({ category: categoryById(customCategories, id), cents }))
    .sort((a, b) => b.cents - a.cents);
}

/**
 * The selector value meaning "not one person" — the household on a budget
 * screen, Combined on Home. One name, because both screens translate it to
 * `undefined` at the same boundary and had drifted to two different strings.
 */
export const EVERYONE = 'everyone';

/** The person a scope selects, or undefined for {@link EVERYONE}. */
export function personScope(scope: string): string | undefined {
  return scope === EVERYONE ? undefined : scope;
}

/**
 * True for account kinds whose balance is money owed rather than money held.
 * Lives here rather than in types.ts, which is otherwise a pure declaration
 * file every module imports from.
 */
export function isLiability(kind: AccountKind): boolean {
  return kind === 'debt';
}

/**
 * Current balance of every account: its opening amount, plus income landing
 * in it, minus expenses paid from it, adjusted for transfers in and out.
 * Entries without an account simply don't affect any balance.
 */
export function accountBalances(
  accounts: Account[],
  transactions: Transaction[],
  transfers: AccountTransfer[],
): Map<string, number> {
  const balances = new Map(accounts.map((a) => [a.id, a.openingCents]));
  const add = (id: string | undefined, cents: number) => {
    if (!id || !balances.has(id)) return;
    balances.set(id, balances.get(id)! + cents);
  };
  for (const t of transactions) {
    add(t.accountId, t.type === 'income' ? t.amountCents : -t.amountCents);
  }
  for (const t of transfers) {
    add(t.fromAccountId, -t.amountCents);
    add(t.toAccountId, t.amountCents);
  }
  return balances;
}
