import { Category, NavPeriodType, Transaction } from '../types';
import { allCategories, categoryById, OTHER_CATEGORY_ID } from '../categories';
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
 * Expense totals per category id for one period, with unknown/missing
 * categories folded into "Other" exactly once.
 */
export function expenseCentsByCategory(
  transactions: Transaction[],
  customCategories: Category[],
  periodType: NavPeriodType,
  period: string,
): Map<string, number> {
  const validIds = new Set(allCategories(customCategories).map((c) => c.id));
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== 'expense' || periodOfDate(periodType, t.date) !== period) continue;
    const id = t.categoryId && validIds.has(t.categoryId) ? t.categoryId : OTHER_CATEGORY_ID;
    totals.set(id, (totals.get(id) ?? 0) + t.amountCents);
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
