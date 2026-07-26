import { AppSettings, AppState } from '../types';
import { expenseCentsByCategoryPerPeriod } from './aggregate';
import { monthsBetween, shiftMonth } from './money';

/**
 * Budgets, with optional carry-over between months.
 *
 * Without rollover a budget is a fresh allowance every month. With it, what
 * you didn't spend is added to next month and what you overspent is taken
 * off it, which is how envelope budgeting stays honest: an expensive month
 * has to be paid back rather than forgotten on the 1st.
 *
 * Two deliberate bounds. Carry only accumulates from the month the user
 * switched rollover on (`budgetRolloverFrom`), so enabling it never
 * back-dates a windfall from months they never budgeted. And it looks back
 * at most a year, so one bad month a long time ago cannot haunt a budget
 * forever.
 */
export const ROLLOVER_LOOKBACK_MONTHS = 12;

export interface EffectiveBudget {
  /** The limit as configured in Settings */
  baseCents: number;
  /** Carried in from previous months: positive saved, negative overspent */
  carryCents: number;
  /** What is actually available this month, never below zero */
  limitCents: number;
  spentCents: number;
}

/**
 * Only what the calculation reads. Narrower than AppState on purpose: it
 * lets callers memoize on these four inputs instead of the whole state,
 * which otherwise re-scans a year of history on every unrelated change.
 */
type BudgetInput = Pick<AppState, 'transactions' | 'customCategories' | 'budgets'> & {
  settings: Pick<AppSettings, 'budgetRolloverFrom'>;
};

/** Months whose spending affects `month`, oldest first, `month` included */
function rolloverWindow(month: string, from: string | undefined): string[] {
  if (!from || from > month) return [month];
  const span = Math.min(monthsBetween(from, month), ROLLOVER_LOOKBACK_MONTHS);
  return Array.from({ length: span + 1 }, (_, i) => shiftMonth(month, i - span));
}

/**
 * Every budgeted category's state for one month. Returned as a map so the
 * meters, the alerts, and the forecast all read the same numbers — a budget
 * shown as €450 on Home must be the same €450 that triggers a notification.
 */
export function effectiveBudgets(
  { transactions, customCategories, budgets, settings }: BudgetInput,
  month: string,
): Map<string, EffectiveBudget> {
  const result = new Map<string, EffectiveBudget>();
  const ids = Object.keys(budgets);
  if (ids.length === 0) return result;

  const months = rolloverWindow(month, settings.budgetRolloverFrom);
  const spend = expenseCentsByCategoryPerPeriod(
    transactions,
    customCategories,
    'month',
    months,
  );
  const past = months.slice(0, -1);

  for (const id of ids) {
    // Only today's limit is stored, so past months are measured against it
    const baseCents = budgets[id];
    const carryCents = past.reduce(
      (carry, m) => carry + baseCents - (spend.get(m)?.get(id) ?? 0),
      0,
    );
    result.set(id, {
      baseCents,
      carryCents,
      limitCents: Math.max(0, baseCents + carryCents),
      spentCents: spend.get(month)?.get(id) ?? 0,
    });
  }
  return result;
}
