import {
  Person,
  PersonResult,
  SplitMethod,
  Transaction,
  Transfer,
} from '../types';
import { monthKey } from './money';

/** All shared expenses for the given month */
export function sharedExpensesForMonth(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactions.filter(
    (t) => t.type === 'expense' && t.shared && monthKey(t.date) === month,
  );
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
 * Compute each person's share of the shared expenses for a month.
 *
 * - fifty-fifty:   everyone owes an equal part of the total (50/50 for two)
 * - equal-payments: everyone contributes the same fixed payment (total / n)
 * - percentage:    each person owes their custom percentage of the total
 */
export function computeSettlement(
  people: Person[],
  transactions: Transaction[],
  month: string,
  method: SplitMethod,
  percentages?: Record<string, number>,
): { totalSharedCents: number; results: PersonResult[]; transfers: Transfer[] } {
  const expenses = sharedExpensesForMonth(transactions, month);
  const totalSharedCents = expenses.reduce((sum, t) => sum + t.amountCents, 0);

  const weights =
    method === 'percentage'
      ? people.map((p) => percentages?.[p.id] ?? 0)
      : people.map(() => 1);

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
