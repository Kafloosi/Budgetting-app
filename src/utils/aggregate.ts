import {
  Account,
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
 * Expense totals per top-level category for one period. Subcategory spending
 * rolls up to its parent, and unknown or missing categories fold into
 * "Other" — so every report groups the same way.
 */
export function expenseCentsByCategory(
  transactions: Transaction[],
  customCategories: Category[],
  periodType: NavPeriodType,
  period: string,
): Map<string, number> {
  const { rootOf } = categoryIndex(customCategories);
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense' || periodOfDate(periodType, t.date) !== period) continue;
    const id = rootOf(t.categoryId);
    totals.set(id, (totals.get(id) ?? 0) + t.amountCents);
  }
  return totals;
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
