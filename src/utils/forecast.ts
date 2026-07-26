import { Category, Transaction } from '../types';
import { monthTotals } from './aggregate';
import { EffectiveBudget } from './budgets';
import { categoryById } from '../categories';
import { currentMonthKey, daysInMonth, elapsedDaysInMonth } from './money';

/** Below this many days or with nothing spent, a projection is noise */
const MIN_DAYS_FOR_FORECAST = 3;

export interface Forecast {
  elapsedDays: number;
  daysInMonth: number;
  spentCents: number;
  dailyPaceCents: number;
  /** Spending projected to the end of the month at the current pace */
  projectedCents: number;
  incomeCents: number;
  /** Combined monthly budget limits, when any are set */
  budgetTotalCents: number;
  /** Projected minus income: positive means heading for a shortfall */
  projectedOverspendCents: number;
  /** Safe daily spend for the rest of the month to stay within income */
  safeDailyCents: number;
  /** False early in the month, when extrapolating would mislead */
  hasEnoughData: boolean;
}

/**
 * Premium: extrapolate the current month from the pace so far, so
 * overspending is visible early instead of on the last day. Past months
 * are history, not forecasts — this only ever describes the current month.
 */
export function forecastCurrentMonth(
  transactions: Transaction[],
  budgets: Map<string, EffectiveBudget>,
): Forecast {
  const month = currentMonthKey();
  const total = daysInMonth(month);
  const elapsedDays = elapsedDaysInMonth(month);
  const { incomeCents, expenseCents } = monthTotals(transactions, month);

  const dailyPaceCents = Math.round(expenseCents / elapsedDays);
  const remainingDays = Math.max(1, total - elapsedDays);

  return {
    elapsedDays,
    daysInMonth: total,
    spentCents: expenseCents,
    dailyPaceCents,
    projectedCents: dailyPaceCents * total,
    incomeCents,
    budgetTotalCents: [...budgets.values()].reduce((s, b) => s + b.limitCents, 0),
    projectedOverspendCents: dailyPaceCents * total - incomeCents,
    safeDailyCents: Math.max(0, Math.round((incomeCents - expenseCents) / remainingDays)),
    hasEnoughData: elapsedDays >= MIN_DAYS_FOR_FORECAST && expenseCents > 0,
  };
}

export interface CategoryForecast {
  category: Category;
  spentCents: number;
  limitCents: number;
  projectedCents: number;
  /** Projected spend beyond the limit; 0 when the category stays within it */
  projectedOverCents: number;
}

/**
 * Premium: the same projection applied per budgeted category, so a category
 * heading past its limit shows up mid-month. Only categories with a budget
 * are included; worst offenders first.
 */
export function forecastCategories(
  customCategories: Category[],
  budgets: Map<string, EffectiveBudget>,
): CategoryForecast[] {
  const month = currentMonthKey();
  const total = daysInMonth(month);
  const elapsedDays = elapsedDaysInMonth(month);

  return [...budgets]
    .map(([categoryId, { limitCents, spentCents }]) => {
      const projectedCents = Math.round((spentCents / elapsedDays) * total);
      return {
        category: categoryById(customCategories, categoryId),
        spentCents,
        limitCents,
        projectedCents,
        projectedOverCents: Math.max(0, projectedCents - limitCents),
      };
    })
    // An emptied envelope (limit 0) can't be divided by, and is the worst
    // offender there is once anything at all is projected against it.
    .sort((a, b) => overshoot(b) - overshoot(a));
}

function overshoot({ projectedCents, limitCents }: CategoryForecast): number {
  if (limitCents > 0) return projectedCents / limitCents;
  return projectedCents > 0 ? Number.MAX_SAFE_INTEGER : 0;
}
