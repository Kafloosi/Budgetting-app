import {
  PeriodType,
  Person,
  PersonResult,
  SplitMethod,
  Transaction,
  Transfer,
} from '../types';
import { monthlyIncomeCents, periodOfDate } from './money';

/**
 * All shared expenses inside the given month or week, optionally narrowed to
 * one tag. Settling a single tag lets a holiday or a renovation be squared up
 * on its own without touching the rest of the period, which is how a one-off
 * project is normally settled in practice.
 */
export function sharedExpensesForPeriod(
  transactions: Transaction[],
  periodType: PeriodType,
  period: string,
  tag?: string,
): Transaction[] {
  return transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.shared &&
      periodOfDate(periodType, t.date) === period &&
      (!tag || !!t.tags?.includes(tag)),
  );
}

/** Tags carried by the shared expenses of a period, for the scope picker */
export function sharedTagsForPeriod(
  transactions: Transaction[],
  periodType: PeriodType,
  period: string,
): string[] {
  const tags = new Set<string>();
  for (const t of sharedExpensesForPeriod(transactions, periodType, period)) {
    for (const tag of t.tags ?? []) tags.add(tag);
  }
  return [...tags].sort();
}

function paidByPerson(expenses: Transaction[], personId: string): number {
  return expenses
    .filter((t) => t.personId === personId)
    .reduce((sum, t) => sum + t.amountCents, 0);
}

/**
 * Distribute `totalCents` according to `weights` so that the shares are whole
 * cents and add up exactly to the total (largest remainder method).
 */
function distribute(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (totalCents * w) / weightSum);
  const floors = raw.map(Math.floor);
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let i = 0; i < order.length && remainder > 0; i++, remainder--) {
    result[order[i].index] += 1;
  }
  return result;
}

/**
 * Compute each person's share of the shared expenses for a period.
 *
 * - fifty-fifty:    everyone owes an equal part of the total (50/50 for two)
 * - equal-payments: based on income — each person pays in proportion to their
 *                   (monthly-normalized) income, so the burden is equal.
 *                   Falls back to an even split when no incomes are set.
 * - percentage:     each person owes their custom percentage of the total
 */
export function computeSettlement(
  people: Person[],
  transactions: Transaction[],
  periodType: PeriodType,
  period: string,
  method: SplitMethod,
  percentages?: Record<string, number>,
  /** Settle only the expenses carrying this tag, rather than the whole period */
  tag?: string,
): { totalSharedCents: number; results: PersonResult[]; transfers: Transfer[] } {
  const expenses = sharedExpensesForPeriod(transactions, periodType, period, tag);
  const totalSharedCents = expenses.reduce((sum, t) => sum + t.amountCents, 0);

  let weights: number[];
  if (method === 'percentage') {
    weights = people.map((p) => percentages?.[p.id] ?? 0);
  } else if (method === 'equal-payments') {
    const incomes = people.map((p) =>
      monthlyIncomeCents(p.incomeCents, p.incomeFrequency),
    );
    weights = incomes.some((x) => x > 0) ? incomes : people.map(() => 1);
  } else {
    weights = people.map(() => 1);
  }

  const shares = distribute(totalSharedCents, weights);

  const results: PersonResult[] = people.map((person, i) => {
    const paidCents = paidByPerson(expenses, person.id);
    return {
      personId: person.id,
      personName: person.name,
      paidCents,
      shareCents: shares[i],
      netCents: paidCents - shares[i],
      percentage: method === 'percentage' ? weights[i] : undefined,
    };
  });

  return { totalSharedCents, results, transfers: computeTransfers(results) };
}

/** Minimal set of payments so that everyone ends up even. */
export function computeTransfers(results: PersonResult[]): Transfer[] {
  const debtors = results
    .filter((r) => r.netCents < 0)
    .map((r) => ({ name: r.personName, amount: -r.netCents }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = results
    .filter((r) => r.netCents > 0)
    .map((r) => ({ name: r.personName, amount: r.netCents }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].amount, creditors[ci].amount);
    if (amount > 0) {
      transfers.push({
        fromName: debtors[di].name,
        toName: creditors[ci].name,
        amountCents: amount,
      });
    }
    debtors[di].amount -= amount;
    creditors[ci].amount -= amount;
    if (debtors[di].amount === 0) di++;
    if (creditors[ci].amount === 0) ci++;
  }
  return transfers;
}
