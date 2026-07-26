import { Transaction } from '../types';
import { monthTotals } from './aggregate';
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
  budgets: Record<string, number>,
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
    budgetTotalCents: Object.values(budgets).reduce((s, v) => s + v, 0),
    projectedOverspendCents: dailyPaceCents * total - incomeCents,
    safeDailyCents: Math.max(0, Math.round((incomeCents - expenseCents) / remainingDays)),
    hasEnoughData: elapsedDays >= MIN_DAYS_FOR_FORECAST && expenseCents > 0,
  };
}
